package handler

import (
	"animaloop/function"
	"animaloop/utils"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

// 取引メッセージ関連ハンドラ

// GET /flea/transactions/{id}/messages
func (h *FleaMarketHandler) GetTXMessages(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	prID, _ := strconv.ParseUint(mux.Vars(r)["id"], 10, 64)

	// 権限チェック: この取引の当事者か？
	_, err = h.db.GetFleaPurchaseRequestByID(r.Context(), userID, prID)
	if err != nil {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	msgs, err := h.db.GetTransactionMessages(prID)
	if err != nil {
		// メッセージ0件でもエラーにはしない
		msgs = []utils.FleaTXMessage{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(msgs)
}

// POST /flea/transactions/{id}/messages
func (h *FleaMarketHandler) SendTXMessage(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	prID, _ := strconv.ParseUint(mux.Vars(r)["id"], 10, 64)

	// 権限チェック & データ取得
	// ※戻り値を txData で受け取るように変更
	txData, err := h.db.GetFleaPurchaseRequestByID(r.Context(), userID, prID)
	if err != nil {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var input struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Message == "" {
		http.Error(w, "empty message", http.StatusBadRequest)
		return
	}

	if err := h.db.CreateTransactionMessage(prID, userID, input.Message); err != nil {
		log.Println("Error sending transaction message:", err)
		http.Error(w, "failed to send", http.StatusInternalServerError)
		return
	}

	// -----------------------------------------------------
	// ★メール＆お知らせ通知 (非同期)
	// -----------------------------------------------------
	go func() {
		// 送信相手を特定 (自分が購入者なら相手は出品者、逆も然り)
		var receiverID string
		if userID == txData.BuyerID {
			receiverID = txData.SellerID
		} else {
			receiverID = txData.BuyerID
		}

		// 商品情報の取得 (商品名を表示するため)
		item, err := h.db.GetFleaMarketItemByID(userID, txData.ItemID) // userIDはどちらでも取得可と想定
		if err != nil {
			log.Println("Failed to get item for notification:", err)
			return
		}
		itemName := item.Name
		txURL := fmt.Sprintf("/flea-market/transactions/%d", prID) // フロントエンドのURLパス

		// 1. お知らせ通知 (アプリ内)
		notifTitle := "新着取引メッセージ"
		notifBody := fmt.Sprintf("取引中の商品「%s」に新着メッセージが届きました。", itemName)
		_ = h.db.CreateNotification(&receiverID, "TRANSACTION", notifTitle, notifBody, txURL)

		// 2. メール通知
		emailSubject := "【Animaloop】取引メッセージが届きました"

		// fmt.Sprintfを使うため、CSS内の % は %% と記述します
		emailBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; color: #333; line-height: 1.6;">
    <h3 style="color: #2c3e50;">新着メッセージのお知らせ</h3>
    <p>取引中の商品「<strong>%s</strong>」に新しいメッセージが届きました。<br>
    以下のボタンから内容をご確認ください。</p>
    
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #eee; margin: 20px 0;">
        <p style="margin: 0; color: #555; font-size: 14px;">メッセージ内容の一部:</p>
        <p style="margin-top: 5px; font-weight: bold; white-space: pre-wrap;">%s</p>
    </div>

    <div style="margin: 25px 0;">
        <a href="%s" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">取引画面へ移動</a>
    </div>

    <p style="color: #555; font-size: 13px;">
    ※ボタンが機能しない場合は、以下のURLをブラウザに貼り付けてください。<br>
    <a href="%[4]s" style="color: #10b981;">%[4]s</a>
    </p>

    <p style="margin-top: 20px;">引き続き Animaloop をよろしくお願いいたします。</p>
    <p style="margin-top: 20px; font-size: 12px; color: #777;">※本メールは自動送信です。</p>
</body>
</html>
`, itemName, input.Message, function.GetFrontendURL()+txURL, function.GetFrontendURL()+txURL)

		if err := function.SendEmailToUserID(h.db, receiverID, emailSubject, emailBody); err != nil {
			log.Println("Error sending message notification email:", err)
		}
	}()

	w.WriteHeader(http.StatusOK)
}
