package config

import (
	"log"
	"os"
	"sync/atomic"
	"time"

	"github.com/joho/godotenv"
	stripe "github.com/stripe/stripe-go/v76"
)

var AllowedOrigins = []string{
	"https://aftialoop.com",
	"https://dev.aftialoop.com",
	"http://localhost:3000",
}

const GoogleOAuthClientID = "301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com"

var GoogleOAuthClientSecret string

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

var FromEmailPassword string

const JwksURL = "https://www.googleapis.com/oauth2/v3/certs"

var MAILJET_API_KEY, MAILJET_API_SECRET string
var SECRET_KEY, SECRET_REFRESH_KEY []byte

const ProjectID = "animaloop-1745409062037"
const RecaptchaKey = "6LfsB0MrAAAAAEUuEF6fsTYOxYTx6dUYxU_cjRX4"
const RecaptchaAction = "LOGIN"

type OrderStatus int

const (
	OrderStatusPending OrderStatus = iota + 1
	OrderStatusPaid
	OrderStatusPreparing
	OrderStatusShipped
	OrderStatusDelivered
	OrderStatusCancelled
	OrderStatusReturned
	OrderStatusRefunded
)

const (
	FleaItemStatusDraft     = 0
	FleaItemStatusActive    = 1
	FleaItemStatusTrading   = 2
	FleaItemStatusSold      = 3
	FleaItemStatusCancelled = 4
)

const (
	TxStatusRequested    = "REQUESTED"
	TxStatusAccepted     = "ACCEPTED"
	TxStatusPending      = "PENDING"
	TxStatusPaid         = "PAID"
	TxStatusShipped      = "SHIPPED"
	TxStatusRatedByBuyer = "RATED_BY_BUYER"
	TxStatusCompleted    = "COMPLETED"
	TxStatusCancelled    = "CANCELLED"
)

const (
	CarrierJP        = "JP"
	CarrierYamato    = "YAMATO"
	AreaNameSamePref = "県内"
)

const (
	IdentityStatusNone     = "NONE"
	IdentityStatusPending  = "PENDING"
	IdentityStatusApproved = "APPROVED"
	IdentityStatusRejected = "REJECTED"
)

const (
	ReportReasonSpam                 = "spam"
	ReportReasonInappropriateContent = "inappropriate_content"
	ReportReasonHarassment           = "harassment"
	ReportReasonFakeItem             = "fake_item"
	ReportReasonOther                = "other"
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

var FleaCfg atomic.Value

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

func Init() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system env variables")
	}

	// DB
	DB_user = os.Getenv("DB_USER")
	DB_password = os.Getenv("DB_PASSWORD")
	DB_host = os.Getenv("DB_HOST")
	DB_port = os.Getenv("DB_PORT")
	DB_name = os.Getenv("DB_NAME")

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

	// メール・認証
	MAILJET_API_KEY = os.Getenv("MAILJET_API_KEY")
	MAILJET_API_SECRET = os.Getenv("MAILJET_API_SECRET")
	FromEmailPassword = os.Getenv("FROM_EMAIL_PASSWORD")
	SECRET_KEY = []byte(os.Getenv("SECRET_KEY"))
	SECRET_REFRESH_KEY = []byte(os.Getenv("SECRET_REFRESH_KEY"))
	GoogleOAuthClientSecret = os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET")

	// Stripe 初期化
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
	log.Println("Stripe initialized")
}
