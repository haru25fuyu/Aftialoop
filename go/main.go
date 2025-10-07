package main

import (
	"animaloop/config"
	"animaloop/function"
	"animaloop/page"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
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
	db, err := function.NewDatabase()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	log.Println("Server started on: http://localhost:4000")

	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello World!"))
	})

	r.HandleFunc("/name", func(w http.ResponseWriter, r *http.Request) {

	})

	// ユーザーデータのハンドラを登録
	userDataHandler := page.NewUserDataHandler(db)
	userDataHandler.RegisterRoutes(r)
	// アドレスのハンドラを登録
	addressHandler := page.NewAddressHandler(db)
	addressHandler.RegisterRoutes(r)
	// ログインのハンドラを登録
	loginHandler := page.NewLoginHandler(db)
	loginHandler.RegisterRoutes(r)
	// サインアップのハンドラを登録
	signupHandler := page.NewSignupHandler(db)
	signupHandler.RegisterRoutes(r)
	// カートのハンドラを登録
	cartHandler := page.NewCartHandler(db)
	cartHandler.RegisterRoutes(r)
	// カードのハンドラを登録
	cardHandler := page.NewCardHandler(db)
	cardHandler.RegisterRoutes(r)
	// ポイントのハンドラを登録
	pointHandler := page.NewPointHandler(db)
	pointHandler.RegisterRoutes(r)
	// 商品のハンドラを登録
	itemHandler := page.NewItemHandler(db)
	itemHandler.RegisterRoutes(r)
	// フリマのハンドラを登録
	FleaMarketHandler := page.NewFleaMarketHandler(db)
	FleaMarketHandler.RegisterRoutes(r)

	// トークンからユーザーidを取得トークンの更新
	r.HandleFunc("/refresh", func(w http.ResponseWriter, r *http.Request) {
		token, err := function.CheckUser(db, w, r)
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

	// サーバーを起動
	log.Fatal(http.ListenAndServe(":4000", handler))
}
