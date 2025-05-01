package main

import (
	"animaloop/config"
	"animaloop/function"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

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
		AllowedMethods:       []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
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
		token, err := function.GenerateToken(&token_data)

		if err != nil {
			http.Error(w, "Could not generate token", http.StatusInternalServerError)
			return
		}

		function.SetRefreshToken(w, &token_data)

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
			log.Println(err)
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
			"history":      history,
			"favorites":    favorites,
			"user":         user,
			"access_token": token,
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
	r.HandleFunc("/customer/data", func(w http.ResponseWriter, r *http.Request) {
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
		userData, erro := function.GetUserDataAndProfile([]string{"u.ID=?"}, []interface{}{claims.ID})
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + erro.Error()})
			return
		}

		response := map[string]interface{}{
			"user":  userData,
			"token": token,
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	// ユーザー情報取得
	r.HandleFunc("/profile/get", func(w http.ResponseWriter, r *http.Request) {
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

		// ユーザー情報取得
		userData, erro := function.GetUserData([]string{"id = ?"}, []interface{}{claims.ID})
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "userデータの取得に失敗しました: " + erro.Error()})
			return
		}

		// プロフィール情報取得
		profileData, erro := function.GetProfile(claims.ID)
		if erro != nil {
			log.Println("DB取得失敗:", erro)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "profileデータの取得に失敗しました: " + erro.Error()})
			return
		}

		// ユーザー情報とプロフィール情報を結合
		response := map[string]interface{}{
			"Name":         userData.Name,
			"Email":        userData.Email,
			"DateOfBirth":  profileData.DateOfBirth,
			"Gender":       profileData.Gender,
			"PhoneNumber":  profileData.PhoneNumber,
			"Bio":          profileData.Bio,
			"IconURL":      profileData.IconURL,
			"access_token": token,
		}

		log.Println("ユーザー情報取得:", response)

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	// ユーザー情報更新
	r.HandleFunc("/profile/edit", func(w http.ResponseWriter, r *http.Request) {
		// 1. multipart/form-dataのリクエストを処理するために、最初にリクエストの解析を行う
		err := r.ParseMultipartForm(10 << 20) // 例えば最大10MBのフォームデータを許可
		if err != nil {
			http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
			return
		}

		token, erro := function.CheckUser(w, r)
		if erro != "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		// トークンからIdを取得
		claims, err := function.GetUserFromToken(token)
		if err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		var request function.RequestUserProfile
		err = json.Unmarshal([]byte(r.FormValue("data")), &request)
		if err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// 初期値は空文字で
		var iconPath string

		// 画像がアップロードされているか確認
		file, _, err := r.FormFile("image")
		if err == nil {
			// 画像があるときだけ保存処理
			defer file.Close()

			dir := "./account_data/icon/"
			react_dir := "/static/icon/"
			if _, err := os.Stat(dir); os.IsNotExist(err) {
				if err := os.MkdirAll(dir, os.ModePerm); err != nil {
					http.Error(w, "Failed to create directory", http.StatusInternalServerError)
					return
				}
			}

			fileName := fmt.Sprintf("icon_%s.png", claims.ID)
			iconPath = react_dir + fileName

			outFile, err := os.Create(dir + fileName)
			if err != nil {
				http.Error(w, "Failed to save file", http.StatusInternalServerError)
				return
			}
			defer outFile.Close()

			if _, err := io.Copy(outFile, file); err != nil {
				http.Error(w, "Failed to write file", http.StatusInternalServerError)
				return
			}
		} else {
			// 画像が送信されていない場合は何もしない
			log.Println("✅ No image uploaded, keeping existing IconURL")
		}

		log.Println(file)

		// ユーザー情報を取得
		user := function.SqlUser{
			ID:    claims.ID,
			Name:  request.Name,
			Email: request.Email,
		}

		// 既存プロフィールを取得（←これがキモ！）
		existingProfile, _ := function.GetProfile(claims.ID)

		profile := function.Profile{
			DateOfBirth: request.DateOfBirth,
			Gender:      request.Gender,
			PhoneNumber: request.PhoneNumber,
			Bio:         request.Bio,
			IconURL:     existingProfile.IconURL, // デフォは今のやつ
		}

		// もし画像が新しくアップロードされてたら、差し替え
		if iconPath != "" {
			profile.IconURL = iconPath
		}

		user_map, err := function.StructToMap(user)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "map変換に失敗しました"})
			return
		}
		// ユーザー情報更新
		err = function.UpdateUser(claims.ID, user_map)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザーユーザーデータの更新に失敗しました： " + err.Error()})
			return
		}

		profile_map, err := function.StructToMap(profile)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "map変換に失敗しました"})
			return
		}

		// プロフィール情報更新
		err = function.UpdateProfile(claims.ID, profile_map)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "プロフィールの更新に失敗しました： " + err.Error()})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "ユーザー情報を更新しました"})
	})

	// アドレスの更新
	r.HandleFunc("/address/edit", func(w http.ResponseWriter, r *http.Request) {
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
		var address function.Address
		erro = json.NewDecoder(r.Body).Decode(&address)
		if erro != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		address_map, erro := function.StructToMap(address)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの更新に失敗しました"})
			return
		}

		if address.ID == "" {
			// アドレスの新規保存
			address_map["UserID"] = claims.ID
			erro = function.SaveAddress(address_map)
		} else {
			// アドレスの更新
			erro = function.UpdateAddress(address.ID, address_map)
		}

		if address.IsDefault == true {
			// デフォルトアドレスの更新
			erro = function.SetDefaultAddress(claims.ID, address.ID)
		}

		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの更新に失敗しました" + erro.Error()})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "住所を更新しました"})
	})

	// アドレスの取得
	r.HandleFunc("/address/get", func(w http.ResponseWriter, r *http.Request) {
		_, err := function.CheckUser(w, r)
		if err != "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		//　postからIDを取得
		var address function.Address
		erro := json.NewDecoder(r.Body).Decode(&address)
		if erro != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// アドレスの取得
		addressData, erro := function.GetAddress(address.ID)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました" + erro.Error()})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(addressData)
	})

	// アドレスの削除
	r.HandleFunc("/address/delete", func(w http.ResponseWriter, r *http.Request) {
		_, err := function.CheckUser(w, r)
		if err != "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		//　postからIDを取得
		var address function.Address
		erro := json.NewDecoder(r.Body).Decode(&address)
		if erro != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// アドレスの削除
		erro = function.DeleteAddress(address.ID)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの削除に失敗しました"})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "住所を削除しました"})
	})

	//アドレスリストの取得
	r.HandleFunc("/address/list", func(w http.ResponseWriter, r *http.Request) {
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

		// アドレスリストの取得
		addressData, erro := function.GetAddressList(claims.ID)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました" + erro.Error()})
			return
		}

		response := map[string]interface{}{
			"address": addressData,
			"count":   len(addressData),
			"token":   token,
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	r.HandleFunc("/api/card/save", func(w http.ResponseWriter, r *http.Request) {
		token, err := function.CheckUser(w, r)
		if err != "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		// リクエストボディからカード情報を取得
		var card function.RequestCard
		erro := json.NewDecoder(r.Body).Decode(&card)
		if erro != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		log.Println(card)

		// カード情報を保存
		card_map, erro := function.CreateCard(card)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの保存に失敗しました"})
			return
		}
		log.Println(card_map)

		// レスポンス
		response := map[string]interface{}{
			"card":  card_map,
			"token": token,
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	// クレジットカードでの支払い
	r.HandleFunc("/api/card/charge", func(w http.ResponseWriter, r *http.Request) {
		token, err := function.CheckUser(w, r)
		if err != "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		//　トークンからIDを取得
		claims, erro := function.GetUserFromToken(token)
		if erro != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		// リクエストボディから支払い情報を取得
		var charge function.RequestCharge
		erro = json.NewDecoder(r.Body).Decode(&charge)
		if erro != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		log.Println(charge)
		// 支払い処理
		url, erro := function.ChargeCard(claims.ID, charge.CardID, charge.Amount)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "支払いに失敗しました" + erro.Error()})
			return
		}
		log.Println("支払い成功")

		// 購入履歴を保存

		htmlContent := fmt.Sprintf(`<h3>%s様</h3><br />
		<P>ご購入ありがとうございます。</p><br />
		<p>以下の内容でお支払いが完了しました。</p><br />
		<p>金額: %d円</p><br />
		<p>購入日時: %s</p><br />
		<p>お支払い方法: クレジットカード</p><br />
		<p>領収書は以下のリンクからダウンロードできます。</p><br />
		<p><a href="%s">領収書をダウンロードする</a></p><br />
		<p>ご不明な点がございましたら、お気軽にお問い合わせください。</p><br />
		<p>今後とも、Animaloopをどうぞよろしくお願いいたします。</p><br />
		<p>Animaloopサポートチーム</p>
		`, claims.Name, charge.Amount, url, time.Now().Format("2006-01-02 15:04:05"))

		// 支払い完了メールを送
		mailjetClient := mailjet.NewMailjetClient(config.MAILJET_API_KEY, config.MAILJET_API_SECRET)
		// メールの内容を設定
		messagesInfo := []mailjet.InfoMessagesV31{
			{
				From: &mailjet.RecipientV31{
					Email: config.FromEmail,
					Name:  config.FromName,
				},
				To: &mailjet.RecipientsV31{
					mailjet.RecipientV31{
						Email: claims.Email,
						Name:  claims.Name,
					},
				},
				Subject:  "Payment Confirmation",
				TextPart: "Dear " + claims.Name + ", your payment was successful!",
				HTMLPart: htmlContent,
			},
		}
		// メール送信
		messages := mailjet.MessagesV31{Info: messagesInfo}
		res, erro := mailjetClient.SendMailV31(&messages)

		if erro != nil {
			log.Fatalf("Failed to send email: %s", erro)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "メールの送信に失敗しました"})
			return
		}
		log.Printf("Email sent: %+v", res)
		log.Println("支払い完了メール送信成功")
	})

	// クレジットの住所の保存
	r.HandleFunc("/api/card/address", func(w http.ResponseWriter, r *http.Request) {
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

		// リクエストボディから住所とクレジットカード情報を取得
		var user_data function.RequestCardWithAddress
		erro = json.NewDecoder(r.Body).Decode(&user_data)
		if erro != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		log.Println(user_data)

		erro = function.SaveOrUpdateCardAddress(claims.ID, user_data.CardID, user_data.AddressID)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの保存に失敗しました: " + erro.Error()})
			return
		}
		log.Println("カードと住所の保存成功")

		// カード情報を取得
		cardData, erro := function.LoadUserAndCards(token)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + erro.Error()})
			return
		}

		// レスポンス
		response := map[string]interface{}{
			"card":    cardData,
			"count":   len(cardData),
			"message": "カードと住所を保存しました",
			"token":   token,
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)

	})

	//　クレジットカードリストの取得
	r.HandleFunc("/api/card/list", func(w http.ResponseWriter, r *http.Request) {
		token, err := function.CheckUser(w, r)
		if err != "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		cardData, erro := function.LoadUserAndCards(token)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + erro.Error()})
			return
		}

		response := map[string]interface{}{
			"card":  cardData,
			"count": len(cardData),
			"token": token,
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	// クレジットカードの削除
	r.HandleFunc("/api/card/delete", func(w http.ResponseWriter, r *http.Request) {
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

		// リクエストボディから削除するカードのIDを取得
		var card function.RequestCharge
		erro = json.NewDecoder(r.Body).Decode(&card)
		if erro != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		log.Println(card)

		erro = function.DeleteCardAddress(claims.ID,card.CardID)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの削除に失敗しました" + erro.Error()})
			return
		}

		// カードの削除
		erro = function.DeleteCard(card.CardID)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの削除に失敗しました" + erro.Error()})
			return
		}
		log.Println("カード削除成功")

		cardData, erro := function.LoadUserAndCards(token)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + erro.Error()})
			return
		}

		// レスポンス
		response := map[string]interface{}{
			"card":    cardData,
			"count":   len(cardData),
			"message": "カードを削除しました",
			"token":   token,
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	// カードのデフォルト設定
	r.HandleFunc("/api/card/default", func(w http.ResponseWriter, r *http.Request) {
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
		// リクエストボディからデフォルトにするカードのIDを取得
		var card function.RequestCharge
		erro = json.NewDecoder(r.Body).Decode(&card)
		if erro != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// カードのデフォルト設定
		erro = function.SetDefaultCard(claims.ID, card.CardID)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "デフォルトカードの設定に失敗しました" + erro.Error()})
			return
		}
		log.Println("デフォルトカード設定成功")

		cardData, erro := function.LoadUserAndCards(token)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + erro.Error()})
			return
		}

		// レスポンス
		response := map[string]interface{}{
			"card":    cardData,
			"count":   len(cardData),
			"message": "デフォルトカードを設定しました",
			"token":   token,
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	// カードのアドレス情報の取得
	r.HandleFunc("/api/card/address/get", func(w http.ResponseWriter, r *http.Request) {
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
		// リクエストボディからカードのIDを取得
		var card function.RequestCharge
		erro = json.NewDecoder(r.Body).Decode(&card)
		if erro != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// カードのアドレス情報を取得
		addressData, erro := function.GetCardAddress(claims.ID, card.CardID)
		if erro != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + erro.Error()})
			return
		}

		response := map[string]interface{}{
			"address": addressData,
			"token":   token,
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	//googleログインGo
	r.HandleFunc("/auth/google", func(w http.ResponseWriter, r *http.Request) {
		// トークンを取得(psotリクエスト)
		var get function.Token

		// Decode 成功＋Tokenあり を同時にチェック！
		err := json.NewDecoder(r.Body).Decode(&get)
		if err != nil || get.Token == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "トークンが不正です"})
			return
		}
		log.Println("googleトークン：", get.Token)
		var token = get.Token

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
		email := payload["email"].(string)
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
				"name":      payload["name"].(string),
				"google_id": payload["sub"].(string),
			})

			// トークン生成
			var token_data function.User
			token_data.ID = user.ID
			token_data.Email = user.Email
			token_data.Name = payload["name"].(string)
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
			Name:     payload["name"].(string),
			GoogleID: payload["sub"].(string),
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

	r.PathPrefix("/static/icon/").Handler(
		http.StripPrefix("/static/icon/", http.FileServer(http.Dir("./account_data/icon"))),
	)

	// サーバーを起動
	log.Fatal(http.ListenAndServe(":4000", handler))
}
