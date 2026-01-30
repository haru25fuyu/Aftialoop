package handler

import (
	"animaloop/function"
	SQL "animaloop/sql"
	"encoding/json"
	"log"
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
	// フロントエンドに合わせてパスとメソッドを修正しました
	// POST /sns/users/{id}/follow   -> フォローする
	// DELETE /sns/users/{id}/follow -> フォロー解除
	r.HandleFunc("/sns/users/{id}/follow", h.FollowUser).Methods("POST")
	r.HandleFunc("/sns/users/{id}/follow", h.UnfollowUser).Methods("DELETE")

	// 投稿系 (予定)
	// r.HandleFunc("/sns/posts", h.CreatePost).Methods("POST")
	// r.HandleFunc("/sns/timeline", h.GetTimeline).Methods("GET")
}

// フォローする
func (h *SNSHandler) FollowUser(w http.ResponseWriter, r *http.Request) {
	// 1. ログインユーザーチェック
	followerID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		// CheckUser内でエラーレスポンス済みなら不要だが、念のため
		return
	}

	vars := mux.Vars(r)
	followingID := vars["id"]

	// 自分自身はフォローできない
	if followerID == followingID {
		http.Error(w, "cannot follow yourself", http.StatusBadRequest)
		return
	}

	// 2. DB実行 (r.Context() を渡す！)
	if err := h.db.FollowUser(r.Context(), followerID, followingID); err != nil {
		http.Error(w, "failed to follow", http.StatusInternalServerError)
		return
	}
	log.Printf("User %s followed user %s", followerID, followingID)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "followed"})
}

// フォロー解除
func (h *SNSHandler) UnfollowUser(w http.ResponseWriter, r *http.Request) {
	followerID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		return
	}

	vars := mux.Vars(r)
	followingID := vars["id"]

	// DB実行 (r.Context() を渡す！)
	if err := h.db.UnfollowUser(r.Context(), followerID, followingID); err != nil {
		http.Error(w, "failed to unfollow", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "unfollowed"})
}
