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

		sql_mail, err := function.EmailCheck(user.Email)
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

		token, err := function.SetRegistrationToken(user)
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
    	`, user.Email, url)

		// Mailjet クライアントの作成
		mailjetClient := mailjet.NewMailjetClient(config.MAILJET_API_KEY, config.MAILJET_API_KEY)
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


		if user == nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
			return
		}

		// 本登録処理（仮）
		id,err :=function.CreateCustomer(userData)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました"})
			return
		}

		userData["id"] = id
		err = function.SaveUser(userData)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました"})
			return
		}
		
		function.SaveProfile(userData["id"].(string), map[string]interface{}{});
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました"})
			return
		}

		// トークン削除
		err = function.DeleteRegistrationToken(token)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました"})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "本登録が完了しました"})
	})

	// ログイン
	r.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		var user function.User
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

		user := function.GetUserData([]string{"email"}, []interface{}{user.Email})
		if user == nil || err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレスまたはパスワードが間違っています"})
			return
		}

		// パスワード検証
		err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(query.Password))
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレスまたはパスワードが間違っています"})
			return
		}

		// トークン生成
		var token_data function.User
		token_data.ID = user.ID
		ustoken_dataer.Email = user.Email
		token_data.Name = user.Name
		token_data.Limit = 1
		token,erro := function.GenerateToken(token_data)

		refresh_token, err := function.GenerateRefreshToken(token_data)

		if err != nil || erro != nil {
			http.Error(w, "Could not generate token", http.StatusInternalServerError)
			return
		}
		//refresh_tokenをOnlyクッキーに
		http.SetCookie(w, &http.Cookie{
			Name:     "refresh_token",
			Value:    refresh_token,
			HttpOnly: true,
			SameSite: http.SameSiteStrictMode,
			Secure:   true,
		})

		response := TokenResponse{
			AccessToken: Token,
			TokenType:   "Bearer",
			ExpiresIn:   3600,
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	// マイページ表示
	r.HandleFunc("/mypage", func(w http.ResponseWriter, r *http.Request) {
		token,err := function.CheckUser();

		// トークンを検証
		claims, err := function.GetUserFromToken(token)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		// 結果を格納する変数
		var history interface{}
		var favorites interface{}
		var user interface{}
		var err error

		// エラーチャネルを用意
		errCh := make(chan error, 3) // 3つの非同期処理があるためバッファサイズ3

		// 履歴取得
		wg.Add(1)
		go func() {
			defer wg.Done()
			history, err = function.GetHistory(userID)
			if err != nil {
				errCh <- err
			}
		}()

		// お気に入り取得
		wg.Add(1)
		go func() {
			defer wg.Done()
			favorites, err = function.GetFavorites(userID)
			if err != nil {
				errCh <- err
			}
		}()

		// ユーザー情報取得
		wg.Add(1)
		go func() {
			defer wg.Done()
			user, err = function.GetUserData([]string{"id"}, []interface{}{userID})
			if err != nil {
				errCh <- err
			}
		}()

		// 全ての処理が完了するのを待つ
		wg.Wait()
		close(errCh)

		// エラーチェック
		for e := range errCh {
			if e != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました"})
				return
			}
		}

		// レスポンスを返す
		response := map[string]interface{}{
			"history":   history,
			"favorites": favorites,
			"user":      user,
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	// トークンからユーザーidを取得トークンの更新
	r.HandleFunc("/refresh", func(w http.ResponseWriter, r *http.Request) {
		token,err := function.CheckUser(w, r)

		// トークンからIdを取得
		claims, err := function.GetUserFromToken(token)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}
		
		// IDを返す
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"customerId": claims["id"].(string)})
		
	})

	// ユーザー情報取得
	r.HandleFunc("/get-customer/data", func(w http.ResponseWriter, r *http.Request) {
		token,err := function.CheckUser(w, r)

		// トークンからIdを取得
		claims, err := function.GetUserFromToken(token)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		// IDを返す
		userData, err := function.GetUserDataAndProfile([]string{"id"}, []interface{}{claims["id"].(string)})
		if err != nil {	
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました"})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(userData)
	})

	// ユーザー情報更新
	r.HandleFunc("/update-customer/data", func(w http.ResponseWriter, r *http.Request) {
		token,err := function.CheckUser(w, r)
		
		// トークンからIdを取得
		claims, err := function.GetUserFromToken(token)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		//リクエストボディから更新情報を取得
		var user map[string]interface{}
		err := json.NewDecoder(r.Body).Decode(&user)
		if err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// ユーザー情報更新
		err = function.UpdateUser(claims["id"].(string), user)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの更新に失敗しました"})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "ユーザー情報を更新しました"})
	})

  //googleログインGo
  r.HandleFunc("/auth/google", func(w http.ResponseWriter, r *http.Request) {
	// トークンを取得
	token := r.URL.Query().Get("token")
	if token == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
		return
	}

	// トークンを検証
	ticket, err := googleOAuth.VerifyIDToken(token)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
		return
	}

	// トークンのデータを取得
	payload := ticket.Payload
	email := payload["email"].(string)

	//並列でメールアドレスをチェックする
	sql_mail, err := function.EmailCheck(email)
	square_mail := function.CheckSquareEmail(email)

	if sql_mail || square_mail {
		// ユーザーが存在する場合はログイン処理
		user := function.GetUserData([]string{"email"}, []interface{}{email})
		if user == nil || err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレスまたはパスワードが間違っています"})
			return
		}

		// トークン生成
		var token_data function.User
		token_data.ID = user.ID
		token_data.Email = user.Email
		token_data.Name = payload["name"].(string)
		token_data.Limit = 1

		token, err := function.GenerateToken(token_data)
		refresh_token, err := function.GenerateRefreshToken(token_data)

		if err != nil {
			http.Error(w, "Could not generate token", http.StatusInternalServerError)
			return
		}

		// refresh_tokenをOnlyクッキーに
		function.checkRefreshToken(w, token_data)

		response := TokenResponse{
			AccessToken: token,
			TokenType:   "Bearer",
			ExpiresIn:   3600,
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
		return
	}

	// ユーザーが存在しない場合はユーザーを作成
	user := map[string]interface{}{
		"email": email,
		"name":  payload["name"].(string),
	}

	// スクエアのカスタマーを作成
	squareResponse, err := function.SaveSquareCustomer(user)
	if err != nil {
		log.Fatalf("Error creating customer: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザーの作成に失敗しました"})
		return
	}
	user["id"] = squareResponse.ID

	// ユーザーを作成
	err = function.SaveUser(user)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザーの作成に失敗しました"})
		return
	}

	// プロフィールを作成
	err = function.SaveProfile(user["id"].(string), map[string]interface{}{})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザーの作成に失敗しました"})
		return
	}

	//　アクセストークンとリフレッシュトークンを生成
	var token_data function.User
	token_data.ID = user["id"].(string)
	token_data.Email = user["email"].(string)
	token_data.Name = user["name"].(string)
	token_data.Limit = 1

	token, err := function.GenerateToken(token_data)
	refresh_token, err := function.GenerateRefreshToken(token_data)

	if err != nil {
		http.Error(w, "Could not generate token", http.StatusInternalServerError)
		return
	}

	// refresh_tokenをOnlyクッキーに
	function.checkRefreshToken(w, token_data)

	response := TokenResponse{
		AccessToken: token,
		TokenType:   "Bearer",
		ExpiresIn:   3600,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
})
  
	// サーバーを起動
	log.Fatal(http.ListenAndServe(":4000", r))
}
