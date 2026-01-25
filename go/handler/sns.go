package handler

import (
	"animaloop/function"
	SQL "animaloop/sql"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

type SNSHandler struct {
	db *SQL.Database
}

func NewSNSHandler(db *SQL.Database) *SNSHandler {
	return &SNSHandler{db: db}
}

// ルーティング登録
func (h *SNSHandler) RegisterRoutes(r *mux.Router) {
	// フォロー系
	r.HandleFunc("/sns/users/{id}/follow", h.FollowUser).Methods("POST")
	r.HandleFunc("/sns/users/{id}/unfollow", h.UnfollowUser).Methods("POST")

	// 投稿系 (これから作る)
	// r.HandleFunc("/sns/posts", h.CreatePost).Methods("POST")
	// r.HandleFunc("/sns/timeline", h.GetTimeline).Methods("GET")
}

// フォローする
func (h *SNSHandler) FollowUser(w http.ResponseWriter, r *http.Request) {
	followerID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	followingID := vars["id"]

	if followerID == followingID {
		http.Error(w, "cannot follow yourself", http.StatusBadRequest)
		return
	}

	if err := h.db.FollowUser(followerID, followingID); err != nil {
		http.Error(w, "failed to follow", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "followed"})
}

// フォロー解除
func (h *SNSHandler) UnfollowUser(w http.ResponseWriter, r *http.Request) {
	followerID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	followingID := vars["id"]

	if err := h.db.UnfollowUser(followerID, followingID); err != nil {
		http.Error(w, "failed to unfollow", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "unfollowed"})
}
