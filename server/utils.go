package utils

import (
	"fmt"
	"log"
	"time"
	"animaloop/config"

	"github.com/dgrijalva/jwt-go"
	"golang.org/x/crypto/bcrypt"
)

// ユーザー情報を格納する構造体
type User struct {
	ID    string
	Email string
	Name  string
	Password string
	Limit string
}

// JWTを生成する関数
func GenerateToken(user User) (string, error) {
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
func GenerateRefreshToken(user User) (string, error) {
	claims := jwt.MapClaims{
		"id":    user.ID,
		"email": user.Email,
		"exp":   time.Now().Add(14 * 24 * time.Hour).Unix(), // 例: 14日間の有効期限
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.SECRET_REFRESH_KEY))
}

// トークンからユーザー情報を取得する関数
func getUserFromToken(tokenString string) (*User, error) {
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
	}

	return user, nil
}

// リフレッシュトークンからユーザー情報を取得する関数
func getUserFromRefreshToken(tokenString string) (*User, error) {
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
func hashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}