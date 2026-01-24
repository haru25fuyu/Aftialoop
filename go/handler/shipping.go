package handler

import (
	"animaloop/config"
	"animaloop/function"
	SQL "animaloop/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
)

// shippingHandler は /shipping 系
type shippingHandler struct {
	db *SQL.Database
}

func NewShippingHandler(db *SQL.Database) *shippingHandler {
	return &shippingHandler{db: db}
}

func (h *shippingHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/shipping/estimate", h.Estimate).Methods("POST")
}

type estimateReq struct {
	Carrier          string `json:"carrier"`            // "YAMATO" | "JP"
	Temp             string `json:"temp"`               // "AMBIENT" | "CHILLED" | "FROZEN"
	Size             int    `json:"size"`               // 60/80/100/120/140...
	SenderPrefCode   int    `json:"sender_pref_code"`   // 1..47
	ReceiverPrefCode int    `json:"receiver_pref_code"` // 1..47
}

type estimateRes struct {
	Price int `json:"price"`
}

func (h *shippingHandler) Estimate(w http.ResponseWriter, r *http.Request) {
	// 認証を必須にするならこれ（不要なら削ってOK）
	_, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"err_message": "unauthorized"})
		return
	}

	var req estimateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Println("Estimate request:", req)

	// normalize
	req.Carrier = strings.TrimSpace(strings.ToUpper(req.Carrier))
	req.Temp = strings.TrimSpace(strings.ToUpper(req.Temp))

	if err := validateEstimateReq(req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"err_message": err.Error()})
		return
	}

	price, err := h.db.EstimateShippingPrice(r.Context(), req.Carrier, req.Temp, req.Size, req.SenderPrefCode, req.ReceiverPrefCode)
	if err != nil {
		// 見つからない/未設定を 404 にするか 200で0返すかは好み
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"err_message": err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(estimateRes{Price: price})
}

func validateEstimateReq(req estimateReq) error {
	if req.Carrier != config.CarrierYamato && req.Carrier != config.CarrierJP {
		return errors.New("invalid carrier")
	}
	if req.Temp != "AMBIENT" && req.Temp != "CHILLED" && req.Temp != "FROZEN" {
		return errors.New("invalid temp")
	}
	if req.SenderPrefCode < 1 || req.SenderPrefCode > 47 || req.ReceiverPrefCode < 1 || req.ReceiverPrefCode > 47 {
		return errors.New("invalid pref code")
	}
	switch req.Size {
	case 60, 80, 100, 120, 140:
		return nil
	default:
		return errors.New("invalid size")
	}
}
