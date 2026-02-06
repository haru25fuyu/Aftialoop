package handler

import (
	"animaloop/function"
	SQL "animaloop/sql"
	"animaloop/utils"
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

	//  通報・ブロック
	r.HandleFunc("/sns/users/{id}/report", h.ReportUser).Methods("POST")
	r.HandleFunc("/sns/users/{id}/block", h.BlockUser).Methods("POST")
	r.HandleFunc("/sns/blocks", h.GetBlockedList).Methods("GET")
	r.HandleFunc("/sns/users/{id}/block", h.UnblockUser).Methods("DELETE")
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

// リクエストボディ受け取り用
type ReportRequest struct {
	Reason  string `json:"reason"`
	Details string `json:"details"`
}

// 通報
func (h *SNSHandler) ReportUser(w http.ResponseWriter, r *http.Request) {
	// 1. ログインチェック
	reporterID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		return
	}

	// 2. パラメータ取得
	vars := mux.Vars(r)
	reportedID := vars["id"]

	// 3. Bodyの読み込み
	var req ReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// 4. DB登録
	if err := h.db.ReportUser(r.Context(), reporterID, reportedID, req.Reason, req.Details); err != nil {
		log.Println("Report error:", err)
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "reported"})
}

// ブロック
func (h *SNSHandler) BlockUser(w http.ResponseWriter, r *http.Request) {
	// 1. ログインチェック
	blockerID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		return
	}

	// 2. パラメータ取得
	vars := mux.Vars(r)
	blockedID := vars["id"]

	if blockerID == blockedID {
		http.Error(w, "cannot block yourself", http.StatusBadRequest)
		return
	}

	// 3. DB登録
	if err := h.db.BlockUser(r.Context(), blockerID, blockedID); err != nil {
		log.Println("Block error:", err)
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "blocked"})
}

// ブロックリスト取得
func (h *SNSHandler) GetBlockedList(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		return
	}

	users, err := h.db.GetBlockedUsers(r.Context(), userID)
	if err != nil {
		log.Println("GetBlockedList error:", err)
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	// nullの場合は空配列を返す
	if users == nil {
		users = []utils.User{}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(users)
}

// ブロック解除
func (h *SNSHandler) UnblockUser(w http.ResponseWriter, r *http.Request) {
	blockerID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		return
	}

	vars := mux.Vars(r)
	blockedID := vars["id"]

	if err := h.db.UnblockUser(r.Context(), blockerID, blockedID); err != nil {
		log.Println("Unblock error:", err)
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "unblocked"})
}
