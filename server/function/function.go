package function

import (
	"encoding/json"
	"net/http"
	"time"
)

func CheckUser(w http.ResponseWriter, r *http.Request) (string, error) {
    authHeader := r.Header.Get("Authorization")
    refreshToken, err := r.Cookie("refresh_token")

    if authHeader == "" && err != nil {
        return "", http.Error(w, `{"user": false, "message": "トークンが有りません"}`, http.StatusUnauthorized)
    }

    var token string
    var user *User

    if authHeader != "" {
        token = authHeader[len("Bearer "):]
        user = getUserFromToken(token)
    }

    if user == nil && err != nil {
        return "", http.Error(w, `{"user": false, "message": "トークンが期限切れです"}`, http.StatusUnauthorized)
    }

    if user == nil {
        user = getUserFromRefreshToken(refreshToken.Value)
        if user == nil {
            return "", http.Error(w, `{"user": false, "message": "アクセストークンが期限切れです"}`, http.StatusUnauthorized)
        } else {
            newAccessToken := GenerateToken(user)
            remainingTime := user.Exp - time.Now().Unix()
            daysRemaining := remainingTime / 86400

            if daysRemaining < 7 {
                checkRefreshToken(w, user)
                return newAccessToken, nil
            }

            return newAccessToken, nil
        }
    } else {
        user.Limit = "1h"
        newAccessToken := GenerateToken(user)

        if err != nil {
            checkRefreshToken(w, user)
            return newAccessToken, nil
        }

        decoded := getUserFromRefreshToken(refreshToken.Value)
        if decoded == nil {
            checkRefreshToken(w, user)
            return newAccessToken, nil
        }

        remainingTime := decoded.Exp - time.Now().Unix()
        daysRemaining := remainingTime / 86400

        if daysRemaining < 7 {
            checkRefreshToken(w, decoded)
        }

        return newAccessToken, nil
    }
}

func checkRefreshToken(w http.ResponseWriter, refresh_token string) {
	//リフレッシュトークンをでコード
	decoded, err := GetUserFromRefreshToken(refresh_token)
	if err != nil {
		http.Error(w, `{"user": false, "message": "リフレッシュトークンの解析に失敗しました"}`, http.StatusUnauthorized)
		return
	}

	//リフレッシュトークンが期限が七日以下か確認
	remainingTime := decoded.Exp - time.Now().Unix()
	daysRemaining := remainingTime / 86400
	if daysRemaining >= 7 {
		return
	}
	user := &User{
		ID:    decoded.ID,
		Email: decoded.Email,
		Name:  decoded.Name,
	}
	//リフレッシュトークンの有効期限が七日以下の場合、新しいアクセストークンを生成
	newAccessToken := GenerateToken(user)
	//新しいアクセストークンをクッキーに保存
	http.SetCookie(w, &http.Cookie{
		Name: "refresh_token",
		Value: newAccessToken,
		Expires: time.Now().Add(24 * time.Hour),
		HttpOnly: true,
		SameSite: http.SameSiteNoneMode,
		Secure: true,	
	})

	return
}