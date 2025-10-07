package page

import (
	"animaloop/function"
	"animaloop/utils"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

// addressHandler は /address 系のエンドポイントをまとめたハンドラです
type addressHandler struct {
	db *function.Database
}

// NewAddressHandler はハンドラのコンストラクタ
func NewAddressHandler(db *function.Database) *addressHandler {
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
	token, err := function.CheckUser(h.db, w, r)
	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// トークンからIdを取得
	claims, erro := function.GetUserFromToken(token)
	if erro != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	//リクエストボディから更新情報を取得
	var address utils.Address
	erro = json.NewDecoder(r.Body).Decode(&address)
	if erro != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	address_map, erro := function.StructToMap(address)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの更新に失敗しました"})
		return
	}

	if address.ID == "" {
		// アドレスの新規保存
		address_map["UserID"] = claims.ID
		erro = h.db.SaveAddress(address_map)

	} else {
		// アドレスの更新
		erro = h.db.UpdateAddress(address.ID, address_map)
	}

	if address.Status == 1 {
		// デフォルトアドレスの更新
		erro = h.db.SetStatusAddress(claims.ID, address.ID)
	}

	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの更新に失敗しました" + erro.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "住所を更新しました"})
}

// アドレスの取得
func (h *addressHandler) GetAddress(w http.ResponseWriter, r *http.Request) {
	_, err := function.CheckUser(h.db, w, r)
	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	//　postからIDを取得
	var address utils.Address
	erro := json.NewDecoder(r.Body).Decode(&address)
	if erro != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// アドレスの取得
	addressData, erro := h.db.GetAddress(address.ID)
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
	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	//　postからIDを取得
	var address utils.Address
	erro := json.NewDecoder(r.Body).Decode(&address)
	if erro != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// アドレスの削除
	erro = h.db.DeleteAddress(address.ID)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの削除に失敗しました"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "住所を削除しました"})
}

// アドレスリストの取得
func (h *addressHandler) ListAddresses(w http.ResponseWriter, r *http.Request) {
	token, err := function.CheckUser(h.db, w, r)
	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// トークンからIdを取得
	claims, erro := function.GetUserFromToken(token)
	if erro != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// アドレスリストの取得
	addressData, erro := h.db.GetAddressList(claims.ID)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました" + erro.Error()})
		return
	}

	response := map[string]interface{}{
		"address": addressData,
		"count":   len(addressData),
		"token":   token,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
