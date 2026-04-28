package handler

import (
	"animaloop/function"
	SQL "animaloop/sql"
	"animaloop/utils"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// LoginHandler は /login 系のエンドポイントをまとめたハンドラです
//
//	大文字 LoginHandler に統一
type LoginHandler struct {
	db *SQL.Database
}

// NewLoginHandler はハンドラのコンストラクタ
func NewLoginHandler(db *SQL.Database) *LoginHandler {
	return &LoginHandler{
		db: db,
	}
}

// RegisterRoutes がルーティングの登録を行います
func (h *LoginHandler) RegisterRoutes(r *mux.Router) {
	// POST /login
	r.HandleFunc("/login", h.Login).Methods("POST")
	// POST /auth/google
	r.HandleFunc("/auth/google", h.googleLogin).Methods("POST")
}

// 通常ログイン (Email/Password)
func (h *LoginHandler) Login(w http.ResponseWriter, r *http.Request) {
	var query utils.SqlUser
	err := json.NewDecoder(r.Body).Decode(&query)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if query.Email == "" || query.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレス、パスワードを入力してください"})
		return
	}

	// ユーザー取得
	user, err := h.db.GetUserData([]string{"Email = ?"}, []interface{}{query.Email})
	if user.Email == "" || err != nil {
		log.Println("ユーザーが存在しません", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレスまたはパスワードが間違っています"})
		return
	}

	// パスワード検証
	err = function.ComparePassword(user.Password, query.Password)
	if err != nil {
		log.Println("パスワード不一致:", user.Email)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレスまたはパスワードが間違っています"})
		return
	}

	// トークン生成ロジックを googleLogin と統一 (15分有効なアクセストークン)
	token, err := function.GenerateTokenWithTTL(user.ID, 15*time.Minute)
	if err != nil {
		http.Error(w, "Could not generate token", http.StatusInternalServerError)
		return
	}

	// リフレッシュトークン設定 (Cookie)
	err = function.SetRefreshToken(h.db, w, user.ID)
	if err != nil {
		log.Println("リフレッシュトークン設定失敗", err)
		http.Error(w, "Could not set refresh token", http.StatusInternalServerError)
		return
	}

	// レスポンス
	response := TokenResponse{
		AccessToken: token,
		TokenType:   "Bearer",
		ExpiresIn:   900, // 15分 (900秒) に統一
	}

	// ログインメール送信 (非同期)
	go func() {
		subject := "【Animaloop】新しいログインがありました"
		htmlContent := `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #333;">ログイン通知</h2>
                <p>Animaloopのアカウントへの新しいログインがありました。</p>
                <p><strong>日時:</strong> 現在</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777;">
                    ※お心当たりがない場合は、速やかにパスワードを変更してください。
                </p>
            </div>
        `
		if _, err := function.SendMail(query.Email, subject, htmlContent); err != nil {
			fmt.Printf("Failed to send login notification: %v\n", err)
		}
	}()

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
	log.Println("ログイン成功:", user.Email)
}

// Googleログイン (ログイン専用)
func (h *LoginHandler) googleLogin(w http.ResponseWriter, r *http.Request) {
	// 1. トークンを取得
	var get utils.Token

	// Decode 成功＋Tokenあり を同時にチェック
	if err := json.NewDecoder(r.Body).Decode(&get); err != nil || get.Token == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
		return
	}

	// 2. トークンを検証してユーザー情報を取得
	payload, err := function.GetGoogleUserInfo(get.Token)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "Google認証失敗"})
		return
	}

	// 3. メールアドレス認証確認 (未認証なら弾く)
	if verified, ok := payload["email_verified"].(bool); !ok || !verified {
		http.Error(w, "Googleのメールアドレスが未認証です", http.StatusBadRequest)
		return
	}

	// 必要な情報を取得
	googleID := payload["sub"].(string)
	email := payload["email"].(string)

	// 4. ユーザー検索 (ログイン専用なので google_id で探す)
	var user utils.SqlUser
	user, err = h.db.GetUserData([]string{"google_id = $1"}, []interface{}{googleID})
	if err != nil {
		// 見つからない = アカウントがない = 404エラー
		// フロントエンドはこの 404 を検知して「新規登録」へ誘導します
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{
			"err_message": "アカウントが見つかりません。新規登録してください。",
			"code":        "USER_NOT_FOUND",
			"err":         err.Error(),
		})
		return
	}

	// 6. トークン生成 (15分)
	accessToken, err := function.GenerateTokenWithTTL(user.ID, 15*time.Minute)
	if err != nil {
		http.Error(w, "Could not generate token", http.StatusInternalServerError)
		return
	}

	// 7. リフレッシュトークン設定 (Cookie)
	err = function.SetRefreshToken(h.db, w, user.ID)
	if err != nil {
		log.Println("リフレッシュトークン設定失敗", err)
		http.Error(w, "Could not set refresh token", http.StatusInternalServerError)
		return
	}

	// 8. ログイン通知メール送信 (非同期)
	go func() {
		subject := "【Animaloop】新しいログインがありました"
		htmlContent := `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #333;">ログイン通知</h2>
                <p>Animaloopのアカウントへの新しいログインがありました。</p>
                <p><strong>日時:</strong> 現在</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #777;">
                    ※お心当たりがない場合は、速やかにパスワードを変更してください。
                </p>
            </div>
        `
		if _, err := function.SendMail(email, subject, htmlContent); err != nil {
			fmt.Printf("Failed to send login notification: %v\n", err)
		}
	}()

	// 9. レスポンス
	response := TokenResponse{
		AccessToken: accessToken,
		TokenType:   "Bearer",
		ExpiresIn:   900, // 15分
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)

	log.Println("Googleログイン成功:", email)
}
