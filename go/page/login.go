package page

import (
	"animaloop/function"
	"animaloop/utils"

	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// loginHandler は /login 系のエンドポイントをまとめたハンドラです
type loginHandler struct {
	db *function.Database
	// ここに DB やサービスを注入しても OK
}

// NewLoginHandler はハンドラのコンストラクタ
func NewLoginHandler(db *function.Database) *loginHandler {
	return &loginHandler{
		db: db,
	}
}


// RegisterRoutes がルーティングの登録を行います
func (h *loginHandler) RegisterRoutes(r *mux.Router) {
	// POST /login
	r.HandleFunc("/login", h.Login).Methods("POST")
	r.HandleFunc("/auth/google", h.googleLogin).Methods("POST")
}

func (h *loginHandler) Login(w http.ResponseWriter, r *http.Request) {
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

	user, err := h.db.GetUserData([]string{"Email = ?"}, []interface{}{query.Email})
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
	var token_data utils.User
	token_data.ID = user.ID
	token_data.Email = user.Email
	token_data.Name = user.Name
	token_data.Limit = 1
	token, err := function.GenerateToken(&token_data)

	if err != nil {
		http.Error(w, "Could not generate token", http.StatusInternalServerError)
		return
	}

	function.SetRefreshToken(h.db, w, &token_data)

	response := TokenResponse{
		AccessToken: token,
		TokenType:   "Bearer",
		ExpiresIn:   3600,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
	log.Println("ログイン成功", user.Email)
}

func (h *loginHandler) googleLogin(w http.ResponseWriter, r *http.Request) {
	// トークンを取得(psotリクエスト)
	var get utils.Token

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
	sql_mail, err := h.db.EmailCheck(email)
	square_mail := function.CheckSquareEmail(email)
	if sql_mail || square_mail {
		// ユーザーが存在する場合はログイン処理
		user, err := h.db.GetUserData([]string{"Email = ?"}, []interface{}{email})

		if user.Email == "" || err != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "メールアドレスまたはパスワードが間違っています"})
			return
		}

		err = h.db.UpdateUser(user.ID, map[string]interface{}{
			"name":      payload["name"].(string),
			"google_id": payload["sub"].(string),
		})

		// トークン生成
		var token_data utils.User
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
		err = function.SetRefreshToken(h.db, w, &token_data)

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
	user := utils.SqlUser{
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
	err = h.db.SaveUser(prm)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザーの作成に失敗しました"})
		return
	}

	// プロフィールを作成
	err = h.db.SaveProfile(user.ID, map[string]interface{}{})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザーの作成に失敗しました"})
		return
	}

	//　アクセストークンとリフレッシュトークンを生成
	var token_data utils.User
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
	err = function.SetRefreshToken(h.db, w, &token_data)
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
	log.Println("Googleログイン成功", user.Email)
}
