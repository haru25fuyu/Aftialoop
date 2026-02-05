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
const DB_user = "aftia_user"
const DB_password = "aG7^HMAsGU@p"
const DB_host = "localhost"
const DB_port = "3306"
const DB_name = "aftialoop"
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
	FleaItemStatusDraft     = 0 // 下書き
	FleaItemStatusActive    = 1 // 出品中
	FleaItemStatusTrading   = 2 // 取引中
	FleaItemStatusSold      = 3 // 売却済み
	FleaItemStatusCancelled = 4 // 出品取消
)

const (
	TxStatusRequested    = "REQUESTED"      // 購入申請中
	TxStatusAccepted     = "ACCEPTED"       // 承認済み（支払い待ち）
	TxStatusPending      = "PENDING"        // 支払い待ち（即時決済待ちなど）
	TxStatusPaid         = "PAID"           // 支払い完了（発送待ち）
	TxStatusShipped      = "SHIPPED"        // 発送済み
	TxStatusRatedByBuyer = "RATED_BY_BUYER" // 購入者評価済み
	TxStatusCompleted    = "COMPLETED"      // 取引完了
	TxStatusCancelled    = "CANCELLED"      // キャンセル済み
)

const (
	CarrierJP        = "JP"
	CarrierYamato    = "YAMATO"
	AreaNameSamePref = "県内" // DBのshipping_areas.nameと一致させる
)

const (
	IdentityStatusNone     = "NONE"     // 本人確認未提出
	IdentityStatusPending  = "PENDING"  // 本人確認審査中
	IdentityStatusApproved = "APPROVED" // 本人確認承認済み
	IdentityStatusRejected = "REJECTED" // 本人確認拒否済み
)

type FleaConfig struct {
	BaseRate        int64
	MaxRate         int64
	RateDen         int64
	CommissionRate  int64
	TransferFee     int64
	MinPayoutAmount int64
	UpdatedAt       time.Time
}

func IsProduction() bool {
	return os.Getenv("ENV") == "production"
}

func GetFleaConfig() FleaConfig {
	v := FleaCfg.Load()
	if v == nil {
		return FleaConfig{
			BaseRate:        10200,
			MaxRate:         11000,
			RateDen:         10000,
			CommissionRate:  1000,
			TransferFee:     200,
			MinPayoutAmount: 201,
		}
	}
	return *v.(*FleaConfig)
}

var FleaCfg atomic.Value // FleaConfig を入れる

func Init() {
	// 1. 先に .env を読み込む (環境変数を使うため一番上が良い)
	var err error
	err = godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using system env variables")
	}

	// 環境変数のセット
	MAILJET_API_KEY = os.Getenv("MAILJET_API_KEY")
	MAILJET_API_SECRET = os.Getenv("MAILJET_API_SECRET")

	SECRET_KEY = []byte(os.Getenv("SECRET_KEY"))
	SECRET_REFRESH_KEY = []byte(os.Getenv("SECRET_REFRESH_KEY"))

	googleOAuthClientSecret = os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET")

	// 3. Squareの環境設定 (URLも切り替える)
	var squareEnv string // 環境URL用変数

	if IsProduction() {
		SQUARE_ACCESS_TOKEN = os.Getenv("SQUARE_PRODUCTION_TOKEN")
		squareEnv = square.Environments.Production // 本番用URL
	} else {
		SQUARE_ACCESS_TOKEN = os.Getenv("SQUARE_SANDBOX_TOKEN")
		squareEnv = square.Environments.Sandbox // テスト用URL
	}

	// Squareのクライアントを初期化
	SquareClient = client.NewClient(
		option.WithBaseURL(squareEnv), // 変数を使うように変更
		option.WithToken(SQUARE_ACCESS_TOKEN),
	)
}
