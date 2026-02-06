package config

import (
	"log"
	"os"
	"sync/atomic"
	"time"

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

// ClientIDは公開情報のためハードコードでも可だが、Secretは必ず環境変数へ
const GoogleOAuthClientID = "301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com"

var GoogleOAuthClientSecret string

// MySQL接続情報 (constからvarに変更し、環境変数から代入)
var (
	DB_user     string
	DB_password string
	DB_host     string
	DB_port     string
	DB_name     string
	DB_charset  = "utf8mb4"
)

const FromEmail = "info@aftialoop.com"
const FromName = "Animaloop"

var FromEmailPassword string // 環境変数へ移動

const JwksURL = "https://www.googleapis.com/oauth2/v3/certs"

var MAILJET_API_KEY, MAILJET_API_SECRET, SQUARE_ACCESS_TOKEN string
var SECRET_KEY, SECRET_REFRESH_KEY []byte

var SquareClient *client.Client // 型を明示

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

// 通報理由コード (ReportUserModal.tsx と合わせる)
const (
	ReportReasonSpam                 = "spam"                  // スパム・宣伝目的
	ReportReasonInappropriateContent = "inappropriate_content" // 不適切なコンテンツ（画像・文章）
	ReportReasonHarassment           = "harassment"            // 嫌がらせ・誹謗中傷
	ReportReasonFakeItem             = "fake_item"             // 偽ブランド品・禁止商品の出品
	ReportReasonOther                = "other"                 // その他
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
	// 1. .env を読み込む
	var err error
	err = godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using system env variables")
	}

	// 2. 環境変数から設定値をロード
	// DB設定
	DB_user = os.Getenv("DB_USER")
	DB_password = os.Getenv("DB_PASSWORD")
	DB_host = os.Getenv("DB_HOST")
	DB_port = os.Getenv("DB_PORT")
	DB_name = os.Getenv("DB_NAME")

	// DB設定のデフォルト値フォールバック (必要に応じて)
	if DB_user == "" {
		DB_user = "aftia_user"
	}
	if DB_host == "" {
		DB_host = "localhost"
	}
	if DB_port == "" {
		DB_port = "3306"
	}
	if DB_name == "" {
		DB_name = "aftialoop"
	}

	// APIキー等
	MAILJET_API_KEY = os.Getenv("MAILJET_API_KEY")
	MAILJET_API_SECRET = os.Getenv("MAILJET_API_SECRET")
	FromEmailPassword = os.Getenv("FROM_EMAIL_PASSWORD")

	SECRET_KEY = []byte(os.Getenv("SECRET_KEY"))
	SECRET_REFRESH_KEY = []byte(os.Getenv("SECRET_REFRESH_KEY"))

	GoogleOAuthClientSecret = os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET")

	// 3. Squareの環境設定
	var squareEnv string

	if IsProduction() {
		SQUARE_ACCESS_TOKEN = os.Getenv("SQUARE_PRODUCTION_TOKEN")
		squareEnv = square.Environments.Production // 本番用URL
	} else {
		SQUARE_ACCESS_TOKEN = os.Getenv("SQUARE_SANDBOX_TOKEN")
		squareEnv = square.Environments.Sandbox // テスト用URL
	}

	// Squareのクライアントを初期化
	SquareClient = client.NewClient(
		option.WithBaseURL(squareEnv),
		option.WithToken(SQUARE_ACCESS_TOKEN),
	)
}
