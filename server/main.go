package main

import (
	"animaloop/config"
	"animaloop/function"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/mux"
	"github.com/mailjet/mailjet-apiv3-go"
	"github.com/rs/cors"
)

// トークン情報
type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

func main() {
	r := mux.NewRouter()

	config.Init()

	// CORS設定
	corsOptions := cors.New(cors.Options{
		AllowedOrigins:       config.AllowedOrigins,
		AllowedMethods:       []string{"GET", "POST", "PUT", "DELETE"},
		AllowedHeaders:       []string{"Content-Type", "Authorization"},
		AllowCredentials:     true,
		OptionsSuccessStatus: http.StatusOK,
	})

	handler := corsOptions.Handler(r)

	log.Println("Server started on: http://localhost:4000")

	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello World!"))
	})

	r.HandleFunc("/name", func(w http.ResponseWriter, r *http.Request) {

	})

	// 仮登録
	r.HandleFunc("/signup", func(w http.ResponseWriter, r *http.Request) {

		//リクエストボディからパスワードとメールアドレスを取得
		var user function.SqlUser
		err := json.NewDecoder(r.Body).Decode(&user)
		log.Println(user)
		if err != nil {
			log.Println("エラーが発生しました")
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

		// トークン生成
		token, err := function.SetRegistrationToken(&user)
		if err != nil {
			log.Fatalf("Failed to set registration token: %s", err)
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
		mailjetClient := mailjet.NewMailjetClient(config.MAILJET_API_KEY, config.MAILJET_API_SECRET)
		// メールの内容を設定
		messagesInfo := []mailjet.InfoMessagesV31{
			{
				From: &mailjet.RecipientV31{
					Email: "haru25fuyu@animaloop.jp",
					Name:  "Mailjet Pilot",
				},
				To: &mailjet.RecipientsV31{
					mailjet.RecipientV31{
						Email: user.Email,
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
		_, err := function.GetUserFromToken(token)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
			return
		}

		userData, err := function.GetUserFromRegistrationToken(token)
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

		userData.ID = id
		prm, err := function.StructToMap(userData)
		if err != nil {
			log.Println("エラーが発生しました", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました", "error": err.Error()})
			return
		}

		err = function.SaveUser(prm)
		if err != nil {
			log.Println("エラーが発生しました", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "本登録に失敗しました"})
			return
		}

		err = function.SaveProfile(userData.ID, map[string]interface{}{})
		if err != nil {
			log.Println("エラーが発生しました", err)
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
		var query function.SqlUser
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

		user, err := function.GetUserData([]string{"Email = ?"}, []interface{}{query.Email})
		if user.Email == "" || err != nil {
			log.Println("ユーザーが存在しません", err)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレスまたはパスワードが間違っています"})
			return
		}

		// パスワード検証
		log.Println(user.Email, query.Password)
		err = function.ComparePassword(user.Password, query.Password)
		if err != nil {
			log.Println("パスワードが間違っています", err)
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレスまたはパスワードが間違っています"})
			return
		}

		// トークン生成
		var token_data function.User
		token_data.ID = user.ID
		token_data.Email = user.Email
		token_data.Name = user.Name
		token_data.Limit = 1
		token, erro := function.GenerateToken(&token_data)

		refresh_token, err := function.GenerateRefreshToken(&token_data)

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
			AccessToken: token,
			TokenType:   "Bearer",
			ExpiresIn:   3600,
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	// マイページ表示
	r.HandleFunc("/mypage", func(w http.ResponseWriter, r *http.Request) {
		token, res := function.CheckUser(w, r)
		if res != "" || token == "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": res})
			return
		}
		log.Println(token)
		// トークンを検証
		var claims *function.User
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

		// エラーチャネルを用意
		errCh := make(chan error, 3) // 3つの非同期処理があるためバッファサイズ3

		wg := new(sync.WaitGroup)

		// 履歴取得
		wg.Add(1)
		go func() {
			defer wg.Done()
			h, err := function.GetHistory(claims.ID, 0)
			if err != nil {
				errCh <- err
				return
			}
			history = h
		}()

		// お気に入り取得
		wg.Add(1)
		go func() {
			defer wg.Done()
			f, err := function.GetFavoriteItems(claims.ID, 0)
			if err != nil {
				errCh <- err
				return
			}
			favorites = f
		}()

		// ユーザー情報取得
		wg.Add(1)
		go func() {
			defer wg.Done()
			u, err := function.GetUserData([]string{"id"}, []interface{}{claims.ID})
			if err != nil {
				errCh <- err
				return
			}
			user = u
		}()

		// 全ての処理が完了するのを待つ
		wg.Wait()
		close(errCh)

		// エラーチェック
		for err := range errCh {
			if err != nil {
				// エラーハンドリング
				log.Println(err)
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
		token, err := function.CheckUser(w, r)
		if err != "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		// トークンからIdを取得
		claims, erro := function.GetUserFromToken(token)
		if erro != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		// IDを返す
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"customerId": claims.ID})

	})

	// ユーザー情報取得
	r.HandleFunc("/get-customer/data", func(w http.ResponseWriter, r *http.Request) {
		token, err := function.CheckUser(w, r)

		if err != "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		// トークンからIdを取得
		claims, erro := function.GetUserFromToken(token)
		if erro != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		// IDを返す
		userData, erro := function.GetUserDataAndProfile([]string{"id"}, []interface{}{claims.ID})
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました"})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(userData)
	})

	// ユーザー情報更新
	r.HandleFunc("/update-customer/data", func(w http.ResponseWriter, r *http.Request) {
		token, err := function.CheckUser(w, r)
		if err != "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		// トークンからIdを取得
		claims, erro := function.GetUserFromToken(token)
		if erro != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		//リクエストボディから更新情報を取得
		var user function.User
		erro = json.NewDecoder(r.Body).Decode(&user)
		if erro != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		values := map[string]interface{}{
			"email": user.Email,
			"name":  user.Name,
		}

		// ユーザー情報更新
		erro = function.UpdateUser(claims.ID, values)
		if erro != nil {
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
		payload, err := function.GetGoogleUserInfo(token)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
			return
		}

		// トークンのデータを取得
		email := payload.Email
		//並列でメールアドレスをチェックする
		sql_mail, err := function.EmailCheck(email)
		square_mail := function.CheckSquareEmail(email)
		if sql_mail || square_mail {
			// ユーザーが存在する場合はログイン処理
			user, err := function.GetUserData([]string{"Email = ?"}, []interface{}{email})

			if user.Email == "" || err != nil {
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレスまたはパスワードが間違っています"})
				return
			}

			err = function.UpdateUser(user.ID, map[string]interface{}{
				"name":      payload.Name,
				"google_id": payload.Id,
			})

			// トークン生成
			var token_data function.User
			token_data.ID = user.ID
			token_data.Email = user.Email
			token_data.Name = payload.Name
			token_data.Limit = 1

			token, err := function.GenerateToken(&token_data)

			if err != nil {
				http.Error(w, "Could not generate token", http.StatusInternalServerError)
				return
			}

			// refresh_tokenをOnlyクッキーに
			err = function.SetRefreshToken(w, &token_data)

			if err != nil {
				http.Error(w, "Could not set refresh token", http.StatusInternalServerError)
				return
			}

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
		user := function.SqlUser{
			Email:    email,
			Name:     payload.Name,
			GoogleID: payload.Id,
		}

		// スクエアのカスタマーを作成
		squareResponse, err := function.CreateCustomer(user)
		if err != nil {
			log.Fatalf("Error creating customer: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザーの作成に失敗しました"})
			return
		}
		user.ID = squareResponse

		prm, err := function.StructToMap(user)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザーの作成に失敗しました"})
			return
		}
		// ユーザーを作成
		err = function.SaveUser(prm)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザーの作成に失敗しました"})
			return
		}

		// プロフィールを作成
		err = function.SaveProfile(user.ID, map[string]interface{}{})
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザーの作成に失敗しました"})
			return
		}

		//　アクセストークンとリフレッシュトークンを生成
		var token_data function.User
		token_data.ID = user.ID
		token_data.Email = user.Email
		token_data.Name = user.Name
		token_data.Limit = 1

		token, err = function.GenerateToken(&token_data)

		if err != nil {
			http.Error(w, "Could not generate token", http.StatusInternalServerError)
			return
		}

		// refresh_tokenをOnlyクッキーに
		err = function.SetRefreshToken(w, &token_data)
		if err != nil {
			http.Error(w, "Could not set refresh token", http.StatusInternalServerError)
			return
		}

		response := TokenResponse{
			AccessToken: token,
			TokenType:   "Bearer",
			ExpiresIn:   3600,
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	// サーバーを起動
	log.Fatal(http.ListenAndServe(":4000", handler))
}
