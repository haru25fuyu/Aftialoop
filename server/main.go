package main

import (
	"animaloop/config"
	"animaloop/function"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/dgrijalva/jwt-go"
	"github.com/gorilla/mux"
	"github.com/mailjet/mailjet-apiv3-go"
	"golang.org/x/crypto/bcrypt"
)

// トークン情報
type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

func main() {
	r := mux.NewRouter()

	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello World!"))
	})

	r.HandleFunc("/name", func(w http.ResponseWriter, r *http.Request) {
		ID, err := function.CreateCustomer(map[string]interface{}{
			"email": "haru22fuyu@gmail.com",
			"name":  "Haru",
		})

		if err != nil {
			log.Fatalf("Error creating customer: %v", err)
		}

		w.Write([]byte("Hello " + ID))
		
	})

	// 仮登録
	r.HandleFunc("/signup", func(w http.ResponseWriter, r *http.Request) {
		//リクエストボディからパスワードとメールアドレスを取得
		var user function.User
		err := json.NewDecoder(r.Body).Decode(&user)
		if err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if user.Email == "" || user.Password == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレス、パスワードを入力してください"})
			return
		}

		sql_mail,err := function.EmailCheck(user.Email)
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
		user.Limit = 24
		
		token,err:=function.SetRegistrationToken(user)
		if err != nil {
			http.Error(w, "Could not set registration token", http.StatusInternalServerError)
			return
		}
		// 仮登録メール送信
		// 本登録URLにトークンを付与して送信
		// 例: http://example.com/register/confirm?token=xxxxxx
		url := fmt.Sprintf("https://animaloop.jp/register/confirm?token=%s", token)

		htmlContent := fmt.Sprintf(`
      <h3>%s様</h3><br />
      <p>この度は、Animaloopへのご登録ありがとうございます。</p><br />
      <hr />
      <p>以下のリンクをクリックして、本登録を完了してください。</p><br />
      <p><a href="${registrationLink}">本登録を完了する</a></p><br />
      <hr />
      <p>もしリンクに問題がある場合は、以下のURLをコピーしてブラウザに貼り付けてください。</p><br />
      <p>URL: %s</p><br />
      <hr />
      <p>※このリンクは24時間以内にご利用ください。</p><br />
      <p>何かご不明な点がございましたら、サポートまでご連絡ください。</p><br />
      <hr />
      <p>今後とも、Animaloopをどうぞよろしくお願いいたします。</p><br />
      <p>Animaloopサポートチーム</p>
    `, user.Email, url);

	// Mailjet クライアントの作成
	mailjetClient  := mailjet.NewMailjetClient(config.MAILJET_API_KEY,config.MAILJET_API_KEY)
	// メールの内容を設定
	messagesInfo := []mailjet.InfoMessagesV31{
		{
			From: &mailjet.RecipientV31{
				Email: "pilot@mailjet.com",
				Name:  "Mailjet Pilot",
			},
			To: &mailjet.RecipientsV31{
				mailjet.RecipientV31{
					Email: "passenger1@mailjet.com",
					Name:  "passenger 1",
				},
			},
			Subject:  "Your email flight plan!",
			TextPart: "Dear passenger 1, welcome to Mailjet! May the delivery force be with you!",
			HTMLPart: htmlContent,
		},
	}

	// メール送信
	messages := mailjet.MessagesV31{Info: messagesInfo}
	res, err := mailjetClient.SendMailV31(&messages)

	if err != nil {
		log.Fatalf("Failed to send email: %s", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールの送信に失敗しました"})
		return
	}

	log.Printf("Email sent: %+v", res)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "仮登録が完了しました"})

	})

	// 本登録
	r.HandleFunc("/register/confirm", func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("token")
		if token == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
			return
		}

		//トークンの有効期限を確認
		user, err := function.GetUserFromToken(token)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
			return
		}

		userData, err := function.GetUserFromRegistrationToken(token)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
			return
		}

		user = &function.User{
			ID:       userData["id"].(string),
			Email:    userData["email"].(string),
			Password: userData["password"].(string),
		}

		if user == nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
			return
		}


		// 本登録処理（仮）
		// 実際にはデータベースに登録します

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "本登録が完了しました"})
	})

	// ログイン
	r.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		var user function.User
		err := json.NewDecoder(r.Body).Decode(&user)
		if err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if user.Email == "" || user.Password == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレス、パスワードを入力してください"})
			return
		}

		// 仮のユーザー確認（実際にはDBから取得）
		storedUser := function.User{
			ID:       "12345",
			Email:    "newuser@example.com",
			Password: "$2a$10$7Qk74oJkA.hfZBd7rdVXb.BPrAVSgg6PHO5BdVWb6B2uxorGkexAi", // bcrypt hash
		}

		if user.Email != storedUser.Email {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレスまたはパスワードが間違っています"})
			return
		}

		// パスワード検証
		err = bcrypt.CompareHashAndPassword([]byte(storedUser.Password), []byte(user.Password))
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレスまたはパスワードが間違っています"})
			return
		}

		// トークン生成
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
			"id":    storedUser.ID,
			"email": storedUser.Email,
		})

		accessToken, err := token.SignedString([]byte("secret"))
		if err != nil {
			http.Error(w, "Could not generate token", http.StatusInternalServerError)
			return
		}

		response := TokenResponse{
			AccessToken: accessToken,
			TokenType:   "Bearer",
			ExpiresIn:   3600,
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	// マイページ表示
	r.HandleFunc("/mypage", func(w http.ResponseWriter, r *http.Request) {
		tokenString := r.Header.Get("Authorization")
		tokenString = strings.TrimPrefix(tokenString, "Bearer ")

		if tokenString == "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "認証が必要です"})
			return
		}

		// トークンを検証
		claims := jwt.MapClaims{}
		_, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte("secret"), nil
		})

		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		// ユーザー情報取得（仮）
		user := function.User{
			ID:    claims["id"].(string),
			Email: claims["email"].(string),
		}

		// 仮の履歴やお気に入りを表示
		favorites := []string{"item1", "item2"}
		history := []string{"history1", "history2"}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"user":    user,
			"history": history,
			"favorites": favorites,
		})
	})

	// サーバーを起動
	log.Fatal(http.ListenAndServe(":4000", r))
}
