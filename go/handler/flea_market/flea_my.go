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
	// 3. メール送信処理
	go func() {
		// ユーザー情報を取得
		user, _ := h.db.GetUserDataByID(userID)

		subject := "【Animaloop】ポイントへの交換が完了しました"

		// fmt.Sprintfを使うため、CSS内の % は %% と記述します
		body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; color: #333; line-height: 1.6;">
    <h3 style="color: #2c3e50;">ポイントへの交換が完了しました</h3>
    <p>%s 様</p>
    <p>いつもご利用ありがとうございます。<br>
    売上金からポイントへの交換が完了しました。</p>

    <table style="width: 100%%; max-width: 600px; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
        <tr>
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #eee; width: 140px; background-color: #f8f9fa;">交換額</th>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">%d 円</td>
        </tr>
        <tr>
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #eee; background-color: #f8f9fa;">交換先</th>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">%d ポイント</td>
        </tr>
    </table>

    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #dcfce7; color: #166534;">
        <p style="margin-top: 0; font-weight: bold;">【ポイントのご利用について】</p>
        <p style="margin-bottom: 0;">交換したポイントは、商品購入時に「1ポイント=1円」としてご利用いただけます。<br>
        現在のポイント残高はマイページの「ポイント履歴」からご確認いただけます。</p>
    </div>

    <p style="margin-top: 20px;">引き続き Animaloop をよろしくお願いいたします。</p>
    <p style="margin-top: 20px; font-size: 12px; color: #777;">※本メールは自動送信です。</p>
</body>
</html>
`, user.Name, req.Amount, req.Amount)

		_ = function.SendEmailToUserID(h.db, userID, subject, body)
	}()
	// -----------------------------------------------------

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
