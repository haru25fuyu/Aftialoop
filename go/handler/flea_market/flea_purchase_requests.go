package handler

import (
	"animaloop/function"
	"animaloop/utils"
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
)

type CreateFleaPurchaseRequestReq struct {
	ItemID             any     `json:"item_id"`
	AddressID          any     `json:"address_id"`
	ShippingMethodPref string  `json:"shipping_method_pref"`
	ShippingFeePref    string  `json:"shipping_fee_pref"`
	Note               *string `json:"note"`
}

type CreateFleaPurchaseRequestResp struct {
	ID uint64 `json:"id"`
}

// POST /flea/purchase-requests/create
func (h *FleaMarketHandler) CreateFleaPurchaseRequest(w http.ResponseWriter, r *http.Request) {
	// 認証
	buyerID, err := function.CheckUser(h.db, w, r)
	if err != nil || strings.TrimSpace(buyerID) == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// JSON
	var req CreateFleaPurchaseRequestReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("Error decoding CreateFleaPurchaseRequestReq:", err)
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	// item_id / address_id は string|number 両対応にする（フロントの型に合わせる）
	itemID, err := utils.ToInt64(req.ItemID)
	if err != nil || itemID <= 0 {
		log.Println("Invalid item_id:", req.ItemID, err)
		http.Error(w, "invalid item_id", http.StatusBadRequest)
		return
	}

	addressID64, err := utils.ToInt64(req.AddressID)
	if err != nil || addressID64 <= 0 || addressID64 > 2147483647 {
		log.Println("Invalid address_id:", req.AddressID, err)
		http.Error(w, "invalid address_id", http.StatusBadRequest)
		return
	}
	addressID := int(addressID64)

	shipMethod := strings.TrimSpace(req.ShippingMethodPref)
	shipFee := strings.TrimSpace(req.ShippingFeePref)

	// note の整形（空文字は nil に寄せる）
	var note *string = nil
	if req.Note != nil {
		s := strings.TrimSpace(*req.Note)
		if s != "" {
			note = &s
		}
	}

	id, err := h.db.CreateFleaPurchaseRequest(
		r.Context(),
		buyerID,
		itemID,
		addressID,
		shipMethod,
		shipFee,
		note,
	)
	if err != nil {
		// ここは運用しながら増やしていい
		switch {
		case errors.Is(err, context.Canceled):
			log.Println("Request canceled in CreateFleaPurchaseRequest:", err)
			http.Error(w, "canceled", http.StatusRequestTimeout)
			return
		case err.Error() == "forbidden":
			log.Println("Forbidden in CreateFleaPurchaseRequest:", err)
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		case strings.Contains(err.Error(), "invalid"):
			log.Println("Bad request in CreateFleaPurchaseRequest:", err)
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		default:
			log.Println("Error creating flea purchase request:", err)
			http.Error(w, "failed", http.StatusInternalServerError)
			return
		}
	}

	if note != nil {
		h.db.CreateTransactionMessage(id, buyerID, *req.Note)
	}

	// 出品者取得
	sellerIDPtr, err := h.db.GetFleaMarketSellerID(itemID)
	if err != nil {
		log.Println("Error getting seller ID in CreateFleaPurchaseRequest:", err)
		http.Error(w, "failed to get seller ID", http.StatusInternalServerError)
		return
	}
	if sellerIDPtr == nil {
		http.Error(w, "seller not found", http.StatusNotFound)
		return
	}
	sellerID := *sellerIDPtr

	//　成功したら出品者に通知を送る（非同期）（初期はメール）
	htmlContent := "<p>新しい購入リクエストが届きました。</p>" +
		"<p>購入リクエストID: " + "</p>" +
		"<p>マイページの購入リクエスト一覧からご確認ください。</p>"

	err = function.SendEmailToUserID(h.db, sellerID, "新しい購入リクエストが届きました", htmlContent)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(CreateFleaPurchaseRequestResp{ID: id})
}

type ListFleaPurchaseRequestsResp struct {
	Items      []utils.FleaPurchaseRequestListItem `json:"items"`
	Total      int                                 `json:"total"`
	NextOffset int                                 `json:"next_offset"`
}

func (h *FleaMarketHandler) ListFleaPurchaseRequestsBySeller(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil || userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	q := r.URL.Query()
	limit := utils.ParseInt(q.Get("limit"), 20)
	offset := utils.ParseInt(q.Get("offset"), 0)

	var st *string
	if s := strings.TrimSpace(q.Get("status")); s != "" {
		st = &s
	}

	items, total, err := h.db.ListFleaPurchaseRequestsBySeller(r.Context(), userID, st, limit, offset)
	if err != nil {
		http.Error(w, "failed", http.StatusInternalServerError)
		return
	}

	resp := ListFleaPurchaseRequestsResp{
		Items:      items,
		Total:      total,
		NextOffset: offset + len(items),
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

// ListPendingRequestsHandler: 自分宛ての購入申請一覧
func (h *FleaMarketHandler) ListPendingRequests(w http.ResponseWriter, r *http.Request) {
	// 1. ユーザー認証
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. DBから取得
	requests, err := h.db.ListPendingFleaPurchaseRequests(r.Context(), userID)
	if err != nil {
		// エラーログなど
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// 3. 空の場合は空配列を返す
	if requests == nil {
		requests = []utils.PurchaseRequestResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(requests)
}

// POST /flea/purchase_requests/{id}/withdraw
func (h *FleaMarketHandler) WithdrawPurchaseRequest(w http.ResponseWriter, r *http.Request) {
	// 1. ユーザー認証
	userID, _ := function.CheckUser(h.db, w, r)

	// 2. ID取得
	vars := mux.Vars(r)
	reqID, _ := strconv.ParseUint(vars["id"], 10, 64)

	var input struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&input)
	if input.Reason == "" {
		input.Reason = "理由なし"
	}

	// 3. 権限チェック (既存ロジック)
	pr, err := h.db.GetFleaPurchaseRequestByID(r.Context(), userID, reqID)
	if err != nil { /* エラー処理 */
		return
	}
	if pr.BuyerID != userID { /* Forbidden */
		return
	}
	if pr.Status != "REQUESTED" { /* BadRequest */
		return
	}

	// 4. DB更新 (専用メソッドを呼ぶ)
	// ★ UpdatePurchaseRequestStatus ではなく WithdrawFleaPurchaseRequest を新設して呼ぶ
	if err := h.db.WithdrawFleaPurchaseRequest(reqID, userID, input.Reason); err != nil {
		log.Println("Withdraw failed:", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	// 5. 通知メール送信 (出品者へ)
	go func() {
		subject := "【Aftialoop】購入申請が取り下げられました"
		content := `
            <p>商品への購入申請が取り下げられました。</p>
            <p>理由: ` + input.Reason + `</p>
            <p>商品は引き続き「出品中」の状態です。</p>
         `
		function.SendEmailToUserID(h.db, pr.SellerID, subject, content)
	}()

	w.WriteHeader(http.StatusOK)
}

func (h *FleaMarketHandler) RejectPurchaseRequest(w http.ResponseWriter, r *http.Request) {
	// 1. ユーザー認証
	userID, _ := function.CheckUser(h.db, w, r)

	// 2. ID取得
	vars := mux.Vars(r)
	reqID, _ := strconv.ParseUint(vars["id"], 10, 64)

	// 3. 理由取得
	var input struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&input)
	if input.Reason == "" {
		input.Reason = "出品者の都合により"
	}

	// 4. データ取得
	pr, err := h.db.GetFleaPurchaseRequestByID(r.Context(), userID, reqID)
	if err != nil {
		http.Error(w, "request not found", http.StatusNotFound)
		return
	}

	// ★ここが違う：実行者が「出品者」であることを確認
	if pr.SellerID != userID {
		http.Error(w, "forbidden: you are not the seller", http.StatusForbidden)
		return
	}

	// ステータスチェック (REQUESTED の時のみ却下可能)
	if pr.Status != "REQUESTED" {
		http.Error(w, "cannot reject: status is not requested", http.StatusBadRequest)
		return
	}

	// 5. DB更新 (却下用メソッドを呼ぶ)
	if err := h.db.RejectFleaPurchaseRequest(reqID, userID, input.Reason); err != nil {
		log.Println("Reject failed:", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	// 6. 通知メール送信 (購入者へ)
	go func() {
		subject := "【Aftialoop】購入申請が見送られました"
		content := `
            <p>誠に残念ですが、以下の商品への購入申請が見送られました（却下されました）。</p>
            <p><b>理由:</b> ` + input.Reason + `</p>
            <hr>
            <p>またの機会がございましたら、よろしくお願いいたします。</p>
         `
		function.SendEmailToUserID(h.db, pr.BuyerID, subject, content)
	}()

	w.WriteHeader(http.StatusOK)
}
