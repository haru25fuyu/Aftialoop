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
		if item.UserID == user_id {
			//出品者からのメッセージ
			userIDs, err := h.db.GetFleaItemMessageUserIDs(itemID, user_id)
			if err != nil {
				log.Println("failed to get message user ids for notification:", err)
			} else {
				subject := "【Animaloop】コメントした商品へのメッセージ通知"
				hbody := fmt.Sprintf("あなたがコメントした商品「%s」にメッセージが届きました。Animaloopにログインして確認してください。\n\n商品URL: https://animaloop.com/flea-market/item/%d", item.Name, item.ID)
				//通知メールの送信
				for _, toUserID := range userIDs {
					go function.SendEmailToUserID(h.db, toUserID, subject, hbody)
				}
			}
		} else {
			subject := "【Animaloop】出品した商品へのメッセージ通知"
			hbody := fmt.Sprintf("あなたが出品した商品「%s」にメッセージが届きました。Animaloopにログインして確認してください。\n\n商品URL: https://animaloop.com/flea-market/item/%d", item.Name, item.ID)
			//購入希望者からのメッセージ
			go function.SendEmailToUserID(h.db, item.UserID, subject, hbody)
		}
	}

	json.NewEncoder(w).Encode(map[string]any{
		"id":              newID,
		"userId":          user_id,
		"parentMessageId": req.ParentMessageID,
		"body":            req.Body,
		"createdAt":       time.Now().UTC().Format(time.RFC3339),
	})
}
