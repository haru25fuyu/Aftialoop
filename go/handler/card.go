package handler

import (
	"animaloop/function"
	SQL "animaloop/sql"
	"animaloop/utils"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
)

type cardHandler struct {
	db *SQL.Database
}

func NewCardHandler(db *SQL.Database) *cardHandler {
	return &cardHandler{db: db}
}

func (h *cardHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/card/setup-intent", h.CreateSetupIntent).Methods("POST") // ★ 新規
	r.HandleFunc("/card/save", h.SaveCard).Methods("POST")
	r.HandleFunc("/card/charge", h.ChargeCard).Methods("POST")
	r.HandleFunc("/card/address", h.SaveCardAddress).Methods("POST")
	r.HandleFunc("/card/list", h.ListCards).Methods("POST")
	r.HandleFunc("/card/delete", h.DeleteCard).Methods("POST")
	r.HandleFunc("/card/default", h.SetDefaultCard).Methods("POST")
	r.HandleFunc("/card/address/get", h.GetCardAddress).Methods("POST")
}

// ── SetupIntent 作成（カード追加の第一ステップ） ──────────────────
func (h *cardHandler) CreateSetupIntent(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "unauthorized"})
		return
	}

	customerID, err := h.db.GetCustomerID(userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "顧客IDの取得に失敗しました"})
		return
	}

	clientSecret, err := function.CreateSetupIntent(customerID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "SetupIntentの作成に失敗しました"})
		return
	}

	// Stripe 公開鍵もフロントに渡す（任意）
	json.NewEncoder(w).Encode(map[string]string{
		"client_secret":     clientSecret,
		"stripe_public_key": os.Getenv("STRIPE_PUBLIC_KEY"),
	})
}

// ── カード保存（PaymentMethod を顧客に紐付け） ────────────────────
func (h *cardHandler) SaveCard(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "unauthorized"})
		return
	}

	var req struct {
		PaymentMethodID string `json:"paymentMethodId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PaymentMethodID == "" {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	customerID, err := h.db.GetCustomerID(userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "顧客IDの取得に失敗しました"})
		return
	}

	// Stripe に紐付け
	if err := function.AttachPaymentMethod(req.PaymentMethodID, customerID); err != nil {
		log.Printf("AttachPaymentMethod error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "カードの保存に失敗しました"})
		return
	}

	cardData, err := function.LoadUserAndCards(h.db, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "カード一覧の取得に失敗しました"})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"card": cardData})
}

// ── カード一覧取得 ─────────────────────────────────────────────────
func (h *cardHandler) ListCards(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "unauthorized"})
		return
	}

	cardData, err := function.LoadUserAndCards(h.db, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました"})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"card":  cardData,
		"count": len(cardData),
	})
}

// ── カード削除 ────────────────────────────────────────────────────
func (h *cardHandler) DeleteCard(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "unauthorized"})
		return
	}

	var req utils.RequestCharge
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	claims, err := h.db.GetUserDataByID(userID)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "unauthorized"})
		return
	}

	// DB のカード住所情報も削除
	_ = h.db.DeleteCardAddress(claims.ID, req.CardID)

	// Stripe から detach
	if err := function.DeleteCard(req.CardID); err != nil {
		log.Printf("DeleteCard error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "カードの削除に失敗しました"})
		return
	}

	cardData, err := function.LoadUserAndCards(h.db, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました"})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"card":    cardData,
		"message": "カードを削除しました",
	})
}

// ── デフォルトカード設定 ──────────────────────────────────────────
func (h *cardHandler) SetDefaultCard(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "unauthorized"})
		return
	}

	var req utils.RequestCharge
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	claims, err := h.db.GetUserDataByID(userID)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "unauthorized"})
		return
	}

	customerID, err := h.db.GetCustomerID(userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "顧客IDの取得に失敗しました"})
		return
	}

	// Stripe のデフォルト設定
	if err := function.SetDefaultPaymentMethod(customerID, req.CardID); err != nil {
		log.Printf("SetDefaultPaymentMethod error: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "デフォルトカードの設定に失敗しました"})
		return
	}

	// DB にも保存
	if err := h.db.SetDefaultCard(claims.ID, req.CardID); err != nil {
		log.Printf("DB SetDefaultCard error: %v", err)
	}

	cardData, err := function.LoadUserAndCards(h.db, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました"})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"card":    cardData,
		"message": "デフォルトカードを設定しました",
	})
}

// ── カード住所の保存・取得（既存のまま流用） ──────────────────────
func (h *cardHandler) SaveCardAddress(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "unauthorized"})
		return
	}

	var req utils.RequestCardWithAddress
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.db.SaveOrUpdateCardAddress(userID, req.CardID, req.AddressID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "住所の保存に失敗しました"})
		return
	}

	cardData, err := function.LoadUserAndCards(h.db, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました"})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"card": cardData})
}

func (h *cardHandler) GetCardAddress(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "unauthorized"})
		return
	}

	var req utils.RequestCharge
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	addressData, err := h.db.GetCardAddress(userID, req.CardID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました"})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"address": addressData})
}

// ── 決済（フリマ・EC 共通） ───────────────────────────────────────
// ※ flea_transactions.go の ChargeCard 呼び出し部分も同じシグネチャで動作する
func (h *cardHandler) ChargeCard(w http.ResponseWriter, r *http.Request) {
	// EC 用決済エンドポイント（フリマは flea_transactions.go で処理）
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "unauthorized"})
		return
	}

	var req utils.RequestCharge
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	user, err := h.db.GetUserDataWithCustomerIDByID(userID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザーが見つかりません"})
		return
	}

	paymentID, err := function.ChargeCard(
		user.CustomerID,
		req.CardID,
		req.IdempotencyKey,
		float64(req.Amount),
	)
	if err != nil {
		log.Printf("ChargeCard error: %v", err)
		w.WriteHeader(http.StatusPaymentRequired)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "決済に失敗しました"})
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"payment_id": paymentID})
}
