package handler

import (
	"animaloop/function"
	SQL "animaloop/sql"
	"animaloop/utils"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

// bank Handler は /bank-account 系のエンドポイントをまとめたハンドラです
type BankHandler struct{ db *SQL.Database }

// NewBankHandler はハンドラのコンストラクタ
func NewBankHandler(db *SQL.Database) *BankHandler {
	return &BankHandler{db: db}
}

func (h *BankHandler) RegisterRoutes(r *mux.Router) {
	// 銀行口座情報取得・更新
	r.HandleFunc("/user/bank-account", h.GetBankAccount).Methods("GET")
	r.HandleFunc("/user/bank-account", h.UpdateBankAccount).Methods("POST", "PUT")
}

// GetBankAccount: ユーザーの口座情報を取得
func (h *BankHandler) GetBankAccount(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// ★ DBから取得して、Response構造体に詰める
	// (sqlパッケージ側のメソッドも、戻り値を *UserBankAccountResponse に変更するとスムーズです)
	account, err := h.db.GetUserBankAccount(userID)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		log.Printf("Failed to get bank account: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// ここでエンコードすると、JSONタグ (bankNameなど) が使われます！
	json.NewEncoder(w).Encode(account)
}

// UpdateBankAccount: 口座情報の保存
func (h *BankHandler) UpdateBankAccount(w http.ResponseWriter, r *http.Request) {
	// 1. 本物のユーザーIDを取得 (トークン認証から)
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. JSONを構造体に直接入れる (Response構造体を再利用)
	var req utils.UserBankAccountResponse
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// ============================================================
	// ★ ここが一番大事！「セキュリティ対策」
	// ============================================================
	// JSONの中に "userId": "他人" が含まれていても無視して、
	// ここで強制的に「ログイン中のユーザーID」で上書きする。
	req.UserID = userID
	// ============================================================
	log.Print(req)
	// バリデーション
	if req.BankName == "" || req.BankCode == "" || req.AccountNumber == "" || req.AccountHolderName == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// 3. そのまま保存 (SQL側で :user_id タグを読むので、上書き後の値が使われます)
	if err := h.db.UpsertUserBankAccount(&req); err != nil {
		log.Printf("Failed to upsert bank account: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
