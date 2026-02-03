package handler

import (
	"animaloop/config"
	"animaloop/function"
	"animaloop/utils"
	"context"
	"database/sql"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/signintech/gopdf"
)

type FleaThreadResp struct {
	Kind            string                        `json:"kind"` // "transaction" | "purchase_request"
	Transaction     *utils.FleaTransactionRow     `json:"transaction"`
	PurchaseRequest *utils.FleaPurchaseRequestRow `json:"purchase_request"`
	Role            string                        `json:"role"` // "BUYER" | "SELLER"

	Item    *utils.FleaMarketItemDetailResponse `json:"item"`
	Address *utils.Address                      `json:"address"`
}

// ---------------------------------------------------------
// ハンドラ関数: 取引情報の取得
// GET /flea/transactions/{id}
// ---------------------------------------------------------
func (h *FleaMarketHandler) GetFleaTransaction(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil || strings.TrimSpace(userID) == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	idStr := mux.Vars(r)["id"]
	reqID64, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || reqID64 == 0 {
		http.Error(w, "bad id", http.StatusBadRequest)
		return
	}
	reqID := uint64(reqID64)

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// 1) まず transaction を purchase_request_id で探す（これが重要）
	txRow, err := h.db.GetFleaTransactionByPurchaseRequestID(ctx, userID, reqID)
	if err == nil {
		role := ""
		if txRow.BuyerID == userID {
			role = "BUYER"
		} else if txRow.SellerID == userID {
			role = "SELLER"
		}

		item, err := h.db.GetFleaMarketItemByID(userID, txRow.ItemID)
		if err != nil {
			http.Error(w, "failed to get item detail", http.StatusInternalServerError)
			return
		}

		address, err := h.db.GetAddress(txRow.AddressID, txRow.BuyerID)
		if err != nil {
			http.Error(w, "failed to get address", http.StatusInternalServerError)
			return
		}

		// 見つかった場合は transaction を返す
		resp := FleaThreadResp{
			Kind:            "transaction",
			Transaction:     &txRow,
			PurchaseRequest: nil,
			Role:            role,
			Item:            item,
			Address:         &address,
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
		return
	}
	if !errors.Is(err, sql.ErrNoRows) {
		http.Error(w, "failed", http.StatusInternalServerError)
		return
	}

	// 2) transaction が無いなら purchase_request を返す
	prRow, err := h.db.GetFleaPurchaseRequestByID(ctx, userID, reqID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed", http.StatusInternalServerError)
		return
	}
	role := ""
	if prRow.BuyerID == userID {
		role = "BUYER"
	} else if prRow.SellerID == userID {
		role = "SELLER"
	}

	item, err := h.db.GetFleaMarketItemByID(userID, prRow.ItemID)
	if err != nil {
		http.Error(w, "failed to get item detail", http.StatusInternalServerError)
		return
	}
	address, err := h.db.GetAddress(prRow.AddressID, prRow.BuyerID)
	if err != nil {
		http.Error(w, "failed to get address", http.StatusInternalServerError)
		return
	}

	resp := FleaThreadResp{
		Kind:            "purchase_request",
		Transaction:     nil,
		PurchaseRequest: &prRow,

		Role:    role,
		Item:    item,
		Address: &address,
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// ---------------------------------------------------------
// ハンドラ関数: 出品者が購入申請を承認して取引を確定する
// POST /flea/purchase_requests/{id}/accept
// ---------------------------------------------------------
func (h *FleaMarketHandler) AcceptPurchaseRequest(w http.ResponseWriter, r *http.Request) {
	// 1. ユーザーID取得 (認証)
	sellerID, err := function.CheckUser(h.db, w, r)
	if err != nil || strings.TrimSpace(sellerID) == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. URLパラメータから申請ID取得 (gorilla/mux 使用想定)
	vars := mux.Vars(r)
	reqIDStr := vars["id"]
	reqID, err := strconv.ParseUint(reqIDStr, 10, 64)
	if err != nil || reqID == 0 {
		http.Error(w, "invalid request id", http.StatusBadRequest)
		return
	}

	// 3. ボディのパース
	var input utils.AcceptPurchaseRequestInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		log.Println("Error decoding AcceptPurchaseRequest input:", err)
		http.Error(w, "bad input", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	// -----------------------------------------------------
	// ビジネスロジック部 (Service層の代わり)
	// -----------------------------------------------------

	// A. 申請情報を取得（アイテムIDなどを知るため）
	// ※ GetFleaPurchaseRequestByID は sellerID でも取得可能です
	pr, err := h.db.GetFleaPurchaseRequestByID(ctx, sellerID, reqID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Println("Purchase request not found:", reqID)
			http.Error(w, "request not found", http.StatusNotFound)
		} else {
			log.Println("Error getting purchase request:", err)
			http.Error(w, "failed to get request", http.StatusInternalServerError)
		}
		return
	}

	// B. 商品価格 (Item Price) をDBから取得
	// ※ GetFleaItemPrice メソッドがない場合は、ここで直接クエリを書いてもOKですが、
	//    再利用性を考えて db メソッドを呼ぶ形にします。
	//    (もしメソッド未実装なら h.db.DB.QueryRow(...) でここで取ってください)
	itemPrice, err := h.db.GetFleaItemPrice(ctx, pr.ItemID)
	if err != nil {
		log.Println("Error getting item price:", err)
		http.Error(w, "failed to get item price", http.StatusInternalServerError)
		return
	}

	// C. 保存する「送料」を決定
	// 「送料込み (INCLUDED)」の場合のみ、入力された送料を保存する
	var finalShippingPrice uint32 = 0
	if input.ShippingFeeType == "INCLUDED" {
		finalShippingPrice = input.ShippingFeeAmount
	}
	// ※「着払い (COD)」の場合は 0

	// D. 取引確定 (Transaction作成) -> DB更新
	txID, err := h.db.AcceptFleaPurchaseRequest(
		ctx,
		sellerID,
		reqID,
		input.ShippingMethod,
		input.ShippingFeeType,
		itemPrice,          // DBから取得した商品価格
		finalShippingPrice, // 決定した送料
	)

	if err != nil {
		// エラー内容によってステータスコードを変えるのが丁寧ですが、まずは500で
		log.Println("Error creating transaction:", err)
		http.Error(w, "failed to create transaction: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// D. 購入者情報取得
	buyer, err := h.db.GetUserDataByID(pr.BuyerID)
	if err != nil {
		log.Println("Error getting user data:", err)
		http.Error(w, "failed to get user data", http.StatusInternalServerError)
		return
	}

	if input.NoteToBuyer != "" && strings.TrimSpace(input.NoteToBuyer) != "" {
		h.db.CreateTransactionMessage(txID, sellerID, input.NoteToBuyer)
	}

	// E. 出品者情報取得
	// (メール本文に名前を入れるため)
	seller, err := h.db.GetUserDataByID(pr.SellerID)
	if err != nil {
		log.Println("Error getting seller data:", err)
		http.Error(w, "failed to get seller data", http.StatusInternalServerError)
		return
	}

	// E. 購入者へメール通知
	subject := "【Aftialoop】購入申請が承認されました"
	htmlContent := `
	<p>` + buyer.Name + ` 様</p>
	<p>出品者 ` + seller.Name + ` 様が、あなたの購入申請を承認しました。</p>
	<p>マイページの「フリーマーケット」から取引の詳細をご確認ください。</p>
	<a href="` + function.GetFrontendURL() + `/flea-market/transactions/` + strconv.FormatUint(txID, 10) + `">取引詳細ページへ</a>
	<p>Aftialoopをご利用いただき、ありがとうございます。</p>
	`
	err = function.SendEmailToUserID(h.db, pr.BuyerID, subject, htmlContent)

	if err != nil {
		log.Println("Error sending email to buyer:", err)
		// メール送信失敗は致命的ではないので、ここでは処理を継続する
	}

	// E. レスポンス
	resp := map[string]any{
		"transaction_id": txID,
		"message":        "transaction created",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

type PayTransactionInput struct {
	CardID    *string `json:"card_id"`    // 保存済みカードのID (SquareのCard ID)
	UsePoints int64   `json:"use_points"` // 使いたいポイント数
}

// POST /flea/transactions/{id}/pay
func (h *FleaMarketHandler) PayTransaction(w http.ResponseWriter, r *http.Request) {
	// 1. ユーザー認証
	buyerID, err := function.CheckUser(h.db, w, r)
	if err != nil || buyerID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. 取引ID取得
	vars := mux.Vars(r)
	txID, _ := strconv.ParseUint(vars["id"], 10, 64)

	// 3. 入力取得
	var input PayTransactionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		log.Println("Error decoding PayTransaction input:", err)
		http.Error(w, "bad input", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	// -----------------------------------------------------
	// A. データ取得と計算
	// -----------------------------------------------------

	// 取引・商品・ユーザー情報の取得 (省略せず実装してください)
	tx, err := h.db.GetFleaTransactionByID(ctx, buyerID, txID)
	/* エラーハンドリング */

	item, err := h.db.GetFleaMarketItemByID(buyerID, tx.ItemID)
	/* エラーハンドリング */

	user, err := h.db.GetUserDataWithCustomerIDByID(buyerID)
	/* エラーハンドリング */

	// レート取得
	cfg := config.GetFleaConfig()
	rateDen := float64(cfg.RateDen)
	if rateDen == 0 {
		rateDen = 10000.0
	}

	sellerRate := 1.0
	if item.RawSellerRate > 0 {
		sellerRate = float64(item.RawSellerRate) / rateDen
	}

	// 金額計算
	totalPriceYen := float64(tx.PriceItem + tx.PriceShipping)

	// ポイント換算額
	// ★修正: Floor(切り捨て)だと、フロントで切り捨てたポイント数では1円足りなくなるため、
	//        バックエンドでは Ceil(切り上げ) を使って「端数分はおまけ」してあげる必要があります。
	// 例: 1960pt * 1.02 = 1999.2円 -> Ceilして 2000円分の価値とみなす
	discountYen := math.Ceil(float64(input.UsePoints) * sellerRate)

	// キャップ処理: 割引額が合計金額を超えないようにする
	if discountYen > totalPriceYen {
		discountYen = totalPriceYen
	}

	// 請求額 (float64のまま計算)
	chargeAmount := totalPriceYen - discountYen
	if chargeAmount < 0 {
		chargeAmount = 0
	}

	// カードチェック
	if chargeAmount > 0 && (input.CardID == nil || *input.CardID == "") {
		http.Error(w, "card required", http.StatusBadRequest)
		log.Println("Card ID is required for non-zero charge amount")
		return
	}

	// -----------------------------------------------------
	// B. Square決済実行 (共通関数 ChargeCard を使用)
	// -----------------------------------------------------
	paymentID := ""
	provider := "NONE"

	if chargeAmount > 0 {
		// ★修正: 自作関数を呼び出す (float64をそのまま渡せば中で四捨五入してくれる)
		receiptURL, err := function.ChargeCard(user.CustomerID, *input.CardID, chargeAmount)
		if err != nil {
			log.Printf("Payment Failed: %v", err)
			http.Error(w, "payment failed", http.StatusBadRequest)
			return
		}

		provider = "SQUARE"
		paymentID = "sq_" + uuid.New().String() // ※本当はAPIレスポンスからIDを取りたいが、ReceiptURLしか返していないため仮IDまたは関数戻り値を拡張してIDも返すようにするのがベター

		// ログ用
		log.Printf("決済完了: URL=%s", receiptURL)
	} else {
		provider = "POINT"
		paymentID = "pt_" + uuid.New().String()
	}

	// -----------------------------------------------------
	// C. DB更新 (トランザクション処理)
	// -----------------------------------------------------
	txDB, err := h.db.DB.BeginTx(ctx, nil)
	if err != nil {
		log.Println("Error starting DB transaction:", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer txDB.Rollback()

	// 1. ポイント減算
	if input.UsePoints > 0 {
		if err := h.db.ChargePointTx(ctx, txDB, buyerID, input.UsePoints, "商品購入で利用"); err != nil {
			log.Println("Error charging points:", err)
			http.Error(w, "failed to charge points", http.StatusBadRequest)
			return
		}
	}

	log.Printf("ポイント使用: user_id=%s, use_points=%d", buyerID, input.UsePoints)
	// 2. 取引ステータス更新
	if err := h.db.UpdateFleaTransactionPaidTx(ctx, txDB, txID, provider, paymentID, input.UsePoints, item.RawSellerRate); err != nil {
		log.Println("Error updating transaction status to PAID:", err)
		http.Error(w, "failed to update status", http.StatusInternalServerError)
		return
	}

	if err := txDB.Commit(); err != nil {
		log.Println("Error committing DB transaction:", err)
		http.Error(w, "commit failed", http.StatusInternalServerError)
		return
	}

	// メール送信
	subject := "【Aftialoop】お支払いが完了しました"
	htmlContent := `
	<p>` + user.Name + ` 様</p>
	<p>フリーマーケットの取引に関するお支払いが完了しました。</p>
	<p>マイページの「フリーマーケット」から取引の詳細をご確認ください。</p>
	<a href="` + function.GetFrontendURL() + `/flea-market/transactions/` + strconv.FormatUint(txID, 10) + `">取引詳細ページへ</a>
	<p>Aftialoopをご利用いただき、ありがとうございます。</p>
	`
	err = function.SendEmailToUserID(h.db, buyerID, subject, htmlContent)

	if err != nil {
		log.Println("Error sending payment confirmation email:", err)
		// メール送信失敗は致命的ではないので、ここでは処理を継続する
	}

	// 成功レスポンス

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "paid"})
}

// リクエストボディ用の構造体
type ShipTransactionInput struct {
	ShippingCarrier string `json:"shipping_carrier"` // 配送業者 (例: ヤマト運輸)
	TrackingNumber  string `json:"tracking_number"`  // 追跡番号
}

// 許可された配送業者のリスト
var allowedCarriers = map[string]bool{
	"YAMATO":     true,
	"SAGAWA":     true,
	"JAPAN_POST": true,
}

// ---------------------------------------------------------
// ハンドラ関数: 商品の発送通知を行う
// POST /flea/transactions/{id}/ship
// ---------------------------------------------------------
func (h *FleaMarketHandler) ShipTransaction(w http.ResponseWriter, r *http.Request) {
	// 1. ユーザー認証 (出品者IDの取得)
	sellerID, err := function.CheckUser(h.db, w, r)
	if err != nil || strings.TrimSpace(sellerID) == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. URLパラメータから取引ID取得
	vars := mux.Vars(r)
	txIDStr := vars["id"]
	txID, err := strconv.ParseUint(txIDStr, 10, 64)
	if err != nil || txID == 0 {
		http.Error(w, "bad transaction id", http.StatusBadRequest)
		return
	}

	// 3. リクエストボディのパース
	var input ShipTransactionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		log.Println("Error decoding ShipTransaction input:", err)
		http.Error(w, "bad input", http.StatusBadRequest)
		return
	}

	// バリデーション: 配送業者がリストにあるか確認
	if !allowedCarriers[input.ShippingCarrier] {
		http.Error(w, "invalid shipping carrier (allowed: YAMATO, SAGAWA, JAPAN_POST)", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	// -----------------------------------------------------
	// A. 取引データの確認 (権限チェック)
	// -----------------------------------------------------
	// 既存の取得関数を使って、このユーザーが本当に出品者か確認する
	// ※ GetFleaTransactionByID は buyer_id か seller_id どちらかが一致すればデータを返す想定
	txData, err := h.db.GetFleaTransactionByID(ctx, sellerID, txID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "transaction not found", http.StatusNotFound)
		} else {
			log.Println("Error fetching transaction:", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
		return
	}

	// 権限チェック: ログインユーザーが出品者でなければならない
	if txData.SellerID != sellerID {
		http.Error(w, "forbidden: only seller can ship", http.StatusForbidden)
		return
	}

	// ステータスチェック: PAID (支払い済み) でないと発送できない
	if txData.Status != "PAID" {
		http.Error(w, "transaction is not in paid status", http.StatusBadRequest)
		return
	}

	// -----------------------------------------------------
	// B. DB更新 (指定された関数を使用)
	// -----------------------------------------------------
	txDB, err := h.db.DB.BeginTx(ctx, nil)
	if err != nil {
		log.Println("Error starting DB transaction:", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer txDB.Rollback()

	// 取引ステータスを「SHIPPED」に更新し、配送情報を保存
	err = h.db.MarkFleaTransactionShipped(txDB, txID, input.ShippingCarrier, input.TrackingNumber)
	if err != nil {
		log.Println("Error marking transaction as shipped:", err)
		// エラーメッセージに行数判定の結果も含まれているため、そのままログに出しつつエラーを返す
		http.Error(w, "failed to update status", http.StatusInternalServerError)
		return
	}

	if err := txDB.Commit(); err != nil {
		log.Println("Error committing DB transaction:", err)
		http.Error(w, "commit failed", http.StatusInternalServerError)
		return
	}

	// -----------------------------------------------------
	// C. メール送信 (購入者へ通知)
	// -----------------------------------------------------
	// 購入者情報の取得
	buyer, err := h.db.GetUserDataByID(txData.BuyerID)
	if err != nil {
		log.Println("Error getting buyer data for email:", err)
		// DB更新は成功しているので、ここでreturnせずログだけ吐いて進む
	} else {
		// 出品者情報の取得 (メール本文用)
		seller, _ := h.db.GetUserDataByID(sellerID)

		subject := "【Aftialoop】商品が発送されました"

		// 追跡番号がある場合の表示制御
		trackingInfo := ""
		if input.TrackingNumber != "" {
			trackingInfo = `<p>追跡番号: <b>` + input.TrackingNumber + `</b></p>`
		}

		// メール送信時の日本語変換例
		carrierName := input.ShippingCarrier
		switch input.ShippingCarrier {
		case "YAMATO":
			carrierName = "ヤマト運輸"
		case "SAGAWA":
			carrierName = "佐川急便"
		case "JAPAN_POST":
			carrierName = "ゆうパック"
		}

		htmlContent := `
		<p>` + buyer.Name + ` 様</p>
		<p>出品者 ` + seller.Name + ` 様が商品を発送しました。</p>
		<div style="background-color: #f3f4f6; padding: 10px; border-radius: 5px; margin: 10px 0;">
			<p>配送業者: <b>` + carrierName + `</b></p>
			` + trackingInfo + `
		</div>
		<p>商品が到着しましたら、中身を確認して「受取完了」ボタンを押してください。</p>
		<a href="` + function.GetFrontendURL() + `/flea-market/transactions/` + strconv.FormatUint(txID, 10) + `">取引詳細ページへ</a>
		<p>Aftialoopをご利用いただき、ありがとうございます。</p>
		`

		err = function.SendEmailToUserID(h.db, txData.BuyerID, subject, htmlContent)
		if err != nil {
			log.Println("Error sending shipping email:", err)
		}
	}

	// -----------------------------------------------------
	// D. レスポンス
	// -----------------------------------------------------
	resp := map[string]any{
		"transaction_id": txID,
		"status":         "SHIPPED",
		"message":        "Item marked as shipped",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// 入力受け取り用の構造体を追加
type CompleteTransactionInput struct {
	Rating  int    `json:"rating"`  // 1-5
	Comment string `json:"comment"` // 任意
}

// ---------------------------------------------------------
// ハンドラ関数: 取引を完了する（受取評価）
// POST /flea/transactions/{id}/
// ---------------------------------------------------------
func (h *FleaMarketHandler) RateTransactionByBuyer(w http.ResponseWriter, r *http.Request) {
	// 1. ユーザー認証 (購入者IDの取得)
	buyerID, err := function.CheckUser(h.db, w, r)
	if err != nil || strings.TrimSpace(buyerID) == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. URLパラメータから取引ID取得
	vars := mux.Vars(r)
	txIDStr := vars["id"]
	txID, err := strconv.ParseUint(txIDStr, 10, 64)
	if err != nil || txID == 0 {
		http.Error(w, "bad transaction id", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	// 3. リクエストボディのパース (ここを追加)
	var input CompleteTransactionInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		// ボディがない場合はデフォルト値（Goのゼロ値）で進むかエラーにするか
		// ここでは必須とみなしてエラーにする例
		// log.Println("Error decoding input:", err)
		// http.Error(w, "rating is required", http.StatusBadRequest)
		// return

		// とりあえずデフォルトGood(5)にして進めるやさしい仕様
		input.Rating = 5
	}

	// バリデーション
	if input.Rating < 1 || input.Rating > 5 {
		input.Rating = 5
	}

	// -----------------------------------------------------
	// A. 取引データの確認
	// -----------------------------------------------------
	txData, err := h.db.GetFleaTransactionByID(ctx, buyerID, txID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "transaction not found", http.StatusNotFound)
		} else {
			log.Println("Error fetching transaction:", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
		return
	}

	// 権限チェック: ログインユーザーが「購入者」でなければならない
	if txData.BuyerID != buyerID {
		http.Error(w, "forbidden: only buyer can complete transaction", http.StatusForbidden)
		return
	}

	// ステータスチェック: SHIPPED (発送済み) でないと完了できない
	if txData.Status != "SHIPPED" {
		http.Error(w, "transaction is not in shipped status", http.StatusBadRequest)
		return
	}

	// -----------------------------------------------------
	// B. DB更新 (トランザクション開始)
	// -----------------------------------------------------
	txDB, err := h.db.DB.BeginTx(ctx, nil)
	if err != nil {
		log.Println("Error starting DB transaction:", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer txDB.Rollback()

	err = h.db.SaveFleaTransactionReview(txID, txData.ItemID, txData.BuyerID, txData.SellerID, input.Rating, input.Comment)
	if err != nil {
		log.Println("Error saving transaction review:", err)
		http.Error(w, "failed to save review", http.StatusInternalServerError)
		return
	}

	// 1. ステータスを RATED_BY_BUYER に更新
	err = h.db.MarkFleaTransactionRatedByBuyer(txDB, txID)
	if err != nil {
		log.Println("Error marking transaction as rated by buyer:", err)
		http.Error(w, "failed to update status", http.StatusInternalServerError)
		return
	}

	if err := txDB.Commit(); err != nil {
		log.Println("Error committing DB transaction:", err)
		http.Error(w, "commit failed", http.StatusInternalServerError)
		return
	}

	// -----------------------------------------------------
	// C. メール送信 (出品者へ通知: 評価依頼)
	// -----------------------------------------------------
	// 出品者情報の取得
	seller, err := h.db.GetUserDataByID(txData.SellerID)
	if err != nil {
		log.Println("Error getting seller data for email:", err)
	} else {
		// 購入者情報の取得 (メール本文用)
		buyer, _ := h.db.GetUserDataByID(buyerID)

		subject := "【Aftialoop】購入者が受取評価をしました"
		htmlContent := `
        <p>` + seller.Name + ` 様</p>
        <p>購入者 ` + buyer.Name + ` 様が商品を受け取り、評価を送信しました。</p>
        <p><b>取引を完了するために、あなたも購入者への評価を行ってください。</b></p>
        <p>※双方が評価を終えると取引完了となり、売上金が反映されます。</p>
        <div style="background-color: #f3f4f6; padding: 10px; border-radius: 5px; margin: 10px 0;">
            <p>取引ID: <b>` + txIDStr + `</b></p>
        </div>
        <a href="` + function.GetFrontendURL() + `/flea-market/transactions/` + txIDStr + `">取引詳細ページへ進む</a>
        `

		err = function.SendEmailToUserID(h.db, txData.SellerID, subject, htmlContent)
		if err != nil {
			log.Println("Error sending rated notification to seller:", err)
		}
	}

	// 購入者にも一応完了メールを送る（任意）
	subjectBuyer := "【Aftialoop】評価送信完了のお知らせ"
	htmlContentBuyer := `
	<p>評価送信完了を完了しました。出品者の評価をお待ちください。</p>
	<a href="` + function.GetFrontendURL() + `/flea-market/transactions/` + txIDStr + `">取引詳細ページへ</a>
	`
	_ = function.SendEmailToUserID(h.db, buyerID, subjectBuyer, htmlContentBuyer)

	// -----------------------------------------------------
	// D. レスポンス
	// -----------------------------------------------------
	resp := map[string]any{
		"transaction_id": txID,
		"status":         "RATED_BY_BUYER", // ステータス変更
		"message":        "Buyer rated successfully. Waiting for seller rating.",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// POST /flea/transactions/{id}/complete/seller
func (h *FleaMarketHandler) CompleteTransactionBySeller(w http.ResponseWriter, r *http.Request) {
	// 1. 出品者認証
	sellerID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	txID, _ := strconv.ParseUint(vars["id"], 10, 64)

	// リクエストボディから出品者の評価(Rating/Comment)を取得
	var input CompleteTransactionInput
	json.NewDecoder(r.Body).Decode(&input)
	if input.Rating < 1 {
		input.Rating = 5
	} // デフォルト

	ctx := r.Context()

	// 2. 取引データ取得
	// ※ SellerID で検索することで、本人が出品者であることも同時にチェックできる
	txData, err := h.db.GetFleaTransactionByID(ctx, sellerID, txID)
	if err != nil {
		http.Error(w, "transaction not found", http.StatusNotFound)
		return
	}

	// ★重要: ステータスチェック
	// 「購入者の評価済み」状態でなければ、出品者は完了できない
	if txData.Status != "RATED_BY_BUYER" {
		http.Error(w, "buyer has not rated yet", http.StatusBadRequest)
		return
	}

	// --- トランザクション開始 ---
	txDB, _ := h.db.DB.BeginTx(ctx, nil)
	defer txDB.Rollback()

	// 3. 出品者のレビュー保存 (Reviewer: Seller -> Reviewee: Buyer)
	err = h.db.SaveFleaTransactionReview(txID, txData.ItemID, sellerID, txData.BuyerID, input.Rating, input.Comment)
	if err != nil {
		http.Error(w, "failed to save review", http.StatusInternalServerError)
		return
	}

	// -----------------------------------------------------
	// ★ 3. 売上金の計算と加算
	// -----------------------------------------------------

	var commissionRate float64
	var commissionRateBP int64

	cfg := config.GetFleaConfig()

	// flea_items テーブルから commission_rate (販売手数料) を取得
	// ※ 注意: seller_rate (ポイントレート) と間違えないように！
	commissionRateBP, err = h.db.GetFleaMarketCommissionRate(txData.ItemID)

	if err != nil {
		// カラム追加前やエラー時は安全策としてデフォルト10%を適用
		log.Printf("Warning: could not fetch commission_rate for item %d (using default 10%%): %v", txData.ItemID, err)
		commissionRateBP = cfg.CommissionRate
	}
	commissionRate = float64(commissionRateBP) / float64(cfg.RateDen)

	// 計算: 商品価格 - (商品価格 * 手数料率 / 100)
	price := float64(txData.PriceItem)
	fee := math.Floor(price * commissionRate) // 手数料 (切り捨て)
	profit := int(price - fee)                // 出品者の手取り売上

	// 4. ステータスを完全に「COMPLETED」にする
	// ※ MarkFleaTransactionCompleted 関数は "SHIPPED" だけでなく "RATED_BY_BUYER" からも遷移できるようにSQL修正が必要
	err = h.db.MarkFleaTransactionCompleted(txDB, txID, int(fee), profit)
	if err != nil {
		http.Error(w, "failed to complete transaction", http.StatusInternalServerError)
		return
	}

	// ------------------------------------------------------------------
	// ★ TODO: 将来の実装メモ (経理用)
	// ------------------------------------------------------------------
	// ここで発生した `fee` (手数料収入) を `platform_earnings` などの
	// 管理用テーブルに別途 INSERT しておくと、月次決算が一発で出せるようになります。
	//
	// 例: h.db.RecordPlatformRevenue(txDB, int(fee), txID, "販売手数料")
	// ------------------------------------------------------------------

	// 履歴用メモ
	note := fmt.Sprintf("売上反映: %d円 (商品ID:%d, 価格:%d, 手数料:%f%%)", profit, txData.ItemID, txData.PriceItem, commissionRate)
	// 残高加算 (共通関数)
	if err := h.db.AddUserSalesBalance(txDB, sellerID, profit, txID, note); err != nil {
		log.Println("Error adding sales balance:", err)
		http.Error(w, "failed to update balance", http.StatusInternalServerError)
		return
	}
	if err := txDB.Commit(); err != nil {
		log.Println("Error committing DB transaction:", err)
		http.Error(w, "commit failed", http.StatusInternalServerError)
		return
	}
	// -----------------------------------------------------

	// 6. 完了メール送信 (双方へ)
	// 購入者へ: 「出品者からも評価され、取引が完了しました」
	subjectBuyer := "【Aftialoop】取引完了のお知らせ"
	htmlContentBuyer := `
	<p>出品者 ` + sellerID + ` 様からも評価が送信され、取引が完了しました。</p>
	<p>売上金が反映されましたので、マイページの「ポイント履歴」からご確認ください。</p>
	<a href="` + function.GetFrontendURL() + `/flea-market/transactions/` + strconv.FormatUint(txID, 10) + `">取引詳細ページへ</a>
	`
	_ = function.SendEmailToUserID(h.db, txData.BuyerID, subjectBuyer, htmlContentBuyer)

	// 出品者へ: 「取引完了。売上が反映されました」
	subjectSeller := "【Aftialoop】取引完了のお知らせ"
	htmlContentSeller := `
	<p>購入者 ` + txData.BuyerID + ` 様からも評価が送信され、取引が完了しました。</p>
	<p>売上金が反映されましたので、マイページの「ポイント履歴」からご確認ください。</p>
	<a href="` + function.GetFrontendURL() + `/flea-market/transactions/` + strconv.FormatUint(txID, 10) + `">取引詳細ページへ</a>
	`
	_ = function.SendEmailToUserID(h.db, sellerID, subjectSeller, htmlContentSeller)

	// 7. レスポンス
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "COMPLETED"})
}

var fontData []byte

// DownloadReceiptPDF: 領収書PDFを生成して返す (ポイント対応 & 色修正版)
func (h *FleaMarketHandler) DownloadReceiptPDF(w http.ResponseWriter, r *http.Request) {
	// 1. 認証 & データ取得
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	txID, _ := strconv.ParseUint(vars["id"], 10, 64)
	ctx := r.Context()

	// 取引データ取得
	txData, err := h.db.GetFleaTransactionByID(ctx, userID, txID)
	if err != nil {
		http.Error(w, "transaction not found", http.StatusNotFound)
		return
	}

	buyer, _ := h.db.GetUserDataByID(txData.BuyerID)
	item, _ := h.db.GetFleaMarketItemByID(userID, txData.ItemID)

	// ---------------------------------------------------------
	// 2. PDF生成開始
	// ---------------------------------------------------------
	pdf := gopdf.GoPdf{}
	pdf.Start(gopdf.Config{PageSize: *gopdf.PageSizeA4})
	pdf.AddPage()

	// フォント読み込み
	err = pdf.AddTTFFont("ipaexg", "./fonts/ipaexg.ttf") // ※embedならAddTTFFontData
	if err != nil {
		http.Error(w, "font load error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// ヘルパー
	drawText := func(x, y float64, size float64, text string, style string) {
		pdf.SetFont("ipaexg", style, size)
		pdf.SetX(x)
		pdf.SetY(y)
		pdf.Cell(nil, text)
	}

	drawCircle := func(x, y, r float64) {
		pdf.Oval(x, y, x+r, y+r)
	}

	// --- レイアウト ---

	// タイトル
	pdf.SetTextColor(0, 0, 0)
	drawText(250, 50, 24, "領 収 書", "")

	// 下線
	pdf.SetLineWidth(1)
	pdf.Line(20, 80, 575, 80)

	// 宛名
	drawText(30, 110, 16, fmt.Sprintf("%s  様", buyer.Name), "")

	// 日付
	dateStr := txData.CompletedAt
	if dateStr == nil || *dateStr == "" {
		now := time.Now().Format(time.RFC3339)
		dateStr = &now
	}
	t, _ := time.Parse(time.RFC3339, *dateStr)
	fmtDate := t.Format("2006年01月02日")
	drawText(400, 110, 10, "発行日: "+fmtDate, "")
	drawText(400, 125, 10, fmt.Sprintf("No. %d", txData.ID), "")

	// --- 金額ボックス (一番上の大きな金額) ---
	pdf.SetFillColor(245, 245, 245)
	pdf.RectFromUpperLeftWithStyle(30, 150, 535, 60, "F")

	// ★色修正: 黒に戻す
	pdf.SetTextColor(0, 0, 0)

	cfg := config.GetFleaConfig()

	// 実際の請求金額を計算 (商品価格 - ポイント利用)
	// ※ txData.UsePoint がある前提
	payPoint := 0.0

	payPoint = float64(txData.UsePoint) * (float64(txData.PointRate) / float64(cfg.RateDen))
	finalAmount := txData.PriceItem - uint32(payPoint)

	drawText(220, 175, 24, fmt.Sprintf("￥%d", finalAmount), "") // ここは支払い総額を表示
	drawText(40, 190, 10, "但 商品代金として", "")

	// --- 明細テーブルヘッダー ---
	pdf.SetY(240)
	pdf.SetX(30)
	pdf.SetFillColor(230, 230, 230)
	pdf.RectFromUpperLeftWithStyle(30, 240, 535, 20, "F") // 背景

	// ★色修正: 黒に戻す
	pdf.SetTextColor(0, 0, 0)
	pdf.SetFont("ipaexg", "", 10)

	// ヘッダー文字
	pdf.CellWithOption(&gopdf.Rect{W: 300, H: 20}, "品名", gopdf.CellOption{Align: gopdf.Center, Border: 1})
	pdf.CellWithOption(&gopdf.Rect{W: 80, H: 20}, "数量", gopdf.CellOption{Align: gopdf.Center, Border: 1})
	pdf.CellWithOption(&gopdf.Rect{W: 155, H: 20}, "金額", gopdf.CellOption{Align: gopdf.Center, Border: 1})

	// --- 明細行 (商品) ---
	pdf.SetY(260)
	pdf.SetX(30)
	pdf.CellWithOption(&gopdf.Rect{W: 300, H: 20}, " "+item.Name, gopdf.CellOption{Align: gopdf.Left, Border: 1})
	pdf.CellWithOption(&gopdf.Rect{W: 80, H: 20}, "1", gopdf.CellOption{Align: gopdf.Center, Border: 1})
	pdf.CellWithOption(&gopdf.Rect{W: 155, H: 20}, fmt.Sprintf("￥%d ", txData.PriceItem), gopdf.CellOption{Align: gopdf.Right, Border: 1})

	currentY := 280.0

	// --- ポイント利用行 (利用がある場合のみ) ---
	if txData.UsePoint > 0 {
		// 小計
		drawText(40, currentY+5, 10, "小計", "")
		drawText(450, currentY+5, 10, fmt.Sprintf("￥%d", txData.PriceItem), "")
		currentY += 20

		// ポイント利用
		drawText(40, currentY+5, 10, "ポイント利用 ", "")

		// マイナス表示
		drawText(450, currentY+5, 10, fmt.Sprintf("- ￥%d", uint32(payPoint)), "")
		currentY += 20

		// 区切り線
		pdf.SetLineWidth(0.5)
		pdf.SetStrokeColor(200, 200, 200)
		pdf.Line(350, currentY, 565, currentY)
		pdf.SetTextColor(0, 0, 0)
		currentY += 10
	}

	// --- 合計金額 (右寄せ) ---
	pdf.SetFont("ipaexg", "", 12)
	pdf.SetX(350)
	pdf.SetY(currentY)
	pdf.Cell(nil, "ご請求金額")

	pdf.SetFont("ipaexg", "", 14)
	payStr := fmt.Sprintf("￥%d", finalAmount)
	pWidth, _ := pdf.MeasureTextWidth(payStr)
	pdf.SetX(550 - pWidth)
	pdf.SetY(currentY)
	pdf.Cell(nil, payStr)

	// --- フッター (右下) ---
	footerY := 450.0
	footerX := 380.0

	drawText(footerX, footerY, 12, "Animaloop Inc.", "")
	drawText(footerX, footerY+20, 10, "〒000-0000", "")
	drawText(footerX, footerY+35, 10, "東京都渋谷区〇〇 1-2-3", "")

	// 印鑑
	pdf.SetStrokeColor(255, 0, 0)
	pdf.SetLineWidth(2)
	drawCircle(footerX+80, footerY-10, 50)

	pdf.SetTextColor(255, 0, 0)
	drawText(footerX+93, footerY+8, 10, "Animaloop", "")
	drawText(footerX+100, footerY+20, 8, "印", "")

	// 出力
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=receipt_%d.pdf", txID))
	if _, err := pdf.WriteTo(w); err != nil {
		http.Error(w, "pdf generation failed", http.StatusInternalServerError)
	}
}

// DownloadSalesStatementPDF: 出品者用の販売明細書を発行
func (h *FleaMarketHandler) DownloadSalesStatementPDF(w http.ResponseWriter, r *http.Request) {
	// 1. 認証 (出品者本人かチェック)
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	txID, _ := strconv.ParseUint(vars["id"], 10, 64)
	ctx := r.Context()

	// 2. 取引データ取得
	// SellerID = userID で検索することで、出品者本人しかDLできないようにする
	txData, err := h.db.GetFleaTransactionByID(ctx, userID, txID)
	if err != nil {
		http.Error(w, "transaction not found or you are not the seller", http.StatusNotFound)
		return
	}

	// 出品者情報、アイテム情報を取得
	seller, _ := h.db.GetUserDataByID(txData.SellerID)
	item, _ := h.db.GetFleaMarketItemByID(userID, txData.ItemID)

	// ---------------------------------------------------------
	// 3. 手数料・利益の再計算 (表示用)
	// ---------------------------------------------------------

	var commissionRate float64
	var commissionRateBP int64

	cfg := config.GetFleaConfig()
	// flea_items テーブルから commission_rate (販売手数料) を取得
	commissionRateBP, err = h.db.GetFleaMarketCommissionRate(txData.ItemID)
	if err != nil {
		// カラム追加前やエラー時は安全策としてデフォルト10%を適用
		log.Printf("Warning: could not fetch commission_rate for item %d (using default 10%%): %v", txData.ItemID, err)
		commissionRateBP = cfg.CommissionRate
	}
	commissionRate = float64(commissionRateBP) / float64(cfg.RateDen)

	fee := txData.FeeAmount       // DBに保存された手数料
	profit := txData.ProfitAmount // DBに保存された利益

	// ---------------------------------------------------------
	// 4. PDF描画開始
	// ---------------------------------------------------------
	pdf := gopdf.GoPdf{}
	pdf.Start(gopdf.Config{PageSize: *gopdf.PageSizeA4})
	pdf.AddPage()

	// フォント読み込み (embedの場合は AddTTFFontData)
	_ = pdf.AddTTFFont("ipaexg", "./fonts/ipaexg.ttf")

	// ヘルパー: テキスト描画 (色指定なし)
	drawText := func(x, y float64, size float64, text string) {
		pdf.SetFont("ipaexg", "", size)
		pdf.SetX(x)
		pdf.SetY(y)
		pdf.Cell(nil, text)
	}

	// --- タイトル・宛名 ---
	pdf.SetTextColor(0, 0, 0) // ★念のため最初に黒指定
	pdf.SetFont("ipaexg", "", 20)
	pdf.SetX(220)
	pdf.SetY(50)
	pdf.Cell(nil, "販売代金明細書")

	drawText(30, 100, 14, fmt.Sprintf("%s  様", seller.Name))
	drawText(400, 100, 10, fmt.Sprintf("発行日: %s", time.Now().Format("2006年01月02日")))
	drawText(400, 115, 10, fmt.Sprintf("取引ID: %d", txData.ID))

	// --- メイン金額ボックス ---
	pdf.SetFillColor(240, 240, 240)                       // 薄いグレー
	pdf.RectFromUpperLeftWithStyle(30, 140, 535, 50, "F") // 塗りつぶし

	// ★★★ ここで黒に戻す！ ★★★
	pdf.SetTextColor(0, 0, 0)

	pdf.SetFont("ipaexg", "", 12)
	pdf.SetX(40)
	pdf.SetY(155)
	pdf.Cell(nil, "お受取金額")

	pdf.SetFont("ipaexg", "", 24)
	profitStr := fmt.Sprintf("￥%d", profit)
	pWidth, _ := pdf.MeasureTextWidth(profitStr)
	pdf.SetX(550 - pWidth) // 右寄せ
	pdf.SetY(150)
	pdf.Cell(nil, profitStr)

	// --- 明細テーブル ---
	startY := 220.0

	// ヘッダー背景
	pdf.SetFillColor(230, 230, 230)
	pdf.RectFromUpperLeftWithStyle(30, startY, 535, 25, "F")

	// ★★★ ここでも黒に戻す！ ★★★
	pdf.SetTextColor(0, 0, 0)

	drawText(40, startY+8, 10, "項目")
	drawText(450, startY+8, 10, "金額")

	// 行1: 商品代金
	lineY := startY + 35
	drawText(40, lineY, 10, fmt.Sprintf("商品代金 (%s)", item.Name))
	drawText(450, lineY, 10, fmt.Sprintf("￥%d", txData.PriceItem))

	// 線を描く
	pdf.SetLineWidth(0.5)
	pdf.SetStrokeColor(200, 200, 200) // 線の色
	pdf.Line(30, lineY+15, 565, lineY+15)
	pdf.SetTextColor(0, 0, 0) // 文字用に黒へ戻す

	// 行2: 販売手数料
	lineY += 25
	drawText(40, lineY, 10, fmt.Sprintf("販売手数料 (%.1f%%)", commissionRate*100))
	drawText(450, lineY, 10, fmt.Sprintf("- ￥%d", int(fee)))

	pdf.SetStrokeColor(200, 200, 200)
	pdf.Line(30, lineY+15, 565, lineY+15)
	pdf.SetTextColor(0, 0, 0)

	// 行3: 合計
	lineY += 25
	pdf.SetFont("ipaexg", "", 12)
	pdf.SetX(350)
	pdf.SetY(lineY)
	pdf.Cell(nil, "合計 (売上利益)")

	pdf.SetFont("ipaexg", "", 14)
	pdf.SetX(450)
	pdf.SetY(lineY)
	pdf.Cell(nil, fmt.Sprintf("￥%d", profit))

	// フッター
	drawText(400, 450, 10, "Animaloop Inc.")

	// 出力
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=statement_%d.pdf", txID))
	if _, err := pdf.WriteTo(w); err != nil {
		http.Error(w, "pdf generation failed", http.StatusInternalServerError)
	}
}

// ListActiveTransactionsHandler: 進行中の取引一覧を取得
func (h *FleaMarketHandler) ListActiveTransactions(w http.ResponseWriter, r *http.Request) {
	// 1. ユーザー認証
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. ページネーション（必要なら）
	limit := 20
	offset := 0
	// クエリパラメータ ?page=2 などがあれば計算するロジックを入れてもOK

	// 3. DBからデータ取得
	// ※先ほど改良したSQL関数を呼び出す
	// もし型定義が utils パッケージにあるなら h.db.ListActiveFleaTransactions(...)
	txs, err := h.db.ListActiveFleaTransactions(r.Context(), userID, limit, offset)
	if err != nil {
		// エラーログを出力
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// 4. 空配列の場合は null ではなく [] を返すようにする
	if txs == nil {
		txs = []utils.ActiveTransactionResponse{}
	}

	// 5. JSONで返す
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(txs); err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
		return
	}
}

// ListCompletedTransactions: 完了・キャンセル済みの取引履歴を取得
func (h *FleaMarketHandler) ListCompletedTransactions(w http.ResponseWriter, r *http.Request) {
	// 1. ユーザー認証
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. クエリパラメータから limit, offset を取得 (ページネーション用)
	limit := 20
	offset := 0

	// URLクエリ ?limit=20&offset=0 などがあれば取得
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

	// 3. DBから取得 (さっき追加したSQL関数を呼ぶ)
	txs, err := h.db.ListCompletedFleaTransactions(r.Context(), userID, limit, offset)
	if err != nil {
		// ログ出力など推奨
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// 4. 空の場合は null ではなく [] を返す
	if txs == nil {
		txs = []utils.ActiveTransactionResponse{}
	}

	// 5. JSONでレスポンス
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(txs); err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
		return
	}
}

// ---------------------------------------------------------
// ハンドラ関数: 取引をキャンセルする
// POST /flea/transactions/{id}/cancel
// ---------------------------------------------------------
func (h *FleaMarketHandler) CancelTransaction(w http.ResponseWriter, r *http.Request) {
	// 1. ユーザー認証
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. 取引ID取得
	vars := mux.Vars(r)
	txIDStr := vars["id"]
	txID, err := strconv.ParseUint(txIDStr, 10, 64)
	if err != nil || txID == 0 {
		http.Error(w, "bad transaction id", http.StatusBadRequest)
		return
	}

	var input struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&input)

	// 理由がない場合エラーを返す(理由は必須項目だとメッセージ)
	if input.Reason == "" {
		http.Error(w, "キャンセルの理由は必須です。", http.StatusBadRequest)
	}

	ctx := r.Context()

	// 3. 取引データの確認 (キャンセル可能かチェック)
	txData, err := h.db.GetFleaTransactionByID(ctx, userID, txID)
	if err != nil {
		http.Error(w, "transaction not found", http.StatusNotFound)
		return
	}

	// 4. キャンセル条件のチェック
	// ・当事者であること
	// ・ステータスが「発送前 (PAID)」または「支払い前 (PENDING)」であること
	// 　※「発送済み(SHIPPED)」以降は原則キャンセル不可にするのが安全
	if !function.IsCancellable(txData.Status) {
		http.Error(w, "cannot cancel: transaction status is "+txData.Status, http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "発送済み、または完了・キャンセル済みの取引はキャンセルできません"})
		return
	}

	// 5. 返金処理 (PAIDの場合)
	// Square決済やポイント払いの返金が必要
	if txData.Status == "PAID" {
		// A. Square決済の返金 (PaymentIDがある場合)
		if *txData.PaymentProvider == "SQUARE" && *txData.PaymentID != "" {
			// function.RefundPayment などの実装が必要
			// ここでは簡易的にログ出力のみとし、実運用ではSquare APIを叩く
			log.Printf("TODO: Refund Square Payment: %v", txData.PaymentID)
		}

		// B. ポイント返還 (UsePoint > 0 の場合)
		if txData.UsePoint > 0 {
			// ポイントをユーザーに戻す (履歴タイプ: CANCEL_REFUND など)
			err := h.db.AddPoint(ctx, txData.BuyerID, int64(txData.UsePoint), "取引キャンセルによる返還")
			if err != nil {
				log.Println("Error refunding points:", err)
				http.Error(w, "failed to refund points", http.StatusInternalServerError)
				return
			}
		}
	}

	// 6. DB更新 (キャンセル処理)
	// ステータスを CANCELLED にし、商品の在庫を戻す
	if err := h.db.CancelFleaTransaction(txID, userID, input.Reason); err != nil {
		log.Println("Error cancelling transaction:", err)
		http.Error(w, "failed to cancel transaction", http.StatusInternalServerError)
		return
	}

	// 7. 通知メール送信 (双方へ)
	go func() {
		// 共通の文言
		baseMsg := `
        <p>取引 (ID: ` + txIDStr + `) がキャンセルされました。</p>
        <p>理由: ` + input.Reason + `</p>
        <hr>
        `

		// --- A. 出品者へのメール (再出品の案内あり) ---
		sellerSubject := "【Aftialoop】取引がキャンセルされました"
		sellerContent := baseMsg + `
        <p><b>【商品の状態について】</b></p>
        <p>商品は現在<b>「下書き（非公開）」</b>状態に戻っています。</p>
        <p>再出品される場合は、マイページの出品リストから「編集」を行い、再度公開してください。</p>
        `
		if err := function.SendEmailToUserID(h.db, txData.SellerID, sellerSubject, sellerContent); err != nil {
			log.Printf("Failed to send cancel email to seller: %v", err)
		}

		// --- B. 購入者へのメール (返金の案内のみ) ---
		buyerSubject := "【Aftialoop】取引がキャンセルされました"
		buyerContent := baseMsg + `
        <p>本取引は中止となりました。</p>
        <p>お支払い済みの代金がある場合は、順次返金処理が行われます。</p>
        <p>詳細はマイページの取引履歴をご確認ください。</p>
        `
		if err := function.SendEmailToUserID(h.db, txData.BuyerID, buyerSubject, buyerContent); err != nil {
			log.Printf("Failed to send cancel email to buyer: %v", err)
		}
	}()

	// 8. レスポンス
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "CANCELLED",
		"message": "Transaction cancelled successfully",
	})
}
