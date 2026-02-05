package function

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sns"
)

func SendSMS(phoneNumber, message string) error {
	// 1. AWS設定の読み込み (SESと同じく、環境変数やプロファイルを読み込みます)
	// リージョンは東京 (ap-northeast-1) を指定
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion("us-east-1"))
	if err != nil {
		return fmt.Errorf("AWS config load error: %w", err)
	}

	// 2. SNSクライアントの作成
	client := sns.NewFromConfig(cfg)

	// 3. 送信パラメータの作成
	input := &sns.PublishInput{
		Message:     aws.String(message),
		PhoneNumber: aws.String(phoneNumber),
	}

	// 4. 送信実行
	res, err := client.Publish(context.TODO(), input)
	if err != nil {
		log.Printf("SNS publish error: %v", err)
		return fmt.Errorf("SNS publish error: %w", err)
	}
	log.Printf("SNS publish result: %v", res)
	return nil
}

// FormatPhoneNumber 日本の電話番号をE.164形式 (+81...) に変換するヘルパー関数
func FormatPhoneNumber(phone string) string {
	// ハイフンやスペースを除去
	p := strings.ReplaceAll(phone, "-", "")
	p = strings.ReplaceAll(p, " ", "")

	// 090, 080, 070 などで始まる場合、先頭の0を取って +81 をつける
	if strings.HasPrefix(p, "0") {
		return "+81" + p[1:]
	}

	// すでに +81 がついているならそのまま
	return p
}
