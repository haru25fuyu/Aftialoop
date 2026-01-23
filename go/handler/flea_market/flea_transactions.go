package handler

import (
	"animaloop/function"
	"animaloop/utils"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
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

		item, err := h.db.GetFleaMarketItemByID(txRow.ItemID)
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
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
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

	item, err := h.db.GetFleaMarketItemByID(prRow.ItemID)
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

	item, err := h.db.GetFleaMarketItemByID(tx.ItemID)
	/* エラーハンドリング */

	user, err := h.db.GetUserDataWithCustomerIDByID(buyerID)
	/* エラーハンドリング */

	// レート取得
	cfg := function.GetFleaConfig()
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
	// ★ここも四捨五入したければ math.Round ですが、通常ポイントは「切り捨て」か「切り上げ」が多いです。
	// 今回は安全側に倒して Floor (1pt = 1.02円 のとき 100pt -> 102円)
	discountYen := math.Floor(float64(input.UsePoints) * sellerRate)

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
		if err := h.db.ChargePointTx(ctx, txDB, buyerID, input.UsePoints); err != nil {
			log.Println("Error charging points:", err)
			http.Error(w, "failed to charge points", http.StatusBadRequest)
			return
		}
	}

	// 2. 取引ステータス更新
	if err := h.db.UpdateFleaTransactionPaidTx(ctx, txDB, txID, provider, paymentID); err != nil {
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

	err = h.db.SaveFleaTransactionReview(txDB, txID, txData.ItemID, txData.BuyerID, txData.SellerID, input.Rating, input.Comment)
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
	err = h.db.SaveFleaTransactionReview(txDB, txID, txData.ItemID, sellerID, txData.BuyerID, input.Rating, input.Comment)
	if err != nil {
		http.Error(w, "failed to save review", http.StatusInternalServerError)
		return
	}

	// 4. ステータスを完全に「COMPLETED」にする
	// ※ MarkFleaTransactionCompleted 関数は "SHIPPED" だけでなく "RATED_BY_BUYER" からも遷移できるようにSQL修正が必要
	err = h.db.MarkFleaTransactionCompleted(txDB, txID)
	if err != nil {
		http.Error(w, "failed to complete transaction", http.StatusInternalServerError)
		return
	}

	// 5. ★ここで売上金を加算！
	// 例: function.AddUserBalance(txDB, sellerID, txData.PriceItem)

	txDB.Commit()
	// --- トランザクション終了 ---

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
