package handler

import (
	"animaloop/function"
	"animaloop/utils"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

type FleaThreadResp struct {
	Kind            string                        `json:"kind"` // "transaction" | "purchase_request"
	Transaction     *utils.FleaTransactionRow     `json:"transaction"`
	PurchaseRequest *utils.FleaPurchaseRequestRow `json:"purchase_request"`
	Role            string                        `json:"role"` // "BUYER" | "SELLER"

	Item    *utils.FleaMarketItemDetail `json:"item"`
	Address *utils.Address              `json:"address"`
}

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

	// E. レスポンス
	resp := map[string]any{
		"transaction_id": txID,
		"message":        "transaction created",
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
