package handler

import (
	"animaloop/function"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// ---------------------------------------------------------
// レスポンス用構造体
// ---------------------------------------------------------
type SalesHistoryResponse struct {
	Balance   int64              `json:"balance"`   // 現在の残高
	Histories []SalesHistoryItem `json:"histories"` // 履歴リスト
}

type SalesHistoryItem struct {
	ID              uint64 `json:"id"`
	Type            string `json:"type"`             // SALE, WITHDRAWAL, etc.
	Amount          int64  `json:"amount"`           // 変動額 (+1000, -500)
	BalanceSnapshot int64  `json:"balance_snapshot"` // その時点の残高
	Note            string `json:"note"`             // "商品ID:123の売上" など
	CreatedAt       string `json:"created_at"`
}

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
	var currentBalance int64
	err = h.db.DB.QueryRow("SELECT sales_balance FROM users WHERE id = ?", userID).Scan(&currentBalance)
	if err != nil {
		log.Println("Error fetching balance:", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	// 3. 履歴を取得 (sales_historiesテーブル)
	rows, err := h.db.DB.Query(`
        SELECT id, type, amount, balance_snapshot, note, created_at 
        FROM sales_histories 
        WHERE user_id = ? 
        ORDER BY created_at DESC
        LIMIT 50
    `, userID)
	if err != nil {
		log.Println("Error fetching history:", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var histories []SalesHistoryItem
	for rows.Next() {
		var item SalesHistoryItem
		var createdAt time.Time
		if err := rows.Scan(&item.ID, &item.Type, &item.Amount, &item.BalanceSnapshot, &item.Note, &createdAt); err != nil {
			continue
		}
		item.CreatedAt = createdAt.Format(time.RFC3339)
		histories = append(histories, item)
	}

	// 4. レスポンス
	resp := SalesHistoryResponse{
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
	if err != nil { /* ... */
	}

	var req ExchangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { /* ... */
	}

	// 2. DB更新処理 (売上減らす & ポイント増やす)
	ctx := r.Context()
	err = h.db.ExchangeSalesToPoint(ctx, userID, req.Amount)
	if err != nil {
		// エラーハンドリング (残高不足など)
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
