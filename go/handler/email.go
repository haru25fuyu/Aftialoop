package handler

import (
	"animaloop/function"
	SQL "animaloop/sql"
	"animaloop/utils"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"

	"github.com/gorilla/mux"
)

type EmailHandler struct {
	db *SQL.Database
}

func NewEmailHandler(db *SQL.Database) *EmailHandler {
	return &EmailHandler{db: db}
}

func (h *EmailHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/settings/email/request", h.RequestChange).Methods("POST")
	r.HandleFunc("/settings/email/verify", h.VerifyChange).Methods("POST")
}

type EmailReq struct {
	NewEmail string `json:"new_email"`
}

type EmailVerifyReq struct {
	Code string `json:"code"`
}

// 1. 変更リクエスト (コード送信)
func (h *EmailHandler) RequestChange(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		return // CheckUser内でエラーレスポンス済み
	}

	var req EmailReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.NewEmail == "" {
		http.Error(w, "メールアドレスを入力してください", http.StatusBadRequest)
		return
	}

	// ============================================================
	// ★ 追加: Google連携済みの場合は変更不可にする
	// ============================================================
	// ユーザー自身の情報を取得
	user, err := h.db.GetUserData([]string{"id = ?"}, []interface{}{userID})
	if err != nil {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	if user.GoogleID != "" {
		http.Error(w, "Googleアカウントでログインしているため、メールアドレスは変更できません", http.StatusBadRequest)
		return
	}

	// 重複チェック: 既に誰かが使っているメールアドレスならエラー
	// (GetUserDataByEmail の実装に合わせてエラーチェックしてください)
	existingUser, err := h.db.GetUserDataByEmail(req.NewEmail)
	if err == nil && existingUser.ID != "" {
		// エラーなし ＆ IDがある ＝ 既に使われている
		http.Error(w, "このメールアドレスは既に使用されています", http.StatusConflict)
		return
	}

	// ============================================================
	// 安全な乱数生成 (crypto/rand)
	// ============================================================
	n, err := rand.Int(rand.Reader, big.NewInt(1000000)) // 0 ~ 999999
	if err != nil {
		http.Error(w, "Server Error", http.StatusInternalServerError)
		return
	}
	code := fmt.Sprintf("%06d", n.Int64())

	// Redisに保存 (ユーザーIDに紐づけて、新しいメアドとコードを保存)
	err = utils.SaveEmailChangeCode(r.Context(), userID, req.NewEmail, code)
	if err != nil {
		http.Error(w, "Redis Error", http.StatusInternalServerError)
		return
	}

	// メール送信
	subject := "【Animaloop】メールアドレス変更の認証コード"
	body := fmt.Sprintf(`
		<h2>メールアドレス変更の確認</h2>
		<p>以下の認証コードを入力して、変更を完了してください。</p>
		<p style="font-size: 24px; font-weight: bold;">%s</p>
		<p>有効期限は30分です。</p>
	`, code)

	_, err = function.SendMail(req.NewEmail, subject, body)
	if err != nil {
		http.Error(w, "メール送信失敗: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "sent"})
}

// 2. コード検証 & 更新実行
func (h *EmailHandler) VerifyChange(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		return
	}

	var req EmailVerifyReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Redisからデータを取得
	data, err := utils.GetEmailChangeData(r.Context(), userID)
	if err != nil {
		http.Error(w, "認証コードの有効期限が切れているか、無効です", http.StatusBadRequest)
		return
	}

	// コード一致確認
	if data.Code != req.Code {
		http.Error(w, "認証コードが間違っています", http.StatusUnauthorized)
		return
	}

	// DB更新
	updateUser := utils.SqlUser{
		Email: data.NewEmail,
	}
	err = h.db.UpdateUser(userID, updateUser)
	if err != nil {
		http.Error(w, "DB更新失敗", http.StatusInternalServerError)
		return
	}

	// Redisのデータを削除
	utils.DeleteEmailChangeData(r.Context(), userID)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "changed"})
}

// ---------------------------------------------------
// 3. サブアドレス登録リクエスト (認証コード送信 + メインへ通知)
// ---------------------------------------------------
func (h *EmailHandler) RequestSubEmail(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		return
	}

	var req EmailReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.NewEmail == "" {
		http.Error(w, "メールアドレスを入力してください", http.StatusBadRequest)
		return
	}

	// ============================================================
	// メインのメールアドレスを取得しておく (通知用)
	// ============================================================
	user, err := h.db.GetUserData([]string{"id = ?"}, []interface{}{userID})
	if err != nil {
		http.Error(w, "User not found", http.StatusInternalServerError)
		return
	}

	// 重複チェック
	existingUser, err := h.db.GetUserByAnyEmail(req.NewEmail)
	if err == nil && existingUser.ID != "" {
		http.Error(w, "このメールアドレスは既に登録されています", http.StatusConflict)
		return
	}

	// 認証コード生成
	n, _ := rand.Int(rand.Reader, big.NewInt(1000000))
	code := fmt.Sprintf("%06d", n.Int64())

	// Redisに保存
	err = utils.SaveSubEmailCode(r.Context(), userID, req.NewEmail, code)
	if err != nil {
		http.Error(w, "Redis Error", http.StatusInternalServerError)
		return
	}

	// ---------------------------------------------------------
	// 1. 新しいメールアドレスへ認証コードを送信
	// ---------------------------------------------------------
	go func() {
		subject := "【Animaloop】予備メールアドレスの確認コード"
		body := fmt.Sprintf(`
			<h2>予備メールアドレスの登録確認</h2>
			<p>以下の認証コードを入力して、登録を完了してください。</p>
			<p style="font-size: 24px; font-weight: bold;">%s</p>
			<p>有効期限は30分です。</p>
		`, code)
		function.SendMail(req.NewEmail, subject, body)
	}()

	// ---------------------------------------------------------
	// 2. メインのメールアドレスへセキュリティ通知を送信
	// ---------------------------------------------------------
	go func() {
		subjectMain := "【Animaloop】セキュリティ通知：予備メールアドレスの追加"
		bodyMain := fmt.Sprintf(`
			<div style="padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
				<h2 style="color: #d32f2f;">予備メールアドレス追加のお知らせ</h2>
				<p>%s 様のアカウントに、新しい予備メールアドレスの追加リクエストがありました。</p>
				<p><strong>追加しようとしているアドレス:</strong> %s</p>
				<hr>
				<p>※もしこの操作にお心当たりがない場合は、第三者がアカウントにアクセスしている可能性があります。</p>
				<p>速やかにパスワードを変更し、サポートまでご連絡ください。</p>
			</div>
		`, user.Name, req.NewEmail)

		// メインアドレス (user.Email) に送信
		function.SendMail(user.Email, subjectMain, bodyMain)
	}()

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "sent"})
}

// ---------------------------------------------------
// 4. サブアドレス登録検証 & 保存
// ---------------------------------------------------
func (h *EmailHandler) VerifySubEmail(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		return
	}

	var req EmailVerifyReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Redisから取得
	data, err := utils.GetSubEmailData(r.Context(), userID)
	if err != nil {
		http.Error(w, "認証コードの有効期限が切れているか、無効です", http.StatusBadRequest)
		return
	}

	if data.Code != req.Code {
		http.Error(w, "認証コードが間違っています", http.StatusUnauthorized)
		return
	}

	// DB更新 (サブアドレスを保存)
	err = h.db.UpdateSubEmail(userID, data.NewEmail)
	if err != nil {
		http.Error(w, "DB更新失敗", http.StatusInternalServerError)
		return
	}

	// Redis削除
	utils.DeleteSubEmailData(r.Context(), userID)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "registered"})
}
