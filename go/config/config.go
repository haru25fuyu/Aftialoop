package config

import (
	"log"
	"os"
	"sync/atomic"
	"time"

	//_ "github.com/go-function-driver/mysql"
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

const googleOAuthClientID = "301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com"

var googleOAuthClientSecret string

// MySQL接続情報
const DB_user = "admin"
const DB_password = "hU3!K1%26LOSfK"
const DB_host = "localhost"
const DB_port = "3306"
const DB_name = "Animaloop"
const DB_charset = "utf8mb4"

const FromEmail = "info@aftialoop.com"
const FromName = "Animaloop"
const FromEmailPassword = "Animaloop1234"

const JwksURL = "https://www.googleapis.com/oauth2/v3/certs"

var MAILJET_API_KEY, MAILJET_API_SECRET, SQUARE_ACCESS_TOKEN string
var SECRET_KEY, SECRET_REFRESH_KEY []byte

var SquareClient = client.NewClient()

const ProjectID = "animaloop-1745409062037"
const RecaptchaKey = "6LfsB0MrAAAAAEUuEF6fsTYOxYTx6dUYxU_cjRX4"
const RecaptchaAction = "LOGIN"

type OrderStatus int

const (
	OrderStatusPending   OrderStatus = iota + 1 // 1: 未決済
	OrderStatusPaid                             // 2: 決済済み
	OrderStatusPreparing                        // 3: 発送準備中
	OrderStatusShipped                          // 4: 発送済み
	OrderStatusDelivered                        // 5: 配送完了
	OrderStatusCancelled                        // 6: キャンセル
	OrderStatusReturned                         // 7: 返品中
	OrderStatusRefunded                         // 8: 返金済み
)

// フリマのアイテムステータス
const (
	FleaItemStatusActive    = 0 // 出品中
	FleaItemStatusSold      = 1 // 売却済み
	FleaItemStatusTrading   = 2 // 取引中
	FleaItemStatusCancelled = 3 // 出品取消
)

const (
	CarrierJP        = "JP"
	CarrierYamato    = "YAMATO"
	AreaNameSamePref = "県内" // DBのshipping_areas.nameと一致させる
)

type FleaConfig struct {
	BaseRate       int64
	MaxRate        int64
	RateDen        int64
	CommissionRate int64
	UpdatedAt      time.Time
}

func IsProduction() bool {
	return os.Getenv("ENV") == "production"
}

func GetFleaConfig() FleaConfig {
	v := FleaCfg.Load()
	if v == nil {
		return FleaConfig{BaseRate: 10200, MaxRate: 11000, RateDen: 10000, CommissionRate: 1000} // 最低限のフォールバック
	}
	return *v.(*FleaConfig)
}

var FleaCfg atomic.Value // FleaConfig を入れる

func Init() {
	// MySQL接続
	var err error

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

	if IsProduction() {
		SQUARE_ACCESS_TOKEN = os.Getenv("SQUARE_PRODUCTION_TOKEN")
	} else {
		SQUARE_ACCESS_TOKEN = os.Getenv("SQUARE_SANDBOX_TOKEN")
	}

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
