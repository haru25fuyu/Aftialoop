<<<<<<< HEAD
package page

import (
	"animaloop/config"
	"animaloop/function"
	"animaloop/utils"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	mysql "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// signupHandler は /signup 系のエンドポイントをまとめたハンドラです
type signupHandler struct {
	// ここに DB やサービスを注入しても OK
	db *function.Database
}

// NewSignupHandler はハンドラのコンストラクタ
func NewSignupHandler(db *function.Database) *signupHandler {
	return &signupHandler{
		db: db,
	}
}

// RegisterRoutes がルーティングの登録を行います
func (h *signupHandler) RegisterRoutes(r *mux.Router) {
	// POST /signup
	r.HandleFunc("/signup", h.Signup).Methods("POST")
	r.HandleFunc("/register/confirm", h.ConfirmRegistration).Methods("GET")
}

// 仮登録
func (h *signupHandler) Signup(w http.ResponseWriter, r *http.Request) {
	//リクエストボディからパスワードとメールアドレスを取得
	var user utils.SqlUser
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		log.Println("エラーが発生しました")
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Println(config.RecaptchaAction)
	function.CreateAssessment(user.GoogleID)
	user.GoogleID = ""

	if user.Email == "" || user.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレス、パスワードを入力してください"})
		return
	}

	sql_mail, err := h.db.EmailCheck(user.Email)
	square_mail := function.CheckSquareEmail(user.Email)

	if sql_mail || square_mail {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレスは既に使用されています"})
		return
	}

	user.Password, err = function.HashPassword(user.Password)

	if err != nil {
		http.Error(w, "Could not hash password", http.StatusInternalServerError)
		return
	}

	// トークン生成
	token, err := h.db.SetRegistrationToken(&user)
	if err != nil {
		log.Fatalf("Failed to set registration token: %s", err)
		http.Error(w, "Could not set registration token", http.StatusInternalServerError)
		return
	}
	// 本登録用URL
	url := fmt.Sprintf("https://aftialoop.com/register/confirm?token=%s", token)

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
	w.Write([]byte("CreateName"))
}

// GetSignupPage はサインアップページを返すハンドラです
// 本登録
func (h *signupHandler) ConfirmRegistration(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")

	if token == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
		return
	}

	//トークンの有効期限を確認
	_, err := function.GetUserFromToken(token)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
		return
	}

	userData, err := h.db.GetUserFromRegistrationToken(token)
	if err != nil {
		log.Println("エラーが発生しました", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
		return
	}

	// 本登録処理（仮）
	id, err := function.CreateCustomer(userData)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました"})
		return
	}

	// 外部（Square）のCustomerIDはCustomerIDフィールドへ、
	// ユーザーの主キーIDは独立したUUIDで生成する
	userData.CustomerID = id
	userData.ID = uuid.New().String()
	prm, err := function.StructToMap(userData)
	if err != nil {
		log.Println("エラーが発生しました", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました", "error": err.Error()})
		return
	}

	err = h.db.SaveUser(prm)
	log.Println(prm["password"])
	if err != nil {
		// 重複キー(1062)などの一意制約違反を判定
		if me, ok := err.(*mysql.MySQLError); ok && me.Number == 1062 {
			// ID衝突（PRIMARYキー）なら UUID を再発行して最大3回まで再試行
			if strings.Contains(me.Message, "ID") || strings.Contains(me.Message, "PRIMARY") {
				const maxRetry = 3
				var lastErr error
				for i := 0; i < maxRetry; i++ {
					userData.ID = uuid.New().String()
					prm["ID"] = userData.ID
					if lastErr = h.db.SaveUser(prm); lastErr == nil {
						err = nil
						break
					}
					if me2, ok2 := lastErr.(*mysql.MySQLError); !(ok2 && me2.Number == 1062) {
						// 別のエラーに変わったら中断
						break
					}
				}
				if err != nil { // 初回の err を成功時に上書きしているので、ここで確認
					if lastErr != nil {
						log.Println("ユーザーID重複の再試行にも失敗", lastErr)
					}
					w.WriteHeader(http.StatusConflict)
					json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザー登録が競合しました。時間をおいてもう一度お試しください。"})
					return
				}
			} else if strings.Contains(me.Message, "Email") {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(map[string]string{"err_message": "このメールアドレスは既に登録されています"})
				return
			} else if strings.Contains(me.Message, "CustomerID") {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(map[string]string{"err_message": "この外部IDは既に紐づいています"})
				return
			} else if strings.Contains(me.Message, "GoogleID") {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(map[string]string{"err_message": "この外部IDは既に紐づいています"})
				return
			}else if strings.Contains(me.Message, "AppleID") {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(map[string]string{"err_message": "この外部IDは既に紐づいています"})
				return
			} else {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(map[string]string{"err_message": "既に登録済みのデータが存在します"})
				return
			}
		} else {
			log.Println("エラーが発生しました", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました"})
			return
		}
	}

	err = h.db.SaveProfile(userData.ID, map[string]interface{}{})
	if err != nil {
		log.Println("エラーが発生しました", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました"})
		return
	}

	// トークン削除
	err = h.db.DeleteRegistrationToken(token)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました"})
		return
	}

	// メール送信
	htmlContent := fmt.Sprintf(`
		<h3>%s様</h3><br />
		<p>この度は、Aftialoopへのご登録ありがとうございます。</p><br />
		<p>本登録が完了しました。</p><br />
		<p>今後とも、Animaloopをどうぞよろしくお願いいたします。</p><br />
		<p>Animaloopサポートチーム</p>
		<br />
	`, userData.Email)

	subject := "【Aftialoop】本登録完了のお知らせ"

	res, err := function.SendMail(userData.Email, subject, htmlContent)
	if err != nil {
		log.Printf("SES送信失敗: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールの送信に失敗しました"})
		return
	}
	log.Printf("Email sent: %+v", res)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "本登録が完了しました"})
}
=======
package page

import (
	"animaloop/config"
	"animaloop/function"
	"animaloop/utils"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	mysql "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// signupHandler は /signup 系のエンドポイントをまとめたハンドラです
type signupHandler struct {
	// ここに DB やサービスを注入しても OK
	db *function.Database
}

// NewSignupHandler はハンドラのコンストラクタ
func NewSignupHandler(db *function.Database) *signupHandler {
	return &signupHandler{
		db: db,
	}
}

// RegisterRoutes がルーティングの登録を行います
func (h *signupHandler) RegisterRoutes(r *mux.Router) {
	// POST /signup
	r.HandleFunc("/signup", h.Signup).Methods("POST")
	r.HandleFunc("/register/confirm", h.ConfirmRegistration).Methods("GET")
}

// 仮登録
func (h *signupHandler) Signup(w http.ResponseWriter, r *http.Request) {
	//リクエストボディからパスワードとメールアドレスを取得
	var user utils.SqlUser
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		log.Println("エラーが発生しました")
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Println(config.RecaptchaAction)
	function.CreateAssessment(user.GoogleID)
	user.GoogleID = ""

	if user.Email == "" || user.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレス、パスワードを入力してください"})
		return
	}

	sql_mail, err := h.db.EmailCheck(user.Email)
	square_mail := function.CheckSquareEmail(user.Email)

	if sql_mail || square_mail {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレスは既に使用されています"})
		return
	}

	user.Password, err = function.HashPassword(user.Password)

	if err != nil {
		http.Error(w, "Could not hash password", http.StatusInternalServerError)
		return
	}

	// トークン生成
	token, err := h.db.SetRegistrationToken(&user)
	if err != nil {
		log.Fatalf("Failed to set registration token: %s", err)
		http.Error(w, "Could not set registration token", http.StatusInternalServerError)
		return
	}
	// 本登録用URL
	url := fmt.Sprintf("https://aftialoop.com/register/confirm?token=%s", token)

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
	w.Write([]byte("CreateName"))
}

// GetSignupPage はサインアップページを返すハンドラです
// 本登録
func (h *signupHandler) ConfirmRegistration(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")

	if token == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
		return
	}

	//トークンの有効期限を確認
	_, err := function.GetUserFromToken(token)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
		return
	}

	userData, err := h.db.GetUserFromRegistrationToken(token)
	if err != nil {
		log.Println("エラーが発生しました", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
		return
	}

	// 本登録処理（仮）
	id, err := function.CreateCustomer(userData)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました"})
		return
	}

	// 外部（Square）のCustomerIDはCustomerIDフィールドへ、
	// ユーザーの主キーIDは独立したUUIDで生成する
	userData.CustomerID = id
	userData.ID = uuid.New().String()
	prm, err := function.StructToMap(userData)
	if err != nil {
		log.Println("エラーが発生しました", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました", "error": err.Error()})
		return
	}

	prm["DefaultAddress"] = nil

	err = h.db.SaveUser(prm)
	log.Println(prm["password"])
	if err != nil {
		// 重複キー(1062)などの一意制約違反を判定
		if me, ok := err.(*mysql.MySQLError); ok && me.Number == 1062 {
			// ID衝突（PRIMARYキー）なら UUID を再発行して最大3回まで再試行
			if strings.Contains(me.Message, "ID") || strings.Contains(me.Message, "PRIMARY") {
				const maxRetry = 3
				var lastErr error
				for i := 0; i < maxRetry; i++ {
					userData.ID = uuid.New().String()
					prm["ID"] = userData.ID
					if lastErr = h.db.SaveUser(prm); lastErr == nil {
						err = nil
						break
					}
					if me2, ok2 := lastErr.(*mysql.MySQLError); !(ok2 && me2.Number == 1062) {
						// 別のエラーに変わったら中断
						break
					}
				}
				if err != nil { // 初回の err を成功時に上書きしているので、ここで確認
					if lastErr != nil {
						log.Println("ユーザーID重複の再試行にも失敗", lastErr)
					}
					w.WriteHeader(http.StatusConflict)
					json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザー登録が競合しました。時間をおいてもう一度お試しください。"})
					return
				}
			} else if strings.Contains(me.Message, "Email") {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(map[string]string{"err_message": "このメールアドレスは既に登録されています"})
				return
			} else if strings.Contains(me.Message, "CustomerID") {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(map[string]string{"err_message": "この外部IDは既に紐づいています"})
				return
			} else if strings.Contains(me.Message, "GoogleID") {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(map[string]string{"err_message": "この外部IDは既に紐づいています"})
				return
			} else if strings.Contains(me.Message, "AppleID") {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(map[string]string{"err_message": "この外部IDは既に紐づいています"})
				return
			} else {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(map[string]string{"err_message": "既に登録済みのデータが存在します"})
				return
			}
		} else {
			log.Println("エラーが発生しました", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました" + err.Error()})
			return
		}
	}

	err = h.db.SaveProfile(userData.ID, map[string]interface{}{})
	if err != nil {
		log.Println("エラーが発生しました", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました"})
		return
	}

	// トークン削除
	err = h.db.DeleteRegistrationToken(token)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました"})
		return
	}

	// メール送信
	htmlContent := fmt.Sprintf(`
		<h3>%s様</h3><br />
		<p>この度は、Aftialoopへのご登録ありがとうございます。</p><br />
		<p>本登録が完了しました。</p><br />
		<p>今後とも、Animaloopをどうぞよろしくお願いいたします。</p><br />
		<p>Animaloopサポートチーム</p>
		<br />
	`, userData.Email)

	subject := "【Aftialoop】本登録完了のお知らせ"

	res, err := function.SendMail(userData.Email, subject, htmlContent)
	if err != nil {
		log.Printf("SES送信失敗: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールの送信に失敗しました"})
		return
	}
	log.Printf("Email sent: %+v", res)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "本登録が完了しました"})
}
>>>>>>> 7e5800f5 (Refactor user data handler to use dependency injection for database access and improve error handling)
