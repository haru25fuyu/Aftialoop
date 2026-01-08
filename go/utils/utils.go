package utils

import (
	"database/sql"
	"encoding/json"
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

type User struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Exp   int64  `json:"exp"`
	Limit int    `json:"limit"`
}

type SqlUser struct {
	ID          string `db:"id" json:"id"`
	CustomerID  string `db:"customer_id" json:"customer_id"`
	Name        string `db:"name" json:"name"`
	Email       string `db:"email" json:"email"`
	Point       int64  `db:"point" json:"point"`
	Password    string `db:"password" json:"password"`
	GoogleID    string `db:"google_id" json:"google_id"`
	AppleID     string `db:"apple_id" json:"apple_id"`
	DefaultCard string `db:"default_card" json:"default_card"`
}

/* =========================
   プロフィール / 住所
========================= */

type Profile struct {
	DateOfBirth *string `db:"date_of_birth" json:"birth"`
	Gender      *string `db:"gender" json:"gender"`
	PhoneNumber *string `db:"phone_number" json:"phone"`
	Bio         *string `db:"bio" json:"bio"`
	IconURL     *string `db:"icon_url" json:"image"`
}

type RequestUserProfile struct {
	ID          string  `db:"id" json:"id"`
	Name        string  `db:"name" json:"name"`
	Email       string  `db:"email" json:"email"`
	DateOfBirth *string `db:"date_of_birth" json:"birth"`
	Gender      *string `db:"gender" json:"gender"`
	DefaultCard *string `db:"default_card" json:"defaultCard"`
	PhoneNumber *string `db:"phone_number" json:"phone"`
	Bio         *string `db:"bio" json:"bio"`
	IconURL     *string `db:"icon_url" json:"image"`
}

type SqlResponsUserProfile struct {
	ID          string         `db:"id" json:"id"`
	Name        string         `db:"name" json:"name"`
	Email       string         `db:"email" json:"email"`
	DateOfBirth sql.NullString `db:"date_of_birth" json:"birth"`
	Gender      sql.NullString `db:"gender" json:"gender"`
	DefaultCard sql.NullString `db:"default_card" json:"defaultCard"`
	PhoneNumber sql.NullString `db:"phone_number" json:"phone"`
	Bio         sql.NullString `db:"bio" json:"bio"`
	IconURL     sql.NullString `db:"icon_url" json:"image"`
}

type Address struct {
	ID       *string `db:"id" json:"id"`
	UserID   string  `db:"user_id" json:"user_id"`
	Name     *string `db:"name" json:"name"`
	Phone    *string `db:"phone" json:"phone"`
	PostCode *string `db:"post_code" json:"post_code"`
	Pref     *string `db:"pref" json:"pref"`
	Address1 *string `db:"address1" json:"address1"`
	Address2 *string `db:"address2" json:"address2"`
	Address3 *string `db:"address3" json:"address3"`
	Status   *int    `db:"status" json:"status"`
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
	CustomerID string `db:"customer_id" json:"customerID"`
	CardID     string `db:"card_id" json:"cardID"`
	Amount     int64  `db:"amount" json:"amount"`
	Items      []Item `json:"items"`
	AddressID  string `db:"address_id" json:"addressID"`
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
}

type FleaMarketItem struct {
	ID                 int64      `db:"id" json:"id"`
	UserID             string     `db:"user_id" json:"userId"`
	Name               string     `db:"name" json:"name"`
	Description        *string    `db:"description" json:"description,omitempty"`
	Price              int64      `db:"price" json:"price"`
	SellerRate         int64      `db:"seller_rate" json:"seller_rate"`
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

type FleaMarketItemDetail struct {
	FleaMarketItem

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
	Quantity           int      `json:"quantity"`
	IsMultiPurchasable bool     `json:"isMultiPurchasable"`
	Type               string   `json:"type"`
	Description        *string  `json:"description,omitempty"`
	MainImageURL       string   `json:"main_image_url"`
	ImageURLs          []string `json:"imageUrls"`       // 画像を先にアップしてURL化しておく想定
	ShippingFeeType    int      `json:"shippingFeeType"` // 0送料込み/1着払い
	ShipFrom           *int     `json:"shipFrom,omitempty"`
	ShipsWithinDays    *int     `json:"shipsWithinDays,omitempty"`
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

type AddMessageRequest struct {
	ParentMessageID *uint64 `json:"parentMessageId"`
	Body            string  `json:"body"`
}

type FleaPurchaseRequestRow struct {
	ID                 uint64
	ItemID             int64
	BuyerID            string
	SellerID           string
	AddressID          int
	ShippingMethodPref string
	ShippingFeePref    string
	Note               *string
	Status             string
	CreatedAt          string
	UpdatedAt          string
}

type FleaTransactionRow struct {
	ID                uint64
	PurchaseRequestID uint64
	ItemID            int64
	BuyerID           string
	SellerID          string
	AddressID         int
	ShippingMethod    string
	ShippingFeeType   string
	PriceItem         uint32
	PriceShipping     uint32
	PaymentProvider   *string
	PaymentID         *string
	PaymentStatus     string
	Status            string
	ShippedAt         *string
	CompletedAt       *string
	CreatedAt         string
	UpdatedAt         string
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

/* =========================
   ドラフト関連
========================= */

type DraftListItem struct {
	DraftID uint64 `json:"draft_id"`
	// タイトル列がないので Name をそのまま表示用に使う（無ければ "ドラフト #ID" をフロントで補う）
	Name      *string `json:"name"`
	UpdatedAt string  `json:"updated_at"`
	Status    int     `json:"status"`
}

type DraftListResponse struct {
	Items      []DraftListItem `json:"items"`
	NextOffset int             `json:"next_offset"`
}

type LatestDraftResponse struct {
	DraftID            uint64    `json:"draft_id"`
	Name               *string   `json:"name"`
	Description        *string   `json:"description"`
	Price              *string   `json:"price"`
	Quantity           *int      `json:"quantity"`
	Type               *string   `json:"type"`
	IsMultiPurchasable *int      `json:"is_multi_purchasable"`
	ShippingFeeType    *int      `json:"shipping_fee_type"`
	ShipFrom           *string   `json:"ship_from"`
	ShipsWithinDays    *int      `json:"ships_within_days"`
	MainImageURL       *string   `json:"main_image_url"`
	TempImageURLs      *[]string `json:"temp_image_urls"`
	UpdatedAt          string    `json:"updated_at"`
}

type DraftPayload struct {
	Name               *string         `json:"name"`
	Description        *string         `json:"description"`
	Price              *string         `json:"price"`
	Quantity           *int            `json:"quantity"`
	Type               *string         `json:"type"`
	IsMultiPurchasable *int            `json:"is_multi_purchasable"`
	ShippingFeeType    *int            `json:"shipping_fee_type"`
	ShipFrom           *int            `json:"ship_from"`
	ShipsWithinDays    *int            `json:"ships_within_days"`
	MainImageURL       *string         `json:"main_image_url"`
	TempImageURLs      *[]string       `json:"temp_image_urls"`
	Details            json.RawMessage `json:"details,omitempty"`
}

type SaveDraftRequest struct {
	DraftID *uint64      `json:"draft_id"`
	Payload DraftPayload `json:"payload"`
}

type SaveDraftResponse struct {
	DraftID uint64 `json:"draft_id"`
	SavedAt string `json:"saved_at"`
}
