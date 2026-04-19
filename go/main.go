package main

import (
	"animaloop/config"
	"animaloop/function"
	"animaloop/handler"
	flea "animaloop/handler/flea_market"
	SQL "animaloop/sql"
	"animaloop/utils"

	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	// ===== 初期設定 =====
	config.Init()
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}


	// DB初期化
	db, err := SQL.NewDatabase()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	if err := function.InitConfig(db); err != nil {
		log.Fatalf("InitConfig failed: %v", err)
	}

	utils.InitRedis()

	// ===== ルーター作成 =====
	r := mux.NewRouter()

	// 静的ファイル（/static/...）を登録
	fs := http.FileServer(http.Dir("./static"))
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", fs))

	// ===== 各ハンドラ登録 =====
	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello World!"))
	})

	// APIルート
	handler.NewUserDataHandler(db).RegisterRoutes(r)
	handler.NewAddressHandler(db).RegisterRoutes(r)
	handler.NewLoginHandler(db).RegisterRoutes(r)
	handler.NewSignupHandler(db).RegisterRoutes(r)
	handler.NewCartHandler(db).RegisterRoutes(r)
	handler.NewCardHandler(db).RegisterRoutes(r)
	handler.NewPointHandler(db).RegisterRoutes(r)
	handler.NewItemHandler(db).RegisterRoutes(r)
	handler.NewPaymentHandler(db).RegisterRoutes(r)
	handler.NewShippingHandler(db).RegisterRoutes(r)
	handler.NewSNSHandler(db).RegisterRoutes(r)
	handler.NewBankHandler(db).RegisterRoutes(r)
	handler.NewSMSHandler(db).RegisterRoutes(r)
	handler.NewEmailHandler(db).RegisterRoutes(r)
	handler.NewPasswordHandler(db).RegisterRoutes(r)
	handler.NewContactHandler(db).RegisterRoutes(r)
	handler.NewNotificationHandler(db).RegisterRoutes(r)
	handler.NewCategoryHandler(db).RegisterRoutes(r)

	flea.NewFleaMarketHandler(db).RegisterRoutes(r)

	// トークン更新ルート
	r.HandleFunc("/auth/refresh", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		c, err := r.Cookie("refresh_token")
		if err != nil {
			log.Println("[refresh] cookie read error:", err)
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		if c.Value == "" {
			log.Println("[refresh] refresh_token is empty")
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		user, expUnix, err := db.GetUserByRefreshToken(c.Value)
		if err != nil {
			log.Println("[refresh] GetUserByRefreshToken failed:", err)
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		user.Limit = 15 * 60
		access, err := function.GenerateToken(user)
		if err != nil {
			log.Println("[refresh] GenerateToken failed:", err)
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}

		if time.Until(time.Unix(expUnix, 0)) < 7*24*time.Hour {
			newRefresh := function.MustRandom(64)
			newExp := time.Now().UTC().Add(14 * 24 * time.Hour)

			if err := db.RotateRefreshToken(user.ID, c.Value, newRefresh, newExp); err != nil {
				log.Println("[refresh] RotateRefreshToken failed:", err)
				http.Error(w, "server error", http.StatusInternalServerError)
				return
			}
			function.SetRefreshCookie(w, newRefresh, newExp)
		}

		w.Header().Set("X-New-Access-Token", access)
		w.WriteHeader(http.StatusNoContent)
	})

	r.HandleFunc("/me", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		token := strings.TrimPrefix(auth, "Bearer ")
		u, err := function.GetUserFromToken(token)
		if err != nil || u == nil || u.ID == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// DBから最新プロフィール（表示用だけ）
		profile, err := db.GetUserDataAndProfile([]string{"u.id=$1"}, []interface{}{u.ID}) // displayName/iconUrlを返す関数を作る
		if err != nil {
			log.Println("DB error:", err)
			http.Error(w, "server error"+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"user": map[string]any{
				"name":    profile.Name,
				"iconUrl": profile.IconURL,
			},
		})
	})

	// ===== CORS設定 =====
	corsOptions := cors.New(cors.Options{
		AllowedOrigins:       config.AllowedOrigins, // 例: []string{"https://dev.aftialoop.com"}
		AllowedMethods:       []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:       []string{"*"},
		ExposedHeaders:       []string{"x-new-access-token"},
		AllowCredentials:     true,
		OptionsSuccessStatus: http.StatusOK,
	})

	handler := corsOptions.Handler(r)

	// ===== サーバー起動 =====
	log.Println("Server started on: https://go.aftialoop.com (port 8080)")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
