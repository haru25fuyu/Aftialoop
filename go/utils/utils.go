package utils

import (
	"encoding/json"
	"fmt"
	"time"
)

type User struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Exp   int64  `json:"exp"`
	Limit int    `json:"limit"`
}

// ユーザー情報を格納する構造体
type SqlUser struct {
	ID          string  `db:"ID" json:"id"`
	CustomerID  string  `db:"CustomerID" json:"customerID"`
	Name        string  `db:"Name" json:"name"`
	Email       string  `db:"Email" json:"email"`
	Point       float64 `db:"Point" json:"point"`
	Password    string  `db:"Password" json:"password"`
	GoogleID    string  `db:"GoogleID" json:"GoogleID"`
	AppleID     string  `db:"AppleID"`
	DefaultCard string  `db:"DefaultCard" json:"defaultCard"`
}

type Item struct {
	ID           string    `db:"ID" json:"id"`
	Name         string    `db:"Name" json:"name"`
	Description  string    `db:"Description" json:"description"`
	CostPrice    float64   `db:"CostPrice" json:"cost_price"`
	Price        float64   `db:"Price" json:"price"`
	Point        float64   `db:"Point" json:"point"`
	Category     int       `db:"Category" json:"category"`
	MainImageURL string    `db:"MainImageURL" json:"main_image_url"`
	Quantity     int       `db:"Quantity" json:"quantity"`      // フロントエンドでの数量管理用
	Status       int       `db:"Status" json:"status"`          // 1: 有効, 2: 無効
	IsSelected   bool      `db:"IsSelected" json:"is_selected"` // フロントエンドでのチェックボックス用
	CreatedAt    MySQLTime `db:"CreatedAt" json:"created_at"`
	UpdatedAt    MySQLTime `db:"UpdatedAt" json:"updated_at"`
}

type ItemImage struct {
	ID      string `db:"ID" json:"id"`
	ItemID  string `db:"ItemID" json:"item_id"`
	URL     string `db:"URL" json:"url"`
	SortNum int    `db:"SortNum" json:"sort_num"` // 画像の表示順
}

type Profile struct {
	DateOfBirth *string `db:"DateOfBirth" json:"birth"`
	Gender      *string `db:"Gender" json:"gender"`
	PhoneNumber *string `db:"PhoneNumber" json:"phone"`
	Bio         *string `db:"Bio" json:"bio"`
	IconURL     *string `db:"IconURL" json:"image"`
}

type RequestUserProfile struct {
	ID          string `json:"id" db:"ID"`
	Name        string `json:"name" db:"Name"`
	Email       string `json:"email" db:"Email"`
	DateOfBirth string `json:"birth" db:"DateOfBirth"`
	Gender      string `json:"gender" db:"Gender"`
	DefaultCard string `json:"defaultCard" db:"DefaultCard"`
	PhoneNumber string `json:"phone" db:"PhoneNumber"`
	Bio         string `json:"bio" db:"Bio"`
	IconURL     string `json:"image" db:"IconURL"`
}
type Address struct {
	ID       string `db:"ID" json:"ID"`
	UserID   string `db:"UserID" json:"UserID"`
	Name     string `db:"Name" json:"Name"`
	Phone    string `db:"Phone" json:"Phone"`
	PostCode string `db:"PostCode" json:"PostCode"`
	Pref     string `db:"Pref" json:"Pref"`
	Address1 string `db:"Address1" json:"Address1"`
	Address2 string `db:"Address2" json:"Address2"`
	Address3 string `db:"Address3" json:"Address3"`
	Status   int    `db:"Status" json:"Status"` // ← ここだけ変更
}

type GoogleClaims struct {
	Email string `json:"email"`
	Name  string `json:"name"`
	Sub   string `json:"sub"`
}

type Token struct {
	Token string `db:"Token" json:"token"`
}

type RequestCard struct {
	Token             string `json:"token"`
	VerificationToken string `json:"verificationToken"`
	CustomerID        string `json:"customerID"`
	Name              string `json:"name"`
}

type RequestCharge struct {
	CustomerID string `db:"CustomerID" json:"customerID"`
	CardID     string `db:"CardID" json:"cardID"`
	Amount     int64  `db:"Amount" json:"amount"`
	Items      []Item `db:"Items" json:"items"`         // 購入するアイテムのリスト
	AddressID  string `db:"AddressID" json:"addressID"` // 住所ID
}

type RequestCardWithAddress struct {
	CardID    string `db:"CardID" json:"cardID"`
	AddressID string `db:"Address" json:"address"`
}

type CardSummary struct {
	ID        string `json:"ID"`
	Brand     string `json:"CardBrand"`
	Last4     string `json:"Last4"`
	ExpMonth  int    `json:"ExpMonth"`
	ExpYear   int    `json:"ExpYear"`
	Disabled  bool   `json:"Disabled"`
	Name      string `json:"Name"`
	IsDefault bool   `json:"IsDefault"`
}

type PurchaseHistory struct {
	ID            string    `db:"ID" json:"ID"`
	UserID        string    `db:"UserID" json:"UserID"`
	Items         []Item    `db:"Items" json:"Items"`
	TotalAmount   int64     `db:"TotalAmount" json:"TotalAmount"`
	PaymentMethod string    `db:"PaymentMethod" json:"PaymentMethod"`
	AddressID     string    `db:"AddressID" json:"AddressID"`
	ReceiptURL    string    `db:"ReceiptURL" json:"ReceiptURL"`
	Status        int       `db:"Status" json:"Status"` // 1: 未決済, 2: 決済済み, 3: 発送準備中, 4: 発送済み, 5: 配送完了, 6: キャンセル, 7: 返品中, 8: 返金済み
	CreatedAt     time.Time `db:"CreatedAt" json:"CreatedAt"`
}

type MySQLTime time.Time

const (
	SortByPrice  = "price"
	SortByNewest = "newest"
	SortAsc      = "asc"
	SortDesc     = "desc"
)

// ListItemsRequest は商品一覧の検索・並び替え・ページングのための共通パラメータです。
// DB 層（function）とハンドラ層（app）双方から参照できるよう utils に置きます。
type ListItemsRequest struct {
	CategoryID    *int     `json:"-"`
	SubCategoryID *int     `json:"-"`
	SearchQuery   *string  `json:"-"`
	MinPrice      *float64 `json:"-"`
	MaxPrice      *float64 `json:"-"`
	SortBy        string   `json:"-"`
	SortOrder     string   `json:"-"`
	Page          int      `json:"-"`
	PageSize      int      `json:"-"`
}

type FleaMarketListLite struct {
	ID         uint64  `json:"id"`
	Name       string  `json:"name"`
	Price      float64 `json:"price"`
	SellerRate float64 `json:"seller_rate"`
	Type       string  `json:"type"` // "ANIMAL" or "SUPPLY"

	MainImageURL *string `json:"main_image_url"`

	SellerName    string  `json:"seller_name"`
	SellerIconURL *string `json:"seller_icon_url"`
}

// 出品アイテム本体
type FleaMarketItem struct {
	ID                 int64   `db:"ID"                  json:"id"`
	UserID             string  `db:"UserID"             json:"userId"` // 出品者
	Name               string  `db:"Name"                json:"name"`
	Description        *string `db:"Description"         json:"description,omitempty"`
	Price              float64 `db:"Price"               json:"price"`
	SellerRate         float64 `db:"SellerRate"          json:"seller_rate"`
	Quantity           int     `db:"Quantity"            json:"quantity"`
	IsMultiPurchasable bool    `db:"IsMultiPurchasable" json:"isMultiPurchasable"`
	Type               string  `db:"Type" json:"type"`
	MainImageURL       string  `db:"MainImageURL"      json:"main_image_url"`
	Status             int     `db:"Status"              json:"status"`            // 0出品中,1取引中,2売却済
	ShipFrom           *int    `db:"ShipFrom"           json:"shipFrom,omitempty"` // 例：東京都
	ShippingFeeType    int     `db:"ShippingFeeType"   json:"shippingFeeType"`     // 0:送料込み,1:着払い
	ShipsWithinDays    *int    `db:"ShipsWithinDays"   json:"shipsWithinDays,omitempty"`

	CreatedAt time.Time  `db:"CreatedAt"          json:"createdAt"`
	UpdatedAt time.Time  `db:"UpdatedAt"          json:"updatedAt"`
	DeletedAt *time.Time `db:"DeletedAt"          json:"deletedAt,omitempty"`
}

type FleaMarketItemDetail struct {
	FleaMarketItem

	UserName string `db:"UserName" json:"seller_name"`
	UserIcon string `db:"UserIcon" json:"seller_icon_url"`
}

// 画像
type FleaMarketItemImage struct {
	ID        int64     `db:"id"         json:"id"`
	ItemID    int64     `db:"item_id"    json:"itemId"`
	URL       string    `db:"url"        json:"url"`
	SortOrder int       `db:"sort_order" json:"sortOrder"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
}

// 一覧レスポンス用（画像サムネを一緒に返したいとき）
type FleaMarketItemWithImages struct {
	FleaMarketItem
	Images []FleaMarketItemImage `json:"images"`
}

type AnimalDetails struct {
	Locality   *string `db:"locality"   json:"locality"`
	HatchDate  *string `db:"hatch_date" json:"hatch_date"` // time.Time にしてもOK
	Generation *string `db:"generation" json:"generation"`
	Size       *string `db:"size"       json:"size"`
	Sex        *string `db:"sex"        json:"sex"`
}

type SupplyDetails struct {
	Brand      *string `db:"brand"        json:"brand"`
	SKU        *string `db:"sku"          json:"sku"`
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

	UserID   string `db:"user_id" json:"userId"`
	UserName string `db:"user_name" json:"userName"`
	UserIcon string `db:"user_icon" json:"userIcon"`

	CreatedAt int64 `json:"createdAt"` // ms
}

// 作成用の受け口（multipartのパース後やJSON API用）
type CreateFleaMarketItemInput struct {
	Name               string   `json:"name"`
	Price              float64  `json:"price"`
	SellerRate         float64  `json:"seller_rate"`
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

type DraftPayload struct {
	Name               *string         `json:"name"`
	Description        *string         `json:"description"`
	Price              *string         `json:"price"`
	Quantity           *int            `json:"quantity"`
	Type               *string         `json:"type"`
	IsMultiPurchasable *int            `json:"is_multi_purchasable"`
	ShippingFeeType    *int            `json:"shipping_fee_type"`
	ShipFrom           *int            `json:"ship_from_id"`
	ShipsWithinDays    *int            `json:"ships_within_days"`
	MainImageURL       *string         `json:"main_image_url"`
	TempImageURLs      *[]string       `json:"temp_image_urls"`
	Details            json.RawMessage `json:"details,omitempty"`
}

type SaveDraftRequest struct {
	DraftID *uint64      `json:"draft_id"` // null=新規作成, 有り=更新
	Payload DraftPayload `json:"payload"`
}

type SaveDraftResponse struct {
	DraftID uint64 `json:"draft_id"`
	SavedAt string `json:"saved_at"`
}

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

type AddMessageRequest struct {
	ParentMessageID *uint64 `json:"parentMessageId"`
	Body            string  `json:"body"`
}

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
