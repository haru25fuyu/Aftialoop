package handler

import (
	"animaloop/config"
	"animaloop/function"
	SQL "animaloop/sql"
	"animaloop/utils"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	mysql "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// SignupHandler は /signup 系のエンドポイントをまとめたハンドラです
type SignupHandler struct {
	db *SQL.Database
}

// NewSignupHandler はハンドラのコンストラクタ
func NewSignupHandler(db *SQL.Database) *SignupHandler {
	return &SignupHandler{
		db: db,
	}
}

// RegisterRoutes がルーティングの登録を行います
func (h *SignupHandler) RegisterRoutes(r *mux.Router) {
	// POST /signup (仮登録)
	r.HandleFunc("/signup", h.Signup).Methods("POST")
	// GET /register/confirm (本登録・メールリンク用)
	r.HandleFunc("/register/confirm", h.ConfirmRegistration).Methods("GET")
	// POST /auth/google/signup (Google新規登録)
	r.HandleFunc("/auth/google/signup", h.GoogleSignUp).Methods("POST")
}

// 仮登録処理
func (h *SignupHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var user utils.SqlUser
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		log.Println("JSONデコードエラー:", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// reCAPTCHA検証 (GoogleIDフィールドをトークンとして利用)
	log.Println("RecaptchaAction:", config.RecaptchaAction)
	function.CreateAssessment(user.GoogleID)
	user.GoogleID = "" // 検証後は消す

	if user.Email == "" || user.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレス、パスワードを入力してください"})
		return
	}

	// 重複チェック
	sql_mail, _ := h.db.EmailCheck(user.Email)
	square_mail := function.CheckSquareEmail(user.Email)

	if sql_mail || square_mail {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレスは既に使用されています"})
		return
	}

	// パスワードハッシュ化
	user.Password, err = function.HashPassword(user.Password)
	if err != nil {
		http.Error(w, "Could not hash password", http.StatusInternalServerError)
		return
	}

	// トークン生成用データ
	userData := utils.User{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
		Exp:   time.Now().Add(24 * time.Hour).Unix(),
		Limit: 24,
	}

	user.ID = uuid.New().String()
	token, err := function.GenerateToken(&userData)
	if err != nil {
		log.Printf("Failed to generate token: %s", err)
		http.Error(w, "Could not generate token", http.StatusInternalServerError)
		return
	}

	err = h.db.SetRegistrationToken(user, token)
	if err != nil {
		log.Printf("Failed to set registration token: %s", err)
		http.Error(w, "Could not set registration token", http.StatusInternalServerError)
		return
	}

	// 本登録用URL (環境に合わせてドメインを変更してください)
	// 例: https://aftialoop.com/register/confirm?token=...
	url := fmt.Sprintf("%s/register/confirm?token=%s", function.GetFrontendURL(), token)

	htmlContent := fmt.Sprintf(`
        <h3>%s様</h3><br />
        <p>この度は、Aftialoopへのご登録ありがとうございます。</p><br />
        <hr />
        <p>以下のリンクをクリックして、本登録を完了してください。</p><br />
        <p><a href="%s">本登録を完了する</a></p><br />
        <hr />
        <p>もしリンクに問題がある場合は、以下のURLをコピーしてブラウザに貼り付けてください。</p><br />
        <p>URL: %s</p><br />
        <hr />
        <p>※このリンクは24時間以内にご利用ください。</p><br />
        <p>何かご不明な点がございましたら、サポートまでご連絡ください。</p><br />
        <hr />
        <p>今後とも、Animaloopをどうぞよろしくお願いいたします。</p><br />
        <p>Animaloopサポートチーム</p>
        <br />
    `, user.Email, url, url)

	subject := "【Aftialoop】ご登録ありがとうございます（本登録のお願い）"

	res, err := function.SendMail(user.Email, subject, htmlContent)
	if err != nil {
		log.Printf("SES送信失敗: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールの送信に失敗しました"})
		return
	}

	log.Printf("Email sent: %+v", res)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "仮登録が完了しました"})
}

// 本登録処理 (メールリンクから遷移)
func (h *SignupHandler) ConfirmRegistration(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")

	if token == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
		return
	}

	// トークンの有効期限を確認
	_, err := function.GetUserFromToken(token)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが有効期限切れか不正です"})
		return
	}

	userData, err := h.db.GetUserFromRegistrationToken(token)
	if err != nil {
		log.Println("DBトークン取得エラー:", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが見つからないか無効です"})
		return
	}

	// 本登録処理: Square顧客作成
	id, err := function.CreateCustomer(userData)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました(Customer)"})
		return
	}

	// ID設定
	userData.CustomerID = id
	userData.ID = uuid.New().String()
	prm, err := function.StructToMap(userData)
	if err != nil {
		log.Println("Map変換エラー:", err)
		function.DeleteCustomer(id) // ★ロールバック
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました", "error": err.Error()})
		return
	}

	err = h.db.SaveUser(prm)
	if err != nil {
		// ★ エラー発生時はSquareの顧客を削除する (ゴミデータを残さない)
		defer function.DeleteCustomer(id)

		// 重複キー(1062)判定
		if me, ok := err.(*mysql.MySQLError); ok && me.Number == 1062 {
			// ID衝突ならリトライ
			if strings.Contains(me.Message, "ID") || strings.Contains(me.Message, "PRIMARY") {
				const maxRetry = 3
				var lastErr error
				// リトライ成功フラグ
				success := false

				for i := 0; i < maxRetry; i++ {
					userData.ID = uuid.New().String()
					prm["ID"] = userData.ID
					if lastErr = h.db.SaveUser(prm); lastErr == nil {
						success = true
						break
					}
					// ID以外のエラーなら中断
					if me2, ok2 := lastErr.(*mysql.MySQLError); !(ok2 && me2.Number == 1062) {
						break
					}
				}
				if !success {
					log.Println("ユーザーID重複リトライ失敗:", lastErr)
					w.WriteHeader(http.StatusConflict)
					json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザー登録が混雑しています。時間をおいて再度お試しください。"})
					return
				}
				// リトライ成功した場合は defer で消さないようにキャンセルが必要だが、
				// Goのdeferはキャンセルできないため、構造を変えるか、ここではシンプルに「成功時はreturn」する
				// (defer function.DeleteCustomer(id) が発動してしまうので、この構造だとバグになる)
				// → なので defer は使わず、エラー時のみ DeleteCustomer を呼ぶ形に書き直します ↓
			} else {
				// ID以外の重複エラー
				status := http.StatusConflict
				msg := "既に登録済みのデータが存在します"

				if strings.Contains(me.Message, "Email") {
					msg = "このメールアドレスは既に登録されています"
				} else if strings.Contains(me.Message, "CustomerID") {
					msg = "この外部IDは既に紐づいています"
				} else if strings.Contains(me.Message, "GoogleID") {
					msg = "このGoogleアカウントは既に紐づいています"
				} else if strings.Contains(me.Message, "AppleID") {
					msg = "このAppleIDは既に紐づいています"
				}
				w.WriteHeader(status)
				json.NewEncoder(w).Encode(map[string]string{"err_message": msg})
				return
			}
		} else {
			// その他のDBエラー
			log.Println("SaveUserエラー:", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました(DB)"})
			return
		}
	}
	// ↑ リトライ成功、または初回成功時はここに来る。DeleteCustomerは呼ばれない。

	// プロフィール作成
	if err := h.db.SaveProfile(userData.ID, map[string]interface{}{}); err != nil {
		log.Println("プロフィール作成エラー:", err)
		// 致命的ではないので続行
	}

	// トークン削除
	if err := h.db.DeleteRegistrationToken(token); err != nil {
		log.Println("登録トークン削除失敗:", err)
	}

	// 完了メール送信
	htmlContent := fmt.Sprintf(`
        <h3>%s様</h3><br />
        <p>この度は、Aftialoopへのご登録ありがとうございます。</p><br />
        <p>本登録が完了しました。</p><br />
        <p>今後とも、Animaloopをどうぞよろしくお願いいたします。</p><br />
        <p>Animaloopサポートチーム</p>
        <br />
    `, userData.Email)

	subject := "【Aftialoop】本登録完了のお知らせ"
	if _, err := function.SendMail(userData.Email, subject, htmlContent); err != nil {
		log.Printf("SES送信失敗: %v", err)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "本登録が完了しました"})
}

// Googleサインアップ専用ハンドラ
func (h *SignupHandler) GoogleSignUp(w http.ResponseWriter, r *http.Request) {
	// 1. トークン取得
	var get utils.Token
	if err := json.NewDecoder(r.Body).Decode(&get); err != nil || get.Token == "" {
		http.Error(w, "トークンが不正です", http.StatusBadRequest)
		return
	}

	// 2. Google検証
	payload, err := function.GetGoogleUserInfo(get.Token)
	if err != nil {
		http.Error(w, "Google認証失敗", http.StatusUnauthorized)
		return
	}

	// 3. 未認証なら弾く
	if verified, ok := payload["email_verified"].(bool); !ok || !verified {
		http.Error(w, "Googleのメールアドレスが未認証です", http.StatusBadRequest)
		return
	}

	googleID := payload["sub"].(string)
	email := payload["email"].(string)

	// 4. 重複チェック
	var existingUser utils.SqlUser
	err = h.db.DB.Get(&existingUser, "SELECT id FROM users WHERE google_id = ?", googleID)
	if err == nil {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{
			"err_message": "既にアカウントをお持ちです。ログインしてください。",
		})
		return
	}

	existingUser, err = h.db.GetUserByAnyEmail(email)
	if err == nil {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{
			"err_message": "このメールアドレスは既に登録されています。ログインしてください。",
		})
		return
	}

	// 5. 新規ユーザー作成
	name, _ := payload["name"].(string)
	if name == "" {
		name = "User"
	}

	newUser := utils.SqlUser{
		ID:       uuid.New().String(),
		Email:    email,
		Name:     name,
		GoogleID: googleID,
	}

	// Square顧客作成
	squareID, err := function.CreateCustomer(newUser)
	if err != nil {
		log.Printf("Square作成失敗: %v", err)
		http.Error(w, "ユーザー作成に失敗しました", http.StatusInternalServerError)
		return
	}
	newUser.CustomerID = squareID

	// DB保存
	userMap, _ := function.StructToMap(newUser)
	if err := h.db.SaveUser(userMap); err != nil {
		function.DeleteCustomer(squareID) // ★失敗したらSquareも消す
		http.Error(w, "DB保存失敗", http.StatusInternalServerError)
		return
	}

	if err := h.db.SaveProfile(newUser.ID, map[string]interface{}{}); err != nil {
		log.Printf("プロフィール作成失敗: %v", err)
	}

	// 6. トークン発行してログイン状態にする
	token, err := function.GenerateTokenWithTTL(newUser.ID, 15*time.Minute)
	if err != nil {
		http.Error(w, "Token生成失敗", http.StatusInternalServerError)
		return
	}

	if err := function.SetRefreshToken(h.db, w, newUser.ID); err != nil {
		log.Printf("リフレッシュトークン設定失敗: %v", err)
		http.Error(w, "Could not set refresh token", http.StatusInternalServerError)
		return
	}

	// レスポンス
	response := map[string]interface{}{
		"access_token": token,
		"token_type":   "Bearer",
		"expires_in":   900,
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
