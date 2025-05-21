package config

import (
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	"github.com/square/square-go-sdk"
	client "github.com/square/square-go-sdk/client"
	"github.com/square/square-go-sdk/option"
)

var AllowedOrigins = []string{
	"https://aftialoop.com",
	"https://dev.aftialoop.com",
	"http://localhost:3000",
	// 他の許可したいオリジンを追加
}

var googleOAuthClientID = "301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com"
var googleOAuthClientSecret string;

// MySQL接続情報
var DB *sqlx.DB
var DB_user = "admin"
var DB_password = "hU3!K1%26LOSfK"
var DB_host = "localhost"
var DB_port = "3306"
var DB_name = "Animaloop"
var DB_charset = "utf8mb4"

var FromEmail = "info@aftialoop.com"
var FromName = "Animaloop"
var FromEmailPassword =	"Animaloop1234"

var MAILJET_API_KEY, MAILJET_API_SECRET, SQUARE_ACCESS_TOKEN string
var SECRET_KEY, SECRET_REFRESH_KEY []byte

var SquareClient = client.NewClient()

var ProjectID = "animaloop-1745409062037"
var RecaptchaKey = "6LfsB0MrAAAAAEUuEF6fsTYOxYTx6dUYxU_cjRX4"
var RecaptchaAction = "LOGIN"


func Init() {
	// MySQL接続
	var err error
	dsn := DB_user + ":" + DB_password + "@tcp(" + DB_host + ":" + DB_port + ")/" + DB_name + "?charset=" + DB_charset
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

	SECRET_KEY = []byte(os.Getenv("SECRET_KEY"))
	SECRET_REFRESH_KEY = []byte(os.Getenv("SECRET_REFRESH_KEY"))

	SQUARE_ACCESS_TOKEN = os.Getenv("SQUARE_SANDBOX_TOKEN")

	googleOAuthClientSecret = os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET")

	// Squareのクライアントを初期化
	SquareClient = client.NewClient(
		option.WithBaseURL(
			square.Environments.Sandbox,
		),
		option.WithToken(
			SQUARE_ACCESS_TOKEN,
		),
	)

}


