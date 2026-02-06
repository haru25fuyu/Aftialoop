package function

import (
	"animaloop/config"
	db "animaloop/sql"
	"animaloop/utils"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
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

// CheckUser はリクエストからアクセストークンとリフレッシュトークンを確認し、ユーザーIDを返します。
// return: userID, newAccessToken(if refreshed), errMsg
func CheckUser(db *db.Database, w http.ResponseWriter, r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")

	// ① Access token があればまず検証
	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		u, err := GetUserFromToken(token)
		if err == nil && u != nil && u.ID != "" {
			return u.ID, nil
		}
	}

	// ② ダメなら refresh
	userID, _, err := TryRefresh(db, w, r)
	if err != nil {
		return "", err
	}
	return userID, nil
}

func TryRefresh(db *db.Database, w http.ResponseWriter, r *http.Request) (string, string, error) {
	c, err := r.Cookie("refresh_token")
	if err != nil || c.Value == "" {
		return "", "", errors.New("refresh token not found")
	}

	prefix := c.Value
	if len(prefix) > 20 {
		prefix = prefix[:20]
	}
	log.Println("[refresh cookie] len=", len(c.Value), "prefix=", prefix)

	user, refreshExp, err := db.GetUserByRefreshToken(c.Value)
	if err != nil || user == nil || user.ID == "" {
		return "", "", errors.New("invalid refresh token")
	}

	// Access token 再発行（15分）
	user.Limit = 15 * 60
	newAccess, err := GenerateTokenWithTTL(user.ID, 15*time.Minute)
	if err != nil {
		return "", "", err
	}

	// refresh ローテ（残り7日未満）
	if time.Until(time.Unix(refreshExp, 0)) < 7*24*time.Hour {
		newRefresh := MustRandom(64)
		newExp := time.Now().UTC().Add(14 * 24 * time.Hour)

		if err := db.RotateRefreshToken(user.ID, c.Value, newRefresh, newExp); err != nil {
			return "", "", err
		}
		SetRefreshCookie(w, newRefresh, newExp) // ←これだけ
	}

	// 新Accessはヘッダで返す
	w.Header().Set("X-New-Access-Token", newAccess)

	return user.ID, newAccess, nil
}

func SetRefreshToken(db *db.Database, w http.ResponseWriter, userID string) error {
	expiresAt := time.Now().UTC().Add(14 * 24 * time.Hour)
	refreshToken := MustRandom(64)

	SetRefreshCookie(w, refreshToken, expiresAt)

	if err := db.SaveRefreshToken(refreshToken, userID, expiresAt); err != nil {
		return err
	}
	return nil
}

func CreateAssessment(token string) (float32, error) {
	ctx := context.Background()
	client, err := recaptcha.NewClient(ctx)
	if err != nil {
		return 0, fmt.Errorf("reCAPTCHA client creation failed: %w", err)
	}
	defer client.Close()

	event := &recaptchapb.Event{
		Token:   token,
		SiteKey: config.RecaptchaKey,
	}

	request := &recaptchapb.CreateAssessmentRequest{
		Assessment: &recaptchapb.Assessment{Event: event},
		Parent:     fmt.Sprintf("projects/%s", config.ProjectID),
	}

	response, err := client.CreateAssessment(ctx, request)
	if err != nil {
		return 0, fmt.Errorf("CreateAssessment call failed: %w", err)
	}

	if response.TokenProperties == nil {
		return 0, fmt.Errorf("invalid response: TokenProperties is nil")
	}

	if response.TokenProperties.Action != config.RecaptchaAction {
		return 0, fmt.Errorf("action mismatch: expected %s, got %s", config.RecaptchaAction, response.TokenProperties.Action)
	}

	// スコアを返す (0.0 〜 1.0)
	return response.RiskAnalysis.Score, nil
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

func LoadUserAndCards(db *db.Database, user_id string) ([]*utils.CardSummary, error) {
	// ユーザー情報取得
	userData, err := db.GetUserDataByID(user_id)
	if err != nil {
		return nil, fmt.Errorf("ユーザー取得失敗: %w", err)
	}

	customerID, err := db.GetCustomerID(userData.ID)
	if err != nil {
		return nil, fmt.Errorf("顧客IDの取得に失敗しました: %w", err)
	}
	userData.CustomerID = customerID

	// カード一覧取得
	cardData, err := GetCardList(userData.CustomerID)
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

	if err != nil {
		fmt.Printf("Error sending email: %v\n", err)
	}

	//　送信履歴の保存

	return res, err
}

// JWTを生成する関数
func GenerateToken(user *utils.User) (string, error) {
	claims := jwt.MapClaims{
		"id":  user.ID,
		"exp": time.Now().Add(time.Duration(user.Limit) * time.Second).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.SECRET_KEY))
}

// リフレッシュトークンを生成する関数
func GenerateRefreshToken(user *utils.User) (string, error) {
	claims := jwt.MapClaims{
		"id":  user.ID,
		"exp": time.Now().Add(14 * 24 * time.Hour).Unix(), // 例: 14日間の有効期限
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
		return []byte(config.SECRET_KEY), nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	id, _ := claims["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("token missing id")
	}

	// expは型が float64 になりがち。無くてもOKにする
	var exp int64
	switch v := claims["exp"].(type) {
	case float64:
		exp = int64(v)
	case int64:
		exp = v
	case json.Number:
		n, _ := v.Int64()
		exp = n
	}

	return &utils.User{ID: id, Exp: exp}, nil
}

func GenerateTokenWithTTL(userID string, ttl time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"id":  userID,
		"exp": time.Now().Add(ttl).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.SECRET_KEY))
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

	user := &utils.User{
		ID: id,
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
	if err != nil {
		return nil, err
	}
	b := id // uuid.UUID は [16]byte のエイリアス
	return b[:], nil
}

// 16バイト → ハイフン付きの文字列（36文字）
func UUIDBytesToString(b []byte) (string, error) {
	id, err := uuid.FromBytes(b)
	if err != nil {
		return "", err
	}
	return id.String(), nil
}

// 指定バイト数のランダムな16進文字列を生成する関数
func MustRandom(nBytes int) string {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		// ここで失敗するのは致命的なので panic でOK
		panic(err)
	}
	return hex.EncodeToString(b)
}

// リフレッシュトークン用のCookieを設定する関数
func SetRefreshCookie(w http.ResponseWriter, token string, expiresAt time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    token,
		Path:     "/", // ✅ これに戻す
		Expires:  expiresAt,
		MaxAge:   int(time.Until(expiresAt).Seconds()),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteNoneMode, // ✅ クロスオリジンなら基本これ
		// Domain: ".aftialoop.com",       // ✅ サブドメイン共有したいなら追加
	})
}

// ユーザーIDにメールを送信する関数
func SendEmailToUserID(db *db.Database, userID string, subject string, htmlContent string) error {
	user, err := db.GetUserDataByID(userID)
	if err != nil {
		return fmt.Errorf("ユーザー取得失敗: %w", err)
	}

	_, err = SendMail(user.Email, subject, htmlContent)
	return err
}

func InitConfig(db *db.Database) error {
	cfg, err := db.LoadFleaConfig()
	if err != nil {
		return err
	}
	config.FleaCfg.Store(cfg)
	return nil
}

func UpdateFleaConfig(ctx context.Context, db *db.Database, cfg config.FleaConfig) error {
	if err := db.SaveFleaConfig(ctx, cfg); err != nil {
		return err
	}

	// 再ロードしてキャッシュ更新
	newCfg, err := db.LoadFleaConfig()
	if err != nil {
		return err
	}
	config.FleaCfg.Store(newCfg)

	return nil
}

func GetFrontendURL() string {
	if config.IsProduction() {
		return "https://aftialoop.com"
	} else {
		return "http://dev.aftialoop.com"
	}
}

func IsCancellable(status string) bool {
	switch status {
	case config.TxStatusRequested, config.TxStatusAccepted, config.TxStatusPending, config.TxStatusPaid:
		return true
	default:
		// SHIPPED, COMPLETED, CANCELLED などはキャンセル不可
		return false
	}
}

// SaveImage: 画像を static/flea に保存し、Web用のパスを返す
func SaveImage(file multipart.File, originalFilename string) (string, error) {

	// 【重要】保存先ディレクトリ（ファイルシステム上のパス）
	// 実行ファイルがある場所からの相対パス "./" を使います
	saveDir := "./static/flea/"

	// ブラウザに返すURLのプレフィックス
	urlPrefix := "/static/flea/"

	// 1. 保存先ディレクトリの確保
	if err := os.MkdirAll(saveDir, 0755); err != nil {
		return "", err
	}

	// 2. ユニークなファイル名を生成
	allowedExts := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true, ".gif": true,
	}
	ext := strings.ToLower(filepath.Ext(originalFilename))
	if !allowedExts[ext] {
		return "", fmt.Errorf("unsupported file type: %s", ext)
	}
	newFilename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)

	// ファイルシステム上のパスを作成
	dstPath := filepath.Join(saveDir, newFilename)

	// 3. 空のファイルを作成
	dst, err := os.Create(dstPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	// 4. 中身をコピー
	if _, err := io.Copy(dst, file); err != nil {
		return "", err
	}

	// 5. アクセス用のURLパスを返す
	// (filepath.JoinはOSによって "\" になることがあるので、URL結合は単純結合か path.Join が安全)
	return urlPrefix + newFilename, nil
}

// SendIdentityVerificationNotification 本人確認申請の通知メールを送る
func SendIdentityVerificationNotification(userName, userID string) {
	// 送信先（管理者）のメールアドレス
	// configで管理するか、定数として定義してください
	adminEmail := config.FromEmail

	subject := "【本人確認】新規の申請が届きました"

	// HTMLメール本文
	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<body>
	<h2>新規本人確認申請のお知らせ</h2>
	<p>運営担当者 様</p>
	<p>以下のユーザーから本人確認書類の提出がありました。<br>
	管理画面から内容を確認し、承認または却下を行ってください。</p>
	
	<div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
		<p><strong>ユーザー名:</strong> %s</p>
		<p><strong>ユーザーID:</strong> %s</p>
	</div>

	<p><a href="https://admin.aftialoop.com/identity" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">管理画面を開く</a></p>
</body>
</html>
`, userName, userID)

	// あなたが用意した SendMail 関数を呼び出す
	_, err := SendMail(adminEmail, subject, htmlContent)

	if err != nil {
		// ログだけ出して処理は止めない
		fmt.Printf("Failed to send admin notification: %v\n", err)
	} else {
		fmt.Println("Admin notification email sent.")
	}
}
