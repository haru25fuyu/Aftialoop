package handler

import (
	"animaloop/function"
	SQL "animaloop/sql"
	"animaloop/utils"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

type NotificationHandler struct {
	db *SQL.Database
}

func NewNotificationHandler(db *SQL.Database) *NotificationHandler {
	return &NotificationHandler{db: db}
}

func (h *NotificationHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/notifications", h.ListNotifications).Methods("GET")
}

func (h *NotificationHandler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	limit := utils.ParseInt(r.URL.Query().Get("limit"), 20)
	offset := utils.ParseInt(r.URL.Query().Get("offset"), 0)

	notifs, err := h.db.GetNotifications(r.Context(), userID, limit, offset)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	if notifs == nil {
		notifs = []SQL.Notification{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"items": notifs})
}
