package function

import (
	"animaloop/config"
	"fmt"
	"reflect"
	"time"

	"github.com/MicahParks/keyfunc"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
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
	ID       string `db:"ID" json:"id"`
	Name     string `db:"Name" json:"name"`
	Email    string `db:"Email" json:"email"`
	Password string `db:"Password" json:"password"`
	GoogleID string `db:"GoogleID" json:"GoogleID"`
	AppleID  string `db:"AppleID"`
	DefaultCard string `db:"DefaultCard" json:"defaultCard"`
}

type Item struct {
	ID          string `db:"ID" json:"id"`
	Name        string `db:"Name" json:"name"`
	Description string `db:"Description" json:"description"`
	Price       int    `db:"Price" json:"price"`
	Point       int    `db:"Stock" json:"stock"`
	Category    int    `db:"Category" json:"category"`
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
	ID        string `db:"ID" json:"ID"`
	UserID    string `db:"UserID" json:"UserID"`
	Name      string `db:"Name" json:"Name"`
	Phone     string `db:"Phone" json:"Phone"`
	PostCode  string `db:"PostCode" json:"PostCode"`
	Pref      string `db:"Pref" json:"Pref"`
	Address1  string `db:"Address1" json:"Address1"`
	Address2  string `db:"Address2" json:"Address2"`
	Address3  string `db:"Address3" json:"Address3"`
	IsDefault bool   `db:"IsDefault" json:"IsDefault"`
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
}

type RequestCardWithAddress struct {
	CardID	 string `db:"CardID" json:"cardID"`
	AddressID string `db:"Address" json:"address"`
}

type CardSummary struct {
  ID        string `json:"ID"`
  Brand     string `json:"CardBrand"`
  Last4     string `json:"Last4"`
  ExpMonth  int    `json:"ExpMonth"`
  ExpYear   int    `json:"ExpYear"`
  Disabled  bool   `json:"Disabled"`
  Name 	string `json:"Name"`
  IsDefault bool   `json:"IsDefault"`
}

const jwksURL = "https://www.googleapis.com/oauth2/v3/certs"

// JWTを生成する関数
func GenerateToken(user *User) (string, error) {
	claims := jwt.MapClaims{
		"id":    user.ID,
		"email": user.Email,
		"name":  user.Name,
		"exp":   time.Now().Add(time.Duration(user.Limit) * time.Hour).Unix(), // 例: 1時間の有効期限
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.SECRET_KEY))
}

// リフレッシュトークンを生成する関数
func GenerateRefreshToken(user *User) (string, error) {
	claims := jwt.MapClaims{
		"id":    user.ID,
		"email": user.Email,
		"name":  user.Name,
		"exp":   time.Now().Add(14 * 24 * time.Hour).Unix(), // 例: 14日間の有効期限
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.SECRET_REFRESH_KEY))
}

// トークンからユーザー情報を取得する関数
func GetUserFromToken(tokenString string) (*User, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return config.SECRET_KEY, nil
	})

	if err != nil || !token.Valid {
		return nil, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	user := &User{
		ID:    claims["id"].(string),
		Email: claims["email"].(string),
		Name:  claims["name"].(string),
		Exp:   int64(claims["exp"].(float64)),
	}

	return user, nil
}

// リフレッシュトークンからユーザー情報を取得する関数
func GetUserFromRefreshToken(tokenString string) (*User, error) {
	if tokenString == "" {
		return nil, fmt.Errorf("invalid token")
	}
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return config.SECRET_REFRESH_KEY, nil
	})

	if err != nil || !token.Valid {
		return nil, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	id, ok := claims["id"].(string)
	if !ok {
		return nil, fmt.Errorf("id claim is missing or not a string")
	}
	email, ok := claims["email"].(string)
	if !ok {
		return nil, fmt.Errorf("email claim is missing or not a string")
	}
	name, ok := claims["name"].(string)
	if !ok {
		return nil, fmt.Errorf("name claim is missing or not a string")
	}

	user := &User{
		ID:    id,
		Email: email,
		Name:  name,
	}

	return user, nil
}

// パスワードをハッシュ化する関数
func HashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}

// パスワードを検証する関数
func ComparePassword(hashedPassword, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

// サーバー側でアクセストークンを使ってユーザー情報を取得する関数
func GetGoogleUserInfo(tokenString string) (map[string]interface{}, error) {
	// 公開鍵セット（JWKS）を取得
	jwks, err := keyfunc.Get(jwksURL, keyfunc.Options{})
	if err != nil {
		return nil, fmt.Errorf("JWKS取得失敗: %w", err)
	}

	// JWTを検証付きでパース
	token, err := jwt.Parse(tokenString, jwks.Keyfunc)
	if err != nil {
		return nil, fmt.Errorf("トークン検証失敗: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("トークンが無効です")
	}

	claims := token.Claims.(jwt.MapClaims)
	return claims, nil
}

// 構造体をマップに変換する関数
func StructToMap(s interface{}) (map[string]interface{}, error) {
	// 受け取った構造体の値を取得
	val := reflect.ValueOf(s)
	if val.Kind() == reflect.Ptr {
		val = val.Elem() // ポインタをデリファレンスする
	}
	if val.Kind() != reflect.Struct {
		return nil, fmt.Errorf("expected a struct, got %s", val.Kind())
	}

	// 構造体をマップに変換
	result := make(map[string]interface{})
	for i := 0; i < val.NumField(); i++ {
		field := val.Type().Field(i)
		result[field.Name] = val.Field(i).Interface()
	}

	return result, nil
}

func Ptr[T any](value T) *T {
    return &value
}