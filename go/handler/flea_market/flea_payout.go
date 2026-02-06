package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"animaloop/config"
	"animaloop/function"
)

type PayoutRequest struct {
	Amount int `json:"amount"` // 申請したい総額（手数料込み）
}

// CreatePayoutRequest: 振込申請を行う
func (h *FleaMarketHandler) CreatePayoutRequest(w http.ResponseWriter, r *http.Request) {
	// 1. 認証
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		log.Println("Unauthorized access attempt")
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := h.db.GetUserDataByID(userID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	if user.IdentityStatus != config.IdentityStatusApproved {
		// 専用のエラーメッセージを返す
		http.Error(w, "identity_verification_required", http.StatusForbidden)
		return
	}

	// 2. 入力受け取り
	var req PayoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	cfg := config.GetFleaConfig()

	// 3. バリデーション
	if req.Amount < int(cfg.MinPayoutAmount) {
		http.Error(w, "amount too low", http.StatusBadRequest)
		return
	}

	// 4. DB処理 (トランザクション)
	ctx := r.Context()
	fee := int(cfg.TransferFee)

	err = h.db.CreatePayoutRequest(ctx, userID, req.Amount, fee)
	if err != nil {
		log.Println("Error creating payout request:", err)
		// エラーメッセージの出し分け (簡易的)
		if err.Error() == "insufficient balance" {
			http.Error(w, "insufficient balance", http.StatusBadRequest)
		} else if err.Error() == "bank account not registered" {
			http.Error(w, "bank account required", http.StatusBadRequest)
		} else {
			http.Error(w, "internal server error", http.StatusInternalServerError)
		}
		return
	}

	// -----------------------------------------------------
	// 5. メール送信 (非同期)
	// -----------------------------------------------------
	// 5. メール送信 (非同期)
	go func() {
		user, _ := h.db.GetUserDataByID(userID)
		// 振込先銀行名を取得するために再度DB叩くか、上記のCreatePayoutRequestで戻り値として返す等の工夫も可
		// ここでは簡易的に「登録口座」と表現します

		transferAmount := req.Amount - fee

		subject := "【Animaloop】振込申請を受け付けました"

		// fmt.Sprintfを使うため、CSS内の % は %% と記述します
		body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; color: #333; line-height: 1.6;">
    <h3 style="color: #2c3e50;">振込申請を受け付けました</h3>
    <p>%s 様</p>
    <p>いつもご利用ありがとうございます。<br>
    売上金の振込申請を受け付けました。</p>

    <table style="width: 100%%; max-width: 600px; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
        <tr>
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #eee; width: 140px; background-color: #f8f9fa;">申請金額</th>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">%d 円</td>
        </tr>
        <tr>
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #eee; background-color: #f8f9fa;">振込手数料</th>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">%d 円</td>
        </tr>
        <tr>
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #eee; background-color: #f8f9fa;">振込予定額</th>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">%d 円</td>
        </tr>
    </table>

    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
        <p style="margin-top: 0; font-weight: bold; color: #555;">【振込について】</p>
        <p style="margin-bottom: 0;">振込手続きには数日かかる場合がございます。<br>
        振込完了時に改めて通知いたしますので、今しばらくお待ちください。</p>
    </div>

    <p style="margin-top: 20px;">引き続き Animaloop をよろしくお願いいたします。</p>
    <p style="margin-top: 20px; font-size: 12px; color: #777;">※本メールは自動送信です。</p>
</body>
</html>
`, user.Name, req.Amount, fee, transferAmount)

		_ = function.SendEmailToUserID(h.db, userID, subject, body)
	}()

	// 6. 完了レスポンス
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
