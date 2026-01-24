package handler

import (
	"animaloop/function"
	SQL "animaloop/sql"
	"animaloop/utils"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

// addressHandler は /address 系のエンドポイントをまとめたハンドラです
type addressHandler struct {
	db *SQL.Database
}

// NewAddressHandler はハンドラのコンストラクタ
func NewAddressHandler(db *SQL.Database) *addressHandler {
	return &addressHandler{
		db: db,
	}
}

// RegisterRoutes がルーティングの登録を行います
func (h *addressHandler) RegisterRoutes(r *mux.Router) {
	// POST /address/edit
	r.HandleFunc("/address/edit", h.EditAddress).Methods("POST")
	// GET /address
	r.HandleFunc("/address/get", h.GetAddress).Methods("POST")
	// DELETE /address
	r.HandleFunc("/address/delete", h.DeleteAddress).Methods("POST")
	// GET /address/list
	r.HandleFunc("/address/list", h.ListAddresses).Methods("POST")
}

// アドレスの更新
func (h *addressHandler) EditAddress(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	//リクエストボディから更新情報を取得
	var address utils.Address
	err = json.NewDecoder(r.Body).Decode(&address)
	if err != nil {
		log.Println("Error decoding request body:", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	address.UserID = user_id

	if address.ID == nil || *address.ID == "" {
		// 新規アドレスの追加
		err = h.db.AddAddress(&address)
	} else {
		// アドレスの更新
		err = h.db.UpdateAddress(user_id, *address.ID, &address)
	}

	if address.Status != nil && *address.Status == true {
		// デフォルトアドレスの更新
		err = h.db.SetStatusAddress(user_id, *address.ID)
	}

	if err != nil {
		log.Println("Error updating address:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの更新に失敗しました" + err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "住所を更新しました"})
}

// アドレスの取得
func (h *addressHandler) GetAddress(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	//　postからIDを取得
	var address utils.Address
	err = json.NewDecoder(r.Body).Decode(&address)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	address_id, err := strconv.ParseUint(*address.ID, 10, 64)
	if err != nil {
		http.Error(w, "Invalid address ID", http.StatusBadRequest)
		return
	}

	// アドレスの取得
	addressData, erro := h.db.GetAddress(address_id, user_id)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました" + erro.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(addressData)
}

// アドレスの削除
func (h *addressHandler) DeleteAddress(w http.ResponseWriter, r *http.Request) {
	_, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	//　postからIDを取得
	var address utils.Address
	err = json.NewDecoder(r.Body).Decode(&address)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// アドレスの削除
	err = h.db.DeleteAddress(*address.ID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの削除に失敗しました"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "住所を削除しました"})
}

// アドレスリストの取得
func (h *addressHandler) ListAddresses(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// アドレスリストの取得
	addressData, err := h.db.GetAddressList(user_id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました" + err.Error()})
		return
	}

	response := map[string]interface{}{
		"address": addressData,
		"count":   len(addressData),
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
