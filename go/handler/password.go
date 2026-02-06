package handler

import (
	"animaloop/function"
	SQL "animaloop/sql"
	"animaloop/utils"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

type PasswordHandler struct {
	db *SQL.Database
}

func NewPasswordHandler(db *SQL.Database) *PasswordHandler {
	return &PasswordHandler{db: db}
}

// ルーティング登録
func (h *PasswordHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/user/password/change", h.ChangePassword).Methods("POST")

	r.HandleFunc("/password-reset/request", h.RequestReset).Methods("POST")
	r.HandleFunc("/password-reset/execute", h.ExecuteReset).Methods("POST")
}

// ① リセット申請 (メール送信)
func (h *PasswordHandler) RequestReset(w http.ResponseWriter, r *http.Request) {
	var input utils.RequestResetPasswordInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid format", http.StatusBadRequest)
		return
	}

	// 1. Emailからユーザー確認
	user, err := h.db.GetUserData([]string{"Email = ?"}, []interface{}{input.Email})
	if err != nil || user.ID == "" {
		// セキュリティ上、存在しなくても成功風に返す
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "確認メールを送信しました"})
		return
	}

	// 2. トークン生成 (function.MustRandomを活用)
	token := function.MustRandom(32)

	// 3. Redis保存
	ctx := r.Context()
	if err := utils.SavePasswordResetToken(ctx, token, user.ID); err != nil {
		http.Error(w, "Server Error", http.StatusInternalServerError)
		return
	}

	// 4. メール送信
	// フロントエンドのURLを取得 (function.goにある関数を活用)
	url := fmt.Sprintf("%s/reset-password?token=%s", function.GetFrontendURL(), token)

	subject := "【Animaloop】パスワード再設定のお知らせ"
	htmlContent := fmt.Sprintf(`
		<div style="padding: 20px; border: 1px solid #eee; border-radius: 8px;">
			<h2>パスワードの再設定</h2>
			<p>以下のリンクをクリックしてパスワードを再設定してください。</p>
			<p><a href="%s" style="color: #007bff;">パスワードをリセットする</a></p>
			<p style="font-size: 12px; color: #777;">有効期限は30分です。</p>
		</div>
	`, url)

	go function.SendMail(input.Email, subject, htmlContent)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "確認メールを送信しました"})
}

// ② パスワード更新実行
func (h *PasswordHandler) ExecuteReset(w http.ResponseWriter, r *http.Request) {
	var input utils.ExecutePasswordResetInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid format", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	// 1. Redisトークン検証
	userID, err := utils.GetUserIDByResetToken(ctx, input.Token)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "リンクが無効か期限切れです"})
		return
	}

	// 2. パスワードハッシュ化 (function.HashPasswordを活用)
	hashed, err := function.HashPassword(input.NewPassword)
	if err != nil {
		http.Error(w, "Server Error", http.StatusInternalServerError)
		return
	}

	// 3. DB更新 (sqlx.Execを使用)
	// NULL問題修正済みの password カラムを更新
	_, err = h.db.DB.Exec("UPDATE users SET password = ? WHERE id = ?", hashed, userID)
	if err != nil {
		http.Error(w, "Database Error", http.StatusInternalServerError)
		return
	}

	// 4. トークン削除
	utils.DeletePasswordResetToken(ctx, input.Token)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "パスワードを変更しました"})
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// パスワード変更処理
// go/handler/userData.go
func (h *PasswordHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 1. DBから現在のパスワードハッシュを取得
	storedHash, err := h.db.GetUserPasswordByID(userID)
	if err != nil {
		log.Println("パスワード取得エラー:", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// ★ロジック変更: パスワードが設定されている場合のみ、現在のパスワードをチェック
	if storedHash != "" {
		// 現在のパスワードが空ならエラー
		if req.CurrentPassword == "" {
			http.Error(w, "現在のパスワードを入力してください", http.StatusBadRequest)
			return
		}
		// パスワード不一致ならエラー
		if err := function.ComparePassword(storedHash, req.CurrentPassword); err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "現在のパスワードが間違っています"})
			return
		}
	}
	// storedHash == "" の場合（Googleのみ等の場合）は、ここをスルーして新規設定に進む

	// バリデーション (新規パスワード)
	if req.NewPassword == "" || len(req.NewPassword) < 8 {
		http.Error(w, "新しいパスワードは8文字以上で設定してください", http.StatusBadRequest)
		return
	}

	// 3. 新しいパスワードをハッシュ化
	newHash, err := function.HashPassword(req.NewPassword)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// 4. 更新実行
	updateData := utils.SqlUser{
		Password: newHash,
	}
	if err := h.db.UpdateUser(userID, updateData); err != nil {
		log.Println("パスワード更新エラー:", err)
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "パスワードを設定しました"})
}
