package function

import (
	"net/http"
	"time"
)

func CheckUser(w http.ResponseWriter, r *http.Request) (string, string) {
    authHeader := r.Header.Get("Authorization")
    refreshToken, err := r.Cookie("refresh_token")

    if authHeader == "" && err != nil {
        return "" , "トークンが有りません";
    }

    var token string
    var user *User

    if authHeader != "" {
        token = authHeader[len("Bearer "):]
        user,err = GetUserFromToken(token)
    }

    if user == nil && err != nil {
        return "", "トークンが期限切れです"
    }

    if user == nil {
        user,err = GetUserFromRefreshToken(refreshToken.Value)
        if user == nil || err != nil {
            return "", "アクセストークンが期限切れです"
        } else {
            newAccessToken,err := GenerateToken(user)
            if err != nil {
                return "", "サーバーエラー"
            }
            remainingTime := user.Exp - time.Now().Unix()
            daysRemaining := remainingTime / 86400

            if daysRemaining < 7 {
                SetRefreshToken(w, user)
                return newAccessToken, ""
            }

            return newAccessToken, ""
        }
    } else {
        user.Limit = 1
        newAccessToken,err := GenerateToken(user)

        if err != nil {
            SetRefreshToken(w, user)
            return newAccessToken, ""
        }

        decoded,err := GetUserFromRefreshToken(refreshToken.Value)
        if decoded == nil || err != nil {
            SetRefreshToken(w, user)
            return newAccessToken, ""
        }

        remainingTime := decoded.Exp - time.Now().Unix()
        daysRemaining := remainingTime / 86400

        if daysRemaining < 7 {
            SetRefreshToken(w, decoded)
        }

        return newAccessToken, ""
    }
}

func SetRefreshToken(w http.ResponseWriter, user *User) error {
	expires_at := time.Now().Add(24 * time.Hour * 14)

    refreshToken, err := GenerateRefreshToken(user)
    if err != nil {
        return err
    }

	//新しいアクセストークンをクッキーに保存
	http.SetCookie(w, &http.Cookie{
		Name: "refresh_token",
		Value: refreshToken,
		Expires: expires_at,
		HttpOnly: true,
		SameSite: http.SameSiteNoneMode,
		Secure: true,	
	})

    SaveRefreshToken(refreshToken, user.ID)

	return nil
}