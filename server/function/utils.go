package function

import (
	"animaloop/config"
	"fmt"
	"reflect"
	"time"

	"github.com/dgrijalva/jwt-go"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/net/context"
	"golang.org/x/oauth2"
	oauth2v2 "google.golang.org/api/oauth2/v2"
)

type User struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Exp      int64  `json:"exp"`
	Limit    int    `json:"limit"`
}

// ユーザー情報を格納する構造体
type SqlUser struct {
    ID       string `db:"ID" json:"id"`
    Name     string `db:"Name" json:"name"`
    Email    string `db:"Email" json:"email"`
    Password string `db:"Password" json:"password"`
    GoogleID string `db:"GoogleID"`
    AppleID  string `db:"AppleID"`
}

type Item struct {
	ID          string `db:"ID" json:"id"`
	Name        string `db:"Name" json:"name"`
	Description string `db:"Description" json:"description"`
	Price       int    `db:"Price" json:"price"`
	Point       int    `db:"Stock" json:"stock"`
	Category  	int `db:"Category" json:"category"`
}

type Profile struct {
	DateOfBirth string `db:"DateOfBirth" json:"birth"`
	Gender	  string `db:"Gender json:genger"`
	PhoneNumber string `db:"PhoneNumber" json:"phone"`
	Bio string `db:"Bio" json:"bio"`
	IconURL string `db:"IconURL" json:"image"`
}

type RequestUserProfile struct {
	ID string `json:"id"`
	Name string `json:"name"`
	Email string `json:"email"`
	DateOfBirth string `json:"birth"`
	Gender	  string `json:"gender"`
	PhoneNumber string `json:"phone"`
	Bio string `json:"bio"`
	IconURL string `json:"image"`
}

type Address struct {
	ID string `db:"AddressID" json:"id"`
	UserID string `db:"UserID" json:"usserid"`
	PostalCode string `db:"PostalCode" json:"postCode"`
	Pref string `db:"Pref" json:"pref"`
	Address1 string `db:"Address1" json:"address1"`
	Address2 string `db:"Address2" json:"address2"`
}

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
	if(tokenString == ""){
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

	user := &User{
		ID:    claims["id"].(string),
		Email: claims["email"].(string),
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
func GetGoogleUserInfo(tokenString string) (*oauth2v2.Userinfo, error) {
    // OAuth2のクライアントを作成
    ctx := context.Background()

	token := &oauth2.Token{
        AccessToken: tokenString,
    }

    client := oauth2.NewClient(ctx, oauth2.StaticTokenSource(token))

    // Google OAuth2 APIサービスのインスタンスを作成
    service, err := oauth2v2.New(client)
    if err != nil {
        return nil, err
    }

    // ユーザー情報を取得
    userInfo, err := service.Userinfo.Get().Do()
    if err != nil {
        return nil, err
    }

    return userInfo, nil
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