package function

import (
	"animaloop/config"
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	recaptcha "cloud.google.com/go/recaptchaenterprise/v2/apiv1"
	recaptchapb "cloud.google.com/go/recaptchaenterprise/v2/apiv1/recaptchaenterprisepb"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ses"
	"github.com/aws/aws-sdk-go-v2/service/ses/types"
)

func CheckUser(w http.ResponseWriter, r *http.Request) (string, string) {
	authHeader := r.Header.Get("Authorization")

	refreshToken, err := r.Cookie("refresh_token")
	if err != nil {
		log.Println("❌ リフレッシュトークン取得失敗:", err)
	}

	if authHeader == "" && err != nil {
		return "", "トークンが有りません"
	}

	var token string
	var user *User

	if strings.HasPrefix(authHeader, "Bearer ") {
		token = strings.TrimPrefix(authHeader, "Bearer ")
		user, err = GetUserFromToken(token)
	}

	if user == nil {
		user, err = GetUserFromRefreshToken(refreshToken.Value)
		if user == nil || err != nil {
			return "", "アクセストークンが期限切れです"
		} else {
			user.Limit = 1
			newAccessToken, err := GenerateToken(user)
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
		newAccessToken, err := GenerateToken(user)
		log.Println(user)
		if err != nil {
			SetRefreshToken(w, user)
			return newAccessToken, ""
		}
		if refreshToken == nil {
			SetRefreshToken(w, user)
			return newAccessToken, ""
		}
		decoded, err := GetUserFromRefreshToken(refreshToken.Value)
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
		Name:     "refresh_token",
		Value:    refreshToken,
		Expires:  expires_at,
		HttpOnly: true,
		SameSite: http.SameSiteNoneMode,
		Secure:   true,
	})

	SaveRefreshToken(refreshToken, user.ID)

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

func PrioritizeCard(cards []CardSummary, defaultID string) []CardSummary {
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

func LoadUserAndCards(token string) ([]*CardSummary, error) {
	// トークンからID取得
	claims, err := GetUserFromToken(token)
	if err != nil {
		return nil, fmt.Errorf("トークン無効: %w", err)
	}

	// ユーザー情報取得
	userData, err := GetUserData([]string{"id = ?"}, []interface{}{claims.ID})
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
	var cardDataPointers []*CardSummary
	for i := range cardData {
		cardDataPointers = append(cardDataPointers, &cardData[i])
	}

	return cardDataPointers, nil
}

func SendMail(to string, subject string, htmlContent string) (*ses.SendEmailOutput,error) {
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
