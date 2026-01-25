package handler

import (
	"animaloop/function"
	"animaloop/utils"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

// ---------------------------------------------------------
// ハンドラ: 売上履歴と残高を取得
// GET /flea/my/sales
// ---------------------------------------------------------
func (h *FleaMarketHandler) GetMySalesHistory(w http.ResponseWriter, r *http.Request) {
	// 1. 認証
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. 現在の残高を取得 (usersテーブル)
	currentBalance, err := h.db.GetUserSalesBalance(userID)
	if err != nil {
		log.Println("Error fetching balance:", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	histories, err := h.db.GetUserSalesHistories(userID, 50, 0)
	if err != nil {
		log.Println("Error fetching history:", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	// 4. レスポンス
	resp := utils.SalesHistoryResponse{
		Balance:   currentBalance,
		Histories: histories,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// リクエストボディ用
type ExchangeRequest struct {
	Amount int `json:"amount"`
}

func (h *FleaMarketHandler) ExchangeSalesToPoint(w http.ResponseWriter, r *http.Request) {
	// 1. 認証 & 入力取得
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		log.Println("Unauthorized access attempt")
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req ExchangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("Error decoding request:", err)
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// 2. DB更新処理 (売上減らす & ポイント増やす)
	ctx := r.Context()
	err = h.db.ExchangeSalesToPoint(ctx, userID, req.Amount)
	if err != nil {
		// エラーハンドリング (残高不足など)
		log.Println("Error exchanging sales to point:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// -----------------------------------------------------
	// ★ 3. メール送信処理 (ここを追加)
	// -----------------------------------------------------
	go func() {
		// ユーザー情報を取得して名前などを本文に入れると親切
		user, _ := h.db.GetUserDataByID(userID)

		subject := "【Animaloop】ポイントへの交換が完了しました"
		body := fmt.Sprintf(`
%s 様

いつもご利用ありがとうございます。
売上金からポイントへの交換が完了しました。

■ 交換内容
--------------------------------------------------
交換額　　： %d 円
交換先　　： %d ポイント
--------------------------------------------------

交換したポイントは、商品購入時に「1ポイント=1円」としてご利用いただけます。
マイページの「ポイント履歴」からもご確認いただけます。

引き続き Animaloop をよろしくお願いいたします。
`, user.Name, req.Amount, req.Amount)

		_ = function.SendEmailToUserID(h.db, userID, subject, body)
	}()
	// -----------------------------------------------------

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
