package handler

import (
	"animaloop/function"
	SQL "animaloop/sql"
	"animaloop/utils"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

// 他のハンドラーと同じ構造にする
type SMSHandler struct {
	db *SQL.Database
}

// コンストラクタ
func NewSMSHandler(db *SQL.Database) *SMSHandler {
	return &SMSHandler{db: db}
}

// ルーティング登録 (main.goから呼ばれる)
func (h *SMSHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/sms/send", h.SendSMS).Methods("POST")
	r.HandleFunc("/sms/verify", h.VerifySMS).Methods("POST")
}

// リクエストの型定義
type PhoneReq struct {
	PhoneNumber string `json:"phone_number"`
}

type VerifyReq struct {
	PhoneNumber string `json:"phone_number"`
	Code        string `json:"code"`
}

// 1. SMS送信ハンドラー
func (h *SMSHandler) SendSMS(w http.ResponseWriter, r *http.Request) {
	_, err := function.CheckUser(h.db, w, r)

	if err != nil {
		log.Println("Unauthorized access attempt to SendSMS:", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req PhoneReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Println("JSON decode error in SendSMS:", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// 電話番号の整形 (+81...)
	formattedPhone := function.FormatPhoneNumber(req.PhoneNumber)

	// DBにその電話番号を持つユーザーがいるか検索
	IsDuplicate, err := h.db.IsPhoneNumberDuplicate(formattedPhone)

	if IsDuplicate {
		// 既に使われている電話番号の場合は400を返す
		log.Printf("Phone number %s is already in use", formattedPhone)
		http.Error(w, "Phone number already in use", http.StatusBadRequest)
		return
	}

	if err != nil {
		// DBエラーの場合は500を返す
		log.Printf("DB error while checking phone number %s: %v", formattedPhone, err)
		http.Error(w, "Server Error (DB Check)", http.StatusInternalServerError)
		return
	}

	// ============================================================

	// 6桁コード生成
	rand.Seed(time.Now().UnixNano())
	code := fmt.Sprintf("%06d", rand.Intn(1000000))

	// Redisに保存
	err = utils.SaveAuthCode(r.Context(), formattedPhone, code)
	if err != nil {
		log.Printf("Redis error while saving auth code for phone number %s: %v", formattedPhone, err)
		http.Error(w, "Server Error (Redis)", http.StatusInternalServerError)
		return
	}

	// AWS SNSで送信
	err = function.SendSMS(formattedPhone, "認証コード: "+code)
	if err != nil {
		log.Printf("SMS sending error for phone number %s: %v", formattedPhone, err)
		http.Error(w, "SMS Send Error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "sent"})
}

// ---------------------------------------------------
// 2. コード検証 & DB更新ハンドラー
// ---------------------------------------------------
func (h *SMSHandler) VerifySMS(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)

	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	var req VerifyReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	formattedPhone := function.FormatPhoneNumber(req.PhoneNumber)

	// Redisでコード確認
	success, err := utils.VerifyAuthCode(r.Context(), formattedPhone, req.Code)
	if err != nil {
		http.Error(w, "Verification Error", http.StatusInternalServerError)
		return
	}
	if !success {
		http.Error(w, "Invalid code or expired", http.StatusUnauthorized)
		return
	}

	// ユーザー情報を更新 (本人確認完了ステータスへ)
	err = h.db.UpdatePhoneNumber(userID, formattedPhone)

	if err != nil {
		log.Printf("DB update error for user %d and phone number %s: %v", userID, formattedPhone, err)
		http.Error(w, "DB Update Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "verified"})
}
