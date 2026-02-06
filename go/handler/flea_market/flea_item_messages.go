package handler

import (
	"animaloop/function"
	"animaloop/utils"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

func (h *FleaMarketHandler) GetFleaMarketItemMessages(w http.ResponseWriter, r *http.Request) {
	// --- itemID の取得 ---
	itemIDStr := mux.Vars(r)["id"]
	itemID, err := strconv.ParseUint(itemIDStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid item_id", http.StatusBadRequest)
		return
	}

	// --- DBからメッセージ一覧を取得 ---
	messages, err := h.db.GetFleaItemMessages(itemID)
	if err != nil {
		log.Println("failed to get flea item messages:", err)
		http.Error(w, "failed to fetch messages", http.StatusInternalServerError)
		return
	}

	// --- レスポンス ---
	resp := map[string]any{
		"messages": messages,
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *FleaMarketHandler) AddFleaMarketItemMessage(w http.ResponseWriter, r *http.Request) {
	itemIDStr := mux.Vars(r)["id"]
	itemID, err := strconv.ParseUint(itemIDStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid item id", http.StatusBadRequest)
		return
	}

	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil || user_id == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": err.Error()})
		return
	}

	var req utils.AddMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad json", http.StatusBadRequest)
		return
	}

	newID, err := h.db.AddFleaItemMessage(itemID, user_id, req.ParentMessageID, req.Body)
	if err != nil {
		log.Println("failed insert:", err)
		http.Error(w, "insert failed", 500)
		return
	}

	//　通知の送信(初期メールのみ)
	// 出品者からのメッセージなら購入希望者へ(過去にメッセージを送っている人全員に)
	// 購入希望者からのメッセージなら出品者へ
	//商品情報の取得
	item, err := h.db.GetFleaMarketItemByID(user_id, itemID)
	if err != nil {
		log.Println("failed to get item for notification:", err)
	} else {
		// 通知処理
		if item.UserID == user_id {
			// ---------------------------------------------------------
			// A. 出品者からのメッセージ -> コメント済みのユーザーへ通知
			// ---------------------------------------------------------
			userIDs, err := h.db.GetFleaItemMessageUserIDs(itemID, user_id)
			if err != nil {
				log.Println("failed to get message user ids for notification:", err)
			} else {
				subject := "【Animaloop】コメントした商品に新着メッセージがあります"
				itemURL := fmt.Sprintf("%s/flea-market/item/%d", function.GetFrontendURL(), item.ID)

				hbody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; color: #333; line-height: 1.6;">
	<h3 style="color: #2c3e50;">新着メッセージのお知らせ</h3>
	<p>あなたがコメントした商品「<strong>%s</strong>」に出品者からメッセージが届きました。<br>
	以下のボタンから内容をご確認ください。</p>
	
	<div style="margin: 25px 0;">
		<a href="%s" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">メッセージを確認する</a>
	</div>

	<p style="color: #555; font-size: 13px;">
	※ボタンが機能しない場合は、以下のURLをブラウザに貼り付けてください。<br>
	<a href="%[2]s" style="color: #10b981;">%[2]s</a>
	</p>

	<p style="margin-top: 20px; font-size: 12px; color: #777;">※本メールは自動送信です。</p>
</body>
</html>
`, item.Name, itemURL)

				// 対象ユーザー全員に送信
				for _, toUserID := range userIDs {
					go function.SendEmailToUserID(h.db, toUserID, subject, hbody)
				}
			}
		} else {
			// ---------------------------------------------------------
			// B. 購入希望者からのメッセージ -> 出品者へ通知
			// ---------------------------------------------------------
			subject := "【Animaloop】出品した商品に新着メッセージがあります"
			itemURL := fmt.Sprintf("%s/flea-market/item/%d", function.GetFrontendURL(), item.ID)

			hbody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; color: #333; line-height: 1.6;">
	<h3 style="color: #2c3e50;">新着メッセージのお知らせ</h3>
	<p>あなたが出品した商品「<strong>%s</strong>」に新しいメッセージが届きました。<br>
	以下のボタンから内容をご確認ください。</p>
	
	<div style="margin: 25px 0;">
		<a href="%s" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">メッセージを確認する</a>
	</div>

	<p style="color: #555; font-size: 13px;">
	※ボタンが機能しない場合は、以下のURLをブラウザに貼り付けてください。<br>
	<a href="%[2]s" style="color: #10b981;">%[2]s</a>
	</p>

	<p style="margin-top: 20px; font-size: 12px; color: #777;">※本メールは自動送信です。</p>
</body>
</html>
`, item.Name, itemURL)

			go function.SendEmailToUserID(h.db, item.UserID, subject, hbody)
		}
		// 商品の持ち主へ通知
		title := "新着コメント"
		body := item.Name + " にコメントがつきました。"
		url := fmt.Sprintf("/flea-market/item/%d", item.ID)
		h.db.CreateNotification(&item.UserID, "COMMENT", title, body, url)
	}

	json.NewEncoder(w).Encode(map[string]any{
		"id":              newID,
		"userId":          user_id,
		"parentMessageId": req.ParentMessageID,
		"body":            req.Body,
		"createdAt":       time.Now().UTC().Format(time.RFC3339),
	})
}
