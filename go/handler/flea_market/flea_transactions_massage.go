package handler

import (
	"animaloop/function"
	"animaloop/utils"
	"encoding/json"
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

	// 権限チェック
	_, err = h.db.GetFleaPurchaseRequestByID(r.Context(), userID, prID)
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

	// TODO: ここで相手に「新着メッセージがあります」メールを送ると親切

	w.WriteHeader(http.StatusOK)
}
