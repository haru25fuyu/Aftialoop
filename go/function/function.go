package function

import (
	"animaloop/config"
	"animaloop/utils"
	"context"
	"fmt"
	"log"
	"net/http"
	"reflect"
	"strings"
	"time"

	recaptcha "cloud.google.com/go/recaptchaenterprise/v2/apiv1"
	recaptchapb "cloud.google.com/go/recaptchaenterprise/v2/apiv1/recaptchaenterprisepb"
	"github.com/MicahParks/keyfunc"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ses"
	"github.com/aws/aws-sdk-go-v2/service/ses/types"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func CheckUser(db *Database, w http.ResponseWriter, r *http.Request) (string, string) {
	authHeader := r.Header.Get("Authorization")

	// まずは Cookie を試しに取得
	refreshCookie, cookieErr := r.Cookie("refresh_token")

	// Authorization も Cookie もない → ここで早期リターン
	if authHeader == "" && cookieErr != nil {
		log.Println("❌ トークンが見つかりません")
		return "", "トークンが有りません"
	}

	var (
		token   string
		user    *utils.User
		err     error
		setUser *utils.User
	)

	// Bearer トークンがあればアクセス検証を試みる
	if strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimPrefix(authHeader, "Bearer ")
		user, err = GetUserFromToken(token)
		if err != nil {
			log.Println("❌ アクセストークンの検証に失敗:", err)
			user = nil
		}
	}

	// アクセスに失敗 or トークンなし の場合はリフレッシュトークンを使う
	if user == nil {
		// Cookie が取得できていなければここで諦める
		if cookieErr != nil {
			log.Println("❌ リフレッシュトークンも取得できず:", cookieErr)
			return "", "アクセストークンが期限切れです"
		}
		// Refresh トークンからユーザー復元を試みる
		user, err = GetUserFromRefreshToken(refreshCookie.Value)
		if err != nil || user == nil {
			log.Println("❌ リフレッシュトークン検証失敗:", err)
			return "", "アクセストークンが期限切れです"
		}
		// リフレッシュ成功 → 新しいアクセストークンを発行
		setUser = user
		setUser.Limit = 2 * 60 * 60 // 2時間後に設定
		newToken, err := GenerateToken(setUser)
		if err != nil {
			log.Println("❌ アクセストークン再発行エラー:", err)
			return "", "サーバーエラー"
		}
		// もしリフレッシュの有効期限が近ければ Cookie を更新
		if time.Until(time.Unix(user.Exp, 0)) < 7*24*time.Hour {
			SetRefreshToken(db, w, user)
		}
		return newToken, ""
	}

	// アクセストークンが valid な場合はこちら
	setUser = user
	setUser.Limit = 2 * 60 * 60 // 2時間後に設定
	newToken, err := GenerateToken(setUser)
	log.Println(GetUserFromToken(newToken))
	if err != nil {
		log.Println("❌ アクセストークン再発行エラー:", err)
		return "", "サーバーエラー"
	}
	// 既存のリフレッシュトークンが古い or missing なら更新
	if cookieErr != nil {
		SetRefreshToken(db, w, user)
	} else {
		// 有効期限切れ間近なら更新
		if time.Until(time.Unix(user.Exp, 0)) < 7*24*time.Hour {
			SetRefreshToken(db, w, user)
		}
	}
	return newToken, ""
}

func SetRefreshToken(db *Database, w http.ResponseWriter, user *utils.User) error {
	expires_at := time.Now().Add(24 * time.Hour * 14)

	refreshToken, err := GenerateRefreshToken(user)
	if err != nil {
		return err
	}

	//新しいアクセストークンをクッキーに保存
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Expires:  expires_at,
		HttpOnly: true,
		SameSite: http.SameSiteNoneMode,
		Secure:   true,
	})

	db.SaveRefreshToken(refreshToken, user.ID)

	return nil
}

func CreateAssessment(token string) {

	// reCAPTCHA クライアントを作成する。
	ctx := context.Background()
	client, err := recaptcha.NewClient(ctx)
	if err != nil {
		fmt.Printf("Error creating reCAPTCHA client:" + err.Error())
		return
	}
	defer client.Close()

	// 追跡するイベントのプロパティを設定する。
	event := &recaptchapb.Event{
		Token:   token,
		SiteKey: config.RecaptchaKey,
	}

	assessment := &recaptchapb.Assessment{
		Event: event,
	}

	// 評価リクエストを作成する。
	request := &recaptchapb.CreateAssessmentRequest{
		Assessment: assessment,
		Parent:     fmt.Sprintf("projects/%s", config.ProjectID),
	}

	response, err := client.CreateAssessment(
		ctx,
		request)

	if err != nil {
		fmt.Printf("Error calling CreateAssessment: %v", err.Error())
	}

	// トークンが有効かどうかを確認する。
	if err != nil {
		fmt.Printf("Error calling CreateAssessment: %v\n", err)
		return
	}
	if response == nil || response.TokenProperties == nil {
		fmt.Println("response or TokenProperties is nil, aborting")
		return
	}

	// 想定どおりのアクションが実行されたかどうかを確認する。
	if response.TokenProperties.Action != config.RecaptchaAction {
		fmt.Printf("The action attribute in your reCAPTCHA tag does not match the action you are expecting to score")
		return
	}

	// リスクスコアと理由を取得する。
	// 評価の解釈の詳細については、以下を参照:
	// https://cloud.google.com/recaptcha-enterprise/docs/interpret-assessment
	fmt.Printf("The reCAPTCHA score for this token is:  %v", response.RiskAnalysis.Score)

	for _, reason := range response.RiskAnalysis.Reasons {
		fmt.Printf(reason.String() + "\n")
	}
}

func PrioritizeCard(cards []utils.CardSummary, defaultID string) []utils.CardSummary {
	for i := range cards {
		if cards[i].ID == defaultID {
			cards[i].IsDefault = true // ← これでOK！
			if i != 0 {
				cards[0], cards[i] = cards[i], cards[0]
			}
			break
		}
	}
	return cards
}

func LoadUserAndCards(db *Database, token string) ([]*utils.CardSummary, error) {
	// トークンからID取得
	claims, err := GetUserFromToken(token)
	if err != nil {
		return nil, fmt.Errorf("トークン無効: %w", err)
	}

	// ユーザー情報取得
	userData, err := db.GetUserData([]string{"id = ?"}, []interface{}{claims.ID})
	if err != nil {
		return nil, fmt.Errorf("ユーザー取得失敗: %w", err)
	}

	// カード一覧取得
	cardData, err := GetCardList(claims.ID)
	if err != nil {
		return nil, fmt.Errorf("カード取得失敗: %w", err)
	}

	// デフォルトカードを先頭に
	cardData = PrioritizeCard(cardData, userData.DefaultCard)

	// カード情報をポインタのスライスに変換
	// これをしないと、カード情報がコピーされてしまう
	var cardDataPointers []*utils.CardSummary
	for i := range cardData {
		cardDataPointers = append(cardDataPointers, &cardData[i])
	}

	return cardDataPointers, nil
}

func SendMail(to string, subject string, htmlContent string) (*ses.SendEmailOutput, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(context.TODO(), awsconfig.WithRegion("ap-northeast-1"))
	if err != nil {
		return nil, err
	}
	client := ses.NewFromConfig(awsCfg)

	input := &ses.SendEmailInput{
		Source: aws.String(config.FromEmail), // SESで検証済みアドレス
		Destination: &types.Destination{
			ToAddresses: []string{to},
		},
		Message: &types.Message{
			Subject: &types.Content{
				Data: aws.String(subject),
			},
			Body: &types.Body{
				Html: &types.Content{
					Data: aws.String(htmlContent),
				},
			},
		},
	}
	res, err := client.SendEmail(context.TODO(), input)

	return res, err
}

// JWTを生成する関数
func GenerateToken(user *utils.User) (string, error) {
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
func GenerateRefreshToken(user *utils.User) (string, error) {
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
func GetUserFromToken(tokenString string) (*utils.User, error) {
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

	user := &utils.User{
		ID:    claims["id"].(string),
		Email: claims["email"].(string),
		Name:  claims["name"].(string),
		Exp:   int64(claims["exp"].(float64)),
	}

	return user, nil
}

// リフレッシュトークンからユーザー情報を取得する関数
func GetUserFromRefreshToken(tokenString string) (*utils.User, error) {
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

	user := &utils.User{
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
	jwks, err := keyfunc.Get(config.JwksURL, keyfunc.Options{})
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

// マップを構造体に変換する関数
func join(arr []string, separator string) string {
	result := ""
	for i, val := range arr {
		if i != 0 {
			result += separator
		}
		result += val
	}
	return result
}

func Ptr[T any](value T) *T {
	return &value
}

// 文字列（xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx）→ 16バイト
func UUIDStringToBytes(s string) ([]byte, error) {
    id, err := uuid.Parse(s)
    if err != nil { return nil, err }
    b := id // uuid.UUID は [16]byte のエイリアス
    return b[:], nil
}

// 16バイト → ハイフン付きの文字列（36文字）
func UUIDBytesToString(b []byte) (string, error) {
    id, err := uuid.FromBytes(b)
    if err != nil { return "", err }
    return id.String(), nil
}