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

func main() {
	// ===== 初期設定 =====
	config.Init()

	// DB初期化
	db, err := function.NewDatabase()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// ===== ルーター作成 =====
	r := mux.NewRouter()

	// 静的ファイル（/static/...）を登録
	fs := http.FileServer(http.Dir("/var/www/web/Aftialoop/go/static"))
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", fs))

	// ===== 各ハンドラ登録 =====
	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello World!"))
	})

	// APIルート
	page.NewUserDataHandler(db).RegisterRoutes(r)
	page.NewAddressHandler(db).RegisterRoutes(r)
	page.NewLoginHandler(db).RegisterRoutes(r)
	page.NewSignupHandler(db).RegisterRoutes(r)
	page.NewCartHandler(db).RegisterRoutes(r)
	page.NewCardHandler(db).RegisterRoutes(r)
	page.NewPointHandler(db).RegisterRoutes(r)
	page.NewItemHandler(db).RegisterRoutes(r)
	page.NewFleaMarketHandler(db).RegisterRoutes(r)

	// トークン更新ルート
	r.HandleFunc("/refresh", func(w http.ResponseWriter, r *http.Request) {
		token, err := function.CheckUser(db, w, r)
		if err != "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		claims, erro := function.GetUserFromToken(token)
		if erro != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
			return
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"customerId": claims.ID})
	})

	// ===== CORS設定 =====
	corsOptions := cors.New(cors.Options{
		AllowedOrigins:       config.AllowedOrigins, // 例: []string{"https://dev.aftialoop.com"}
		AllowedMethods:       []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:       []string{"Content-Type", "Authorization"},
		AllowCredentials:     true,
		OptionsSuccessStatus: http.StatusOK,
	})

	handler := corsOptions.Handler(r)

	// ===== サーバー起動 =====
	log.Println("Server started on: https://go.aftialoop.com (port 4000)")
	log.Fatal(http.ListenAndServe(":4000", handler))
}
