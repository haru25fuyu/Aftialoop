package utils

import (
	"database/sql"
	"fmt"
	"time"
)

/* =========================
   定数
========================= */

const (
	SortByPrice  = "price"
	SortByNewest = "newest"
	SortAsc      = "asc"
	SortDesc     = "desc"
)

/* =========================
   ユーティリティ型
========================= */

// MySQLTime は time.Time のラッパーで、MySQL の DATETIME 型をスキャンするために使用
type MySQLTime time.Time

func (mt *MySQLTime) Scan(value interface{}) error {
	switch v := value.(type) {
	case time.Time:
		*mt = MySQLTime(v)
	case []byte:
		t, err := time.Parse("2006-01-02 15:04:05", string(v))
		if err != nil {
			return err
		}
		*mt = MySQLTime(t)
	case string:
		t, err := time.Parse("2006-01-02 15:04:05", v)
		if err != nil {
			return err
		}
		*mt = MySQLTime(t)
	default:
		return fmt.Errorf("unsupported type for MySQLTime: %T", value)
	}
	return nil
}

func (mt MySQLTime) Time() time.Time {
	return time.Time(mt)
}

/* =========================
   ユーザー関連
========================= */

// User (簡易版)
type User struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Email   string  `json:"email"`
	IconURL *string `json:"icon_url"`
	Exp     int64   `json:"exp"`
	Limit   int     `json:"limit"`
}

// SqlUser (usersテーブルの全カラムに対応)
type SqlUser struct {
	ID                 string         `db:"id" json:"id"`
	CustomerID         string         `db:"customer_id" json:"customer_id"`
	Name               string         `db:"name" json:"name"`
	Email              string         `db:"email" json:"email"`
	Point              int64          `db:"point" json:"point"`
	IconURL            *string        `db:"icon_url" json:"icon_url"`
	IdentityStatus     string         `db:"identity_status" json:"identity_status"`
	Password           string         `db:"password" json:"password"`
	GoogleID           sql.NullString `db:"google_id" json:"google_id"`
	AppleID            sql.NullString `db:"apple_id" json:"apple_id"`
	DefaultCard        string         `db:"default_card" json:"default_card"`
	FollowingCount     int            `db:"following_count" json:"following_count"`
	FollowersCount     int            `db:"followers_count" json:"followers_count"`
	SalesBalance       int64          `db:"sales_balance" json:"sales_balance"`
	SubEmail           *string        `db:"sub_email"`
	SubEmailVerifiedAt *time.Time     `db:"sub_email_verified_at"`
}

// PointHistoryItem: 1行分の履歴
type PointHistoryItem struct {
	ID        int64     `json:"id" db:"id"`
	Type      string    `json:"type" db:"type"`     // ACQUIRED, USED, EXPIRED...
	Amount    int       `json:"amount" db:"amount"` // +100, -500
	Note      string    `json:"note" db:"note"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`

	// もし balance_snapshot カラムがないなら、
	// ここはフロントで計算するか、一旦除外します
	// BalanceSnapshot int `json:"balance_snapshot"`
}

// PointHistoryResponse: APIレスポンス全体
type PointHistoryResponse struct {
	CurrentPoints int                `json:"current_points"`
	Histories     []PointHistoryItem `json:"histories"`
}

/* =========================
   プロフィール / 住所
========================= */

type Profile struct {
	DateOfBirth *string `db:"date_of_birth" json:"birth"`
	Gender      *string `db:"gender" json:"gender"`
	PhoneNumber *string `db:"phone_number" json:"phone"`
	Bio         *string `db:"bio" json:"bio"`
}

type RequestUserProfile struct {
	ID          string  `db:"id" json:"id"`
	Name        string  `db:"name" json:"name"`
	Email       string  `db:"email" json:"email"`
	DateOfBirth *string `db:"date_of_birth" json:"birth"`
	Gender      *string `db:"gender" json:"gender"`
	DefaultCard *string `db:"default_card" json:"default_card"`
	PhoneNumber *string `db:"phone_number" json:"phone"`
	Bio         *string `db:"bio" json:"bio"`
	IconURL     *string `db:"icon_url" json:"icon_url"`

	GoogleID *string `db:"google_id" json:"-"`
	AppleID  *string `db:"apple_id" json:"-"`

	IdentityStatus string `db:"identity_status" json:"identity_status"`

	FollowersCount int `db:"followers_count" json:"followersCount"`
	FollowingCount int `db:"following_count" json:"followingCount"`
}

type SqlResponsUserProfile struct {
	ID          string         `db:"id" json:"id"`
	Name        string         `db:"name" json:"name"`
	Email       string         `db:"email" json:"email"`
	DateOfBirth sql.NullString `db:"date_of_birth" json:"birth"`
	Gender      sql.NullString `db:"gender" json:"gender"`
	DefaultCard sql.NullString `db:"default_card" json:"default_card"`
	PhoneNumber sql.NullString `db:"phone_number" json:"phone_number"`
	Bio         sql.NullString `db:"bio" json:"bio"`
	IconURL     sql.NullString `db:"icon_url" json:"icon_url"`

	GoogleID sql.NullString `db:"google_id" json:"-"`
	AppleID  sql.NullString `db:"apple_id" json:"-"`

	IdentityStatus string `db:"identity_status" json:"identity_status"`

	FollowersCount int `db:"followers_count" json:"followersCount"`
	FollowingCount int `db:"following_count" json:"followingCount"`
}

type Address struct {
	ID       *string `db:"id" json:"id"`
	UserID   string  `db:"user_id" json:"user_id"`
	Name     *string `db:"name" json:"name"`
	Phone    *string `db:"phone" json:"phone"`
	PostCode *string `db:"post_code" json:"post_code"`
	Pref     *string `db:"pref" json:"pref"`
	PrefCode *int    `db:"pref_code" json:"pref_code"`
	Address1 *string `db:"address1" json:"address1"`
	Address2 *string `db:"address2" json:"address2"`
	Address3 *string `db:"address3" json:"address3"`
	Status   *bool   `db:"status" json:"status"`
}

/* =========================
   認証・決済
========================= */

type GoogleClaims struct {
	Email string `json:"email"`
	Name  string `json:"name"`
	Sub   string `json:"sub"`
}

type Token struct {
	Token string `db:"token" json:"token"`
}

type RequestCard struct {
	UserID            string `json:"userID"`
	Token             string `json:"token"`
	VerificationToken string `json:"verificationToken"`
	CustomerID        string `json:"customerID"`
	Name              string `json:"name"`
}

type RequestCharge struct {
	CustomerID string  `db:"customer_id" json:"customerID"`
	CardID     string  `db:"card_id" json:"cardID"`
	Amount     float64 `db:"amount" json:"amount"`
	Items      []Item  `json:"items"`
	AddressID  string  `db:"address_id" json:"addressID"`
}

type RequestCardWithAddress struct {
	CardID    string `db:"card_id" json:"cardID"`
	AddressID string `db:"address_id" json:"addressID"`
}

type CardSummary struct {
	ID        string `json:"id"`
	Brand     string `json:"cardBrand"`
	Last4     string `json:"last4"`
	ExpMonth  int    `json:"expMonth"`
	ExpYear   int    `json:"expYear"`
	Disabled  bool   `json:"disabled"`
	Name      string `json:"name"`
	IsDefault bool   `json:"isDefault"`
}

/* =========================
   商品（EC）
========================= */

type Item struct {
	ID           string    `db:"id" json:"id"`
	Name         string    `db:"name" json:"name"`
	Description  string    `db:"description" json:"description"`
	CostPrice    float64   `db:"cost_price" json:"cost_price"`
	Price        float64   `db:"price" json:"price"`
	Point        float64   `db:"point" json:"point"`
	MainImageURL string    `db:"main_image_url" json:"main_image_url"`
	Quantity     int       `db:"quantity" json:"quantity"`
	Status       int       `db:"status" json:"status"`
	IsSelected   bool      `db:"is_selected" json:"is_selected"`
	CreatedAt    MySQLTime `db:"created_at" json:"created_at"`
	UpdatedAt    MySQLTime `db:"updated_at" json:"updated_at"`
}

type ItemImage struct {
	ID      string `db:"id" json:"id"`
	ItemID  string `db:"item_id" json:"item_id"`
	URL     string `db:"url" json:"url"`
	SortNum int    `db:"sort_num" json:"sort_num"`
}

// ListItemsRequest は商品一覧の検索・並び替え・ページングのための共通パラメータです。
// DB 層（function）とハンドラ層（app）双方から参照できるよう utils に置きます。
type ListItemsRequest struct {
	CategoryID    *int    `json:"-"`
	SubCategoryID *int    `json:"-"`
	SearchQuery   *string `json:"-"`
	MinPrice      *int64  `json:"-"`
	MaxPrice      *int64  `json:"-"`
	SortBy        string  `json:"-"`
	SortOrder     string  `json:"-"`
	Page          int     `json:"-"`
	PageSize      int     `json:"-"`
}

/* =========================
   購入履歴
========================= */

type PurchaseHistory struct {
	ID            string    `db:"id" json:"id"`
	UserID        string    `db:"user_id" json:"user_id"`
	Items         []Item    `json:"items"`
	TotalAmount   int64     `db:"total_price" json:"total_amount"`
	PaymentMethod string    `db:"payment_method" json:"payment_method"`
	AddressID     string    `db:"address_id" json:"address_id"`
	ReceiptURL    string    `db:"receipt_url" json:"receipt_url"`
	Status        int       `db:"status" json:"status"`
	CreatedAt     time.Time `db:"purchase_date" json:"created_at"`
}

/* =========================
   フリーマーケット関連
========================= */

type FleaMarketListLite struct {
	ID            uint64  `json:"id"`
	Name          string  `json:"name"`
	Price         int64   `json:"price"`
	SellerRate    int64   `json:"seller_rate"`
	Type          string  `json:"type"`
	MainImageURL  *string `json:"main_image_url"`
	SellerName    string  `json:"seller_name"`
	SellerIconURL *string `json:"seller_icon_url"`
	IsLiked       bool    `json:"is_liked"`
}

type FleaMarketItem struct {
	ID                 int64      `db:"id" json:"id"`
	UserID             string     `db:"user_id" json:"userId"`
	Name               string     `db:"name" json:"name"`
	Description        *string    `db:"description" json:"description,omitempty"`
	Price              int64      `db:"price" json:"price"`
	SellerRate         int64      `db:"seller_rate" json:"seller_rate"`
	CommissionRate     int64      `db:"commission_rate" json:"commission_rate"`
	Quantity           int        `db:"quantity" json:"quantity"`
	IsMultiPurchasable bool       `db:"is_multi_purchasable" json:"isMultiPurchasable"`
	BuyUserID          *string    `db:"buy_user_id" json:"buyUserId,omitempty"`
	Type               string     `db:"type" json:"type"`
	MainImageURL       string     `db:"main_image_url" json:"main_image_url"`
	Status             int        `db:"status" json:"status"`
	ShipFrom           *int       `db:"ship_from" json:"shipFrom,omitempty"`
	ShippingFeeType    int        `db:"shipping_fee_type" json:"shippingFeeType"`
	ShipsWithinDays    *int       `db:"ships_within_days" json:"shipsWithinDays,omitempty"`
	CreatedAt          time.Time  `db:"created_at" json:"createdAt"`
	UpdatedAt          time.Time  `db:"updated_at" json:"updatedAt"`
	DeletedAt          *time.Time `db:"deleted_at" json:"deletedAt,omitempty"`
}

type FleaMarketItemResponse struct {
	ID                 int64      `db:"id" json:"id"`
	UserID             string     `db:"user_id" json:"userId"`
	Name               string     `db:"name" json:"name"`
	Description        *string    `db:"description" json:"description,omitempty"`
	Price              int64      `db:"price" json:"price"`
	RawSellerRate      int        `db:"seller_rate" json:"-"`               // DBの値 (例: 10200)
	SellerRate         float64    `db:"-"           json:"seller_rate"`     // 計算後の値 (例: 1.02)
	RawCommissionRate  int64      `db:"commission_rate" json:"-"`           // DBの値 (例: 500)
	CommissionRate     float64    `db:"-"           json:"commission_rate"` // 計算後の値
	Quantity           int        `db:"quantity" json:"quantity"`
	IsMultiPurchasable bool       `db:"is_multi_purchasable" json:"isMultiPurchasable"`
	BuyUserID          *string    `db:"buy_user_id" json:"buyUserId,omitempty"`
	Type               string     `db:"type" json:"type"`
	MainImageURL       string     `db:"main_image_url" json:"main_image_url"`
	Status             int        `db:"status" json:"status"`
	ShipFrom           *int       `db:"ship_from" json:"shipFrom,omitempty"`
	ShippingMethod     string     `db:"shipping_method" json:"shippingMethod"`
	ShippingFeeType    int        `db:"shipping_fee_type" json:"shippingFeeType"`
	ShipsWithinDays    *int       `db:"ships_within_days" json:"shipsWithinDays,omitempty"`
	CreatedAt          time.Time  `db:"created_at" json:"createdAt"`
	UpdatedAt          time.Time  `db:"updated_at" json:"updatedAt"`
	DeletedAt          *time.Time `db:"deleted_at" json:"deletedAt,omitempty"`
}

type FleaMarketItemDetail struct {
	FleaMarketItem
	IsLiked  bool   `db:"is_liked" json:"is_liked"`
	UserName string `db:"user_name" json:"seller_name"`
	UserIcon string `db:"user_icon" json:"seller_icon_url"`
}

type FleaMarketItemDetailResponse struct {
	FleaMarketItemResponse
	IsLiked  bool   `db:"is_liked" json:"is_liked"`
	UserName string `db:"user_name" json:"seller_name"`
	UserIcon string `db:"user_icon" json:"seller_icon_url"`
}

type FleaMarketItemImage struct {
	ID        int64     `db:"id" json:"id"`
	ItemID    int64     `db:"item_id" json:"itemId"`
	URL       string    `db:"url" json:"url"`
	SortOrder int       `db:"sort_order" json:"sortOrder"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
}

type FleaMarketItemWithImages struct {
	FleaMarketItem
	Images []FleaMarketItemImage `json:"images"`
}

// 作成用の受け口（multipartのパース後やJSON API用）
type CreateFleaMarketItemInput struct {
	Name               string   `json:"name"`
	Price              int64    `json:"price"`
	SellerRateBP       int64    `json:"seller_rateBP"`
	CommissionRateBP   int64    `json:"commission_rateBP"`
	Quantity           int      `json:"quantity"`
	IsMultiPurchasable bool     `json:"isMultiPurchasable"`
	Type               string   `json:"type"`
	Description        *string  `json:"description,omitempty"`
	MainImageURL       string   `json:"main_image_url"`
	ImageURLs          []string `json:"imageUrls"`       // 画像を先にアップしてURL化しておく想定
	ShippingFeeType    int      `json:"shippingFeeType"` // 0送料込み/1着払い/2送料別
	ShipFrom           *int     `json:"shipFrom,omitempty"`
	ShipsWithinDays    *int     `json:"shipsWithinDays,omitempty"`
	AssetIDs           []string `json:"asset_ids,omitempty"` // 画像アセットID群
}

type AnimalDetails struct {
	Locality   *string `db:"locality" json:"locality"`
	HatchDate  *string `db:"hatch_date" json:"hatch_date"`
	Generation *string `db:"generation" json:"generation"`
	Size       *string `db:"size" json:"size"`
	Sex        *string `db:"sex" json:"sex"`
}

type SupplyDetails struct {
	Brand      *string `db:"brand" json:"brand"`
	SKU        *string `db:"sku" json:"sku"`
	NetWeightG *int    `db:"net_weight_g" json:"net_weight_g"`
}

type FleaMarketItemDetails struct {
	Animal *AnimalDetails `json:"animal_details,omitempty"`
	Supply *SupplyDetails `json:"supply_details,omitempty"`
}

type FleaItemMessage struct {
	ID              int64  `json:"id"`
	ItemID          int64  `json:"itemId"`
	ParentMessageID *int64 `json:"parentMessageId,omitempty"`
	Body            string `json:"body"`
	UserID          string `db:"user_id" json:"userId"`
	UserName        string `db:"user_name" json:"userName"`
	UserIcon        string `db:"user_icon" json:"userIcon"`
	CreatedAt       int64  `json:"createdAt"`
}

type FleaTXMessage struct {
	ID        uint64    `db:"id" json:"id"`
	TxID      uint64    `db:"purchase_request_id" json:"purchase_request_id"`
	UserID    string    `db:"user_id" json:"user_id"`
	Message   string    `db:"message" json:"message"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`

	// 表示用
	UserName    string  `db:"user_name" json:"user_name"`
	UserIconURL *string `db:"user_icon_url" json:"user_icon_url"`
}

type AddMessageRequest struct {
	ParentMessageID *uint64 `json:"parentMessageId"`
	Body            string  `json:"body"`
}

// 取引関連
type FleaPurchaseRequestRow struct {
	ID                 uint64  `json:"id" db:"id"`
	ItemID             uint64  `json:"item_id" db:"item_id"`
	BuyerID            string  `json:"buyer_id" db:"buyer_id"`
	SellerID           string  `json:"seller_id" db:"seller_id"`
	AddressID          uint64  `json:"address_id" db:"address_id"`
	ShippingMethodPref string  `json:"shipping_method_pref" db:"shipping_method_pref"`
	ShippingFeePref    string  `json:"shipping_fee_pref" db:"shipping_fee_pref"`
	Note               *string `json:"note,omitempty" db:"note"`
	Status             string  `json:"status" db:"status"`

	RejectionReason  *string `json:"rejection_reason" db:"rejection_reason"`
	WithdrawalReason *string `json:"withdrawal_reason" db:"withdrawal_reason"`

	CreatedAt string `json:"created_at" db:"created_at"`
	UpdatedAt string `json:"updated_at" db:"updated_at"`
}

type FleaTransactionRow struct {
	ID                 uint64  `json:"id" db:"id"`
	PurchaseRequestID  uint64  `json:"purchase_request_id" db:"purchase_request_id"`
	ItemID             uint64  `json:"item_id" db:"item_id"`
	BuyerID            string  `json:"buyer_id" db:"buyer_id"`
	SellerID           string  `json:"seller_id" db:"seller_id"`
	AddressID          uint64  `json:"address_id" db:"address_id"`
	ShippingMethod     string  `json:"shipping_method" db:"shipping_method"`
	ShippingFeeType    string  `json:"shipping_fee_type" db:"shipping_fee_type"`
	PriceItem          uint32  `json:"price_item" db:"price_item"`
	PriceShipping      uint32  `json:"price_shipping" db:"price_shipping"`
	PaymentProvider    *string `json:"payment_provider" db:"payment_provider"`
	PaymentID          *string `json:"payment_id" db:"payment_id"`
	UsePoint           int64   `json:"use_point" db:"use_point"`
	PointRate          int64   `json:"point_rate" db:"point_rate"`
	PaymentStatus      string  `json:"payment_status" db:"payment_status"`
	ShippingCarrier    *string `json:"shipping_carrier" db:"shipping_carrier"`
	TrackingNumber     *string `json:"tracking_number" db:"tracking_number"`
	FeeAmount          int     `json:"fee_amount" db:"fee_amount"`
	ProfitAmount       int     `json:"profit_amount" db:"profit_amount"`
	Status             string  `json:"status" db:"status"`
	CancellationReason *string `json:"cancellation_reason" db:"cancellation_reason"`
	PaidAt             *string `json:"paid_at" db:"paid_at"`
	ShippedAt          *string `json:"shipped_at" db:"shipped_at"`
	CompletedAt        *string `json:"completed_at" db:"completed_at"`
	CreatedAt          string  `json:"created_at" db:"created_at"`
	UpdatedAt          string  `json:"updated_at" db:"updated_at"`
}

type FleaPurchaseRequestListItem struct {
	ID                 uint64  `json:"id"`
	ItemID             int64   `json:"item_id"`
	ItemName           string  `json:"item_name"`
	ItemMainImageURL   *string `json:"item_main_image_url,omitempty"`
	BuyerID            string  `json:"buyer_id"`
	SellerID           string  `json:"seller_id"`
	AddressID          int     `json:"address_id"`
	ShippingMethodPref string  `json:"shipping_method_pref"`
	ShippingFeePref    string  `json:"shipping_fee_pref"`
	Note               *string `json:"note,omitempty"`
	Status             string  `json:"status"`
	CreatedAt          string  `json:"created_at"`
	UpdatedAt          string  `json:"updated_at"`
}

type AcceptPurchaseRequestInput struct {
	ShippingMethod    string `json:"shipping_method"`     // "SELLER_CHOICE", "MEETUP" etc
	ShippingFeeType   string `json:"shipping_fee_type"`   // "INCLUDED", "COD"
	ShippingFeeAmount uint32 `json:"shipping_fee_amount"` // 送料
	NoteToBuyer       string `json:"note_to_buyer"`       // 購入者へのメッセージ
}

type ActiveTransactionResponse struct {
	ID                uint64 `json:"id"`
	PurchaseRequestID uint64 `json:"pr_id"`
	ItemName          string `json:"item_name"`
	ItemImageURL      string `json:"item_image_url"`
	Price             uint32 `json:"price"`
	Status            string `json:"status"`
	IsSeller          bool   `json:"is_seller"` // 自分が売る側ならtrue
	UpdatedAt         string `json:"updated_at"`
}

type PurchaseRequestResponse struct {
	ID               uint64 `json:"id"`
	ItemID           int64  `json:"item_id"`
	ItemName         string `json:"item_name"`
	ItemMainImageURL string `json:"item_main_image_url"`
	BuyerID          string `json:"buyer_id"`
	BuyerName        string `json:"buyer_name"`
	CreatedAt        string `json:"created_at"`
	Status           string `json:"status"`
}

/* =========================
   ドラフト関連
========================= */

type DraftListItem struct {
	DraftID uint64 `json:"draft_id"`
	// タイトル列がないので Name をそのまま表示用に使う（無ければ "ドラフト #ID" をフロントで補う）
	Name         *string `json:"name"`
	UpdatedAt    string  `json:"updated_at"`
	Status       int     `json:"status"`
	MainImageURL *string `json:"main_image_url"`
}

type DraftListResponse struct {
	Items      []DraftListItem `json:"items"`
	NextOffset int             `json:"next_offset"`
}

type LatestDraftResponse struct {
	DraftID            uint64                `json:"draft_id"`
	Name               *string               `json:"name"`
	Description        *string               `json:"description"`
	Price              *string               `json:"price"` // 文字列(OK)
	Quantity           *int                  `json:"quantity"`
	Type               *string               `json:"type"`
	Details            interface{}           `json:"details,omitempty"`
	IsMultiPurchasable *int                  `json:"is_multi_purchasable"`
	ShippingFeeType    *int                  `json:"shipping_fee_type"`
	ShipFrom           *int                  `json:"ship_from"`
	ShipsWithinDays    *int                  `json:"ships_within_days"`
	MainImageURL       *string               `json:"main_image_url"`
	UploadedImages     *[]DraftUploadedImage `json:"uploaded_images"`
	UpdatedAt          string                `json:"updated_at"`
}

type DraftPayload struct {
	Name               *string `json:"name"`
	Description        *string `json:"description"`
	Price              *string `json:"price"`
	Quantity           *int    `json:"quantity"`
	Type               *string `json:"type"`
	IsMultiPurchasable *int    `json:"is_multi_purchasable"`
	ShippingFeeType    *int    `json:"shipping_fee_type"`

	ShipFrom *int `json:"ship_from"`

	ShipsWithinDays *int                  `json:"ships_within_days"`
	MainImageURL    *string               `json:"main_image_url"`
	UploadedImages  *[]DraftUploadedImage `json:"uploaded_images"`

	Details interface{} `json:"details,omitempty"` // ★ここを json.RawMessage から interface{} に変更
}

// 画像情報の型も定義
type DraftUploadedImage struct {
	ID       string `json:"id"`
	ServerID int64  `json:"serverId"`
	URL      string `json:"url"`
}

type SaveDraftRequest struct {
	DraftID *uint64      `json:"draft_id"`
	Payload DraftPayload `json:"payload"`
}

type SaveDraftResponse struct {
	DraftID uint64 `json:"draft_id"`
	SavedAt string `json:"saved_at"`
}

// =========================
//
//	配送関連
//
// =========================
type ShippingRateRow struct {
	Carrier        string
	Temp           string
	SenderPrefCode int
	ReceiverAreaID int64 // DB変更に合わせて変更 (pref_code -> area_id)

	Price60  sql.NullInt64
	Price80  sql.NullInt64
	Price100 sql.NullInt64
	Price120 sql.NullInt64
	Price140 sql.NullInt64

	SourceVersion string
	UpdatedAt     time.Time
}

func ToUserProfileResponse(u SqlResponsUserProfile) RequestUserProfile {
	ptr := func(ns sql.NullString) *string {
		if ns.Valid {
			return &ns.String
		}
		return nil
	}

	return RequestUserProfile{
		ID:          u.ID,
		Name:        u.Name,
		Email:       u.Email,
		DateOfBirth: ptr(u.DateOfBirth),
		Gender:      ptr(u.Gender),
		DefaultCard: ptr(u.DefaultCard),
		PhoneNumber: ptr(u.PhoneNumber),
		Bio:         ptr(u.Bio),
		IconURL:     ptr(u.IconURL),

		GoogleID: ptr(u.GoogleID),
		AppleID:  ptr(u.AppleID),

		IdentityStatus: u.IdentityStatus,
		FollowersCount: u.FollowersCount,
		FollowingCount: u.FollowingCount,
	}
}

type SalesHistoryResponse struct {
	Balance   int64              `json:"balance"`   // 現在の残高
	Histories []SalesHistoryItem `json:"histories"` // 履歴リスト
}

type SalesHistoryItem struct {
	ID              uint64 `json:"id" db:"id"`
	Type            string `json:"type" db:"type"`                         // SALE, WITHDRAWAL, etc.
	Amount          int64  `json:"amount" db:"amount"`                     // 変動額 (+1000, -500)
	BalanceSnapshot int64  `json:"balance_snapshot" db:"balance_snapshot"` // その時点の残高
	Note            string `json:"note" db:"note"`                         // "商品ID:123の売上" など
	CreatedAt       string `json:"created_at" db:"created_at"`             // 発生日時
}

// ユーザー投稿
type UserPost struct {
	ID            uint64    `db:"id" json:"id"`
	UserID        string    `db:"user_id" json:"user_id"`
	User          *User     `db:"-" json:"user,omitempty"` // 投稿者情報(JOIN用)
	Body          string    `db:"body" json:"body"`
	ImageURLs     []string  `db:"-" json:"image_urls"` // DBのJSONをパースして入れる
	LikesCount    int       `db:"likes_count" json:"likes_count"`
	CommentsCount int       `db:"comments_count" json:"comments_count"`
	IsLiked       bool      `db:"-" json:"is_liked"` // 閲覧者がいいねしてるか
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
}

// フォロー関係
type UserRelationship struct {
	FollowerID  string    `db:"follower_id"`
	FollowingID string    `db:"following_id"`
	CreatedAt   time.Time `db:"created_at"`
}

// review
// プロフィール用: レビュー詳細
type UserReviewResponse struct {
	ID              uint64    `db:"id" json:"id"`
	Rating          int       `db:"rating" json:"rating"`
	Comment         string    `db:"comment" json:"comment"`
	CreatedAt       time.Time `db:"created_at" json:"createdAt"`
	ReviewerName    string    `db:"reviewer_name" json:"reviewerName"`
	ReviewerIconURL *string   `db:"reviewer_icon_url" json:"reviewerIconUrl"`
	ItemName        *string   `db:"item_name" json:"itemName"`
}

type UserBankAccount struct {
	UserID            string `json:"user_id"`
	BankName          string `json:"bank_name"`
	BankCode          string `json:"bank_code"`
	BranchName        string `json:"branch_name"`
	BranchCode        string `json:"branch_code"`
	AccountType       int    `json:"account_type"`
	AccountNumber     string `json:"account_number"`
	AccountHolderName string `json:"account_holder_name"`
}

type UserBankAccountResponse struct {
	ID uint64 `db:"id"                  json:"id"`

	UserID            string `db:"user_id"             json:"user_id"`
	BankName          string `db:"bank_name"           json:"bank_name"`   // bankName -> bank_name
	BankCode          string `db:"bank_code"           json:"bank_code"`   // bankCode -> bank_code
	BranchName        string `db:"branch_name"         json:"branch_name"` // ...
	BranchCode        string `db:"branch_code"         json:"branch_code"`
	AccountType       int    `db:"account_type"        json:"account_type"`
	AccountNumber     string `db:"account_number"      json:"account_number"`
	AccountHolderName string `db:"account_holder_name" json:"account_holder_name"`

	CreatedAt time.Time `db:"created_at"          json:"created_at"`
	UpdatedAt time.Time `db:"updated_at"          json:"updated_at"`
}
