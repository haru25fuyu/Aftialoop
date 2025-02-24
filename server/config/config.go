package config

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"golang.org/x/oauth2"
)

var allowedOrigins = []string{
	"https://animaloop.jp",
	"https://dev.animaloop.jp",
	"http://34.28.36.10:3000",
	"http://34.28.36.10",
	"http://localhost:3000",
	// 他の許可したいオリジンを追加
}

var googleOAuthClientID = "301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com"

// MySQL接続情報
var DB *sql.DB

var MAILJET_API_KEY, MAILJET_API_SECRET, SECRET_KEY, SECRET_REFRESH_KEY, SQUARE_ACCESS_TOKEN string

func init() {
	// MySQL接続
	var err error
	dsn := "app-user:q+b4(F}{bH\"LzSQm@tcp(localhost:3306)/Animaloop"
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("MySQL接続エラー:", err)
	}

	err = godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using system env variables")
	}

	MAILJET_API_KEY = os.Getenv("MAILJET_API_KEY")
	MAILJET_API_SECRET = os.Getenv("MAILJET_API_SECRET")

	SECRET_KEY = os.Getenv("SECRET_KEY")
	SECRET_REFRESH_KEY = os.Getenv("SECRET_REFRESH_KEY")

	SQUARE_ACCESS_TOKEN = os.Getenv("SQUARE_ACCESS_TOKEN")
}

func corsHandler(w http.ResponseWriter, r *http.Request) {
	// CORS設定
	corsOptions := cors.New(cors.Options{
		AllowedOrigins:       allowedOrigins,
		AllowedMethods:       []string{"GET", "POST", "PUT", "DELETE"},
		AllowedHeaders:       []string{"Content-Type", "Authorization"},
		AllowCredentials:     true,
		OptionsSuccessStatus: http.StatusOK,
	})

	handler := corsOptions.Handler(http.DefaultServeMux)
	handler.ServeHTTP(w, r)
}

func googleOAuthHandler(w http.ResponseWriter, r *http.Request) {
	// Google OAuth2クライアント設定
	conf := &oauth2.Config{
		ClientID:     googleOAuthClientID,
		ClientSecret: "your-client-secret", // Google OAuth2シークレットを設定
		RedirectURL:  "your-redirect-url",  // リダイレクトURL
		Scopes:       []string{"openid"},   //　取得したい情報のスコープ
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://accounts.google.com/o/oauth2/v2/auth",
			TokenURL: "https://oauth2.googleapis.com/token",
		},
	}

	// Google OAuth2認証フロー
	code := r.URL.Query().Get("code")
	if code != "" {
		// 認証コードを使ってアクセストークンを取得
		token, err := conf.Exchange(r.Context(), code)
		if err != nil {
			http.Error(w, "OAuth2認証失敗", http.StatusUnauthorized)
			return
		}

		// 認証されたユーザーの情報を取得する処理を書く
		// 例えば、tokenを使ってユーザー情報を取得するなど
		fmt.Fprintf(w, "Access Token: %s", token.AccessToken)
	} else {
		// 認証URLにリダイレクトする処理
		authURL := conf.AuthCodeURL("", oauth2.AccessTypeOffline)
		http.Redirect(w, r, authURL, http.StatusFound)
	}
}
