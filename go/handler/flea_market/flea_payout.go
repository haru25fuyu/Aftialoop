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
	go func() {
		user, _ := h.db.GetUserDataByID(userID)
		// 振込先銀行名を取得するために再度DB叩くか、上記のCreatePayoutRequestで戻り値として返す等の工夫も可
		// ここでは簡易的に「登録口座」と表現します

		transferAmount := req.Amount - fee

		subject := "【Animaloop】振込申請を受け付けました"
		body := fmt.Sprintf(`
%s 様

いつもご利用ありがとうございます。
売上金の振込申請を受け付けました。

■ 申請内容
--------------------------------------------------
申請金額　　： %d 円
振込手数料　： %d 円
振込予定額　： %d 円
--------------------------------------------------

※ 振込手続きには数日かかる場合がございます。
※ 振込完了時に改めて通知いたします。

引き続き Animaloop をよろしくお願いいたします。
`, user.Name, req.Amount, fee, transferAmount)

		_ = function.SendEmailToUserID(h.db, userID, subject, body)
	}()

	// 6. 完了レスポンス
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
