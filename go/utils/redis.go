package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

var Rdb *redis.Client

func InitRedis() {
	Rdb = redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "pZ6@e!sFpcqDuUdJfGk", // Redisパスワード
		DB:       0,
	})

	ctx := context.Background()
	if err := Rdb.Ping(ctx).Err(); err != nil {
		log.Fatal("Redis接続失敗:", err)
	}
	fmt.Println("✅ Redisに接続成功！")
}

// 認証コードを保存 (有効期限 10分)
func SaveAuthCode(ctx context.Context, phoneNumber string, code string) error {
	key := "sms:" + phoneNumber
	return Rdb.Set(ctx, key, code, 10*time.Minute).Err()
}

// 認証コードを確認
func VerifyAuthCode(ctx context.Context, phoneNumber string, inputCode string) (bool, error) {
	key := "sms:" + phoneNumber
	val, err := Rdb.Get(ctx, key).Result()

	if err == redis.Nil {
		return false, fmt.Errorf("コードが見つからないか、期限切れです")
	} else if err != nil {
		return false, err
	}

	if val == inputCode {
		// 認証成功したら、もう使えないように消しておく
		Rdb.Del(ctx, key)
		return true, nil
	}
	return false, nil
}

// メール変更用のデータを保存 (コードと新しいメアドをJSONで保存)
type EmailChangeData struct {
	NewEmail string `json:"new_email"`
	Code     string `json:"code"`
}

func SaveEmailChangeCode(ctx context.Context, userID string, newEmail string, code string) error {
	key := "email_change:" + userID
	data := EmailChangeData{NewEmail: newEmail, Code: code}
	jsonData, _ := json.Marshal(data)

	// 30分有効
	return Rdb.Set(ctx, key, jsonData, 30*time.Minute).Err()
}

func GetEmailChangeData(ctx context.Context, userID string) (*EmailChangeData, error) {
	key := "email_change:" + userID
	val, err := Rdb.Get(ctx, key).Result()
	if err != nil {
		return nil, err
	}

	var data EmailChangeData
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return nil, err
	}
	return &data, nil
}

func DeleteEmailChangeData(ctx context.Context, userID string) {
	Rdb.Del(ctx, "email_change:"+userID)
}

func SaveSubEmailCode(ctx context.Context, userID string, email string, code string) error {
	key := "sub_email:" + userID
	data := EmailChangeData{NewEmail: email, Code: code}
	jsonData, _ := json.Marshal(data)
	return Rdb.Set(ctx, key, jsonData, 30*time.Minute).Err()
}

func GetSubEmailData(ctx context.Context, userID string) (*EmailChangeData, error) {
	key := "sub_email:" + userID
	val, err := Rdb.Get(ctx, key).Result()
	if err != nil {
		return nil, err
	}
	var data EmailChangeData
	json.Unmarshal([]byte(val), &data)
	return &data, nil
}

func DeleteSubEmailData(ctx context.Context, userID string) {
	Rdb.Del(ctx, "sub_email:"+userID)
}
