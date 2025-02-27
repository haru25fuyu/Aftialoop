package config

import (
	"log"
	"net/http"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
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
var googleOAuthClientSecret string;

// MySQL接続情報
var DB *sqlx.DB

var MAILJET_API_KEY, MAILJET_API_SECRET, SECRET_KEY, SECRET_REFRESH_KEY, SQUARE_ACCESS_TOKEN string

func init() {
	// MySQL接続
	var err error
	dsn := "app-user:q+b4(F}{bH\"LzSQm@tcp(localhost:3306)/Animaloop"
	DB, err = sqlx.Open("mysql", dsn)
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

	googleOAuthClientSecret = os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET")

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


