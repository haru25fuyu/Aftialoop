package sql

import (
	"errors"
	"fmt"
)

// GetIdentityImageByID 指定されたIDと面(front/back)の画像データを取得する
func (db *Database) GetIdentityImageByID(id string, side string) ([]byte, string, error) {
	// カラム名の決定（SQLインジェクション対策のためホワイトリスト方式で分岐）
	var column string
	switch side {
	case "front":
		column = "image_front_data"
	case "back":
		column = "image_back_data"
	case "selfie":
		column = "image_selfie_data"
	default:
		return nil, "", errors.New("invalid side parameter")
	}

	// SQL構築 (カラム名はプレースホルダーにできないため fmt.Sprintf を使用)
	// column変数は上で安全な文字列を入れているので埋め込みOK
	query := fmt.Sprintf("SELECT %s, mime_type FROM identity_verifications WHERE id = ?", column)

	var imageData []byte
	var mimeType string

	// 実行
	err := db.DB.QueryRow(query, id).Scan(&imageData, &mimeType)
	if err != nil {
		return nil, "", err
	}

	return imageData, mimeType, nil
}

// InsertIdentityVerification 本人確認データを保存する
// 引数に selfieData を追加
func (db *Database) InsertIdentityVerification(userID, realName, realNameKana, birthDate, address string, frontData, backData, selfieData []byte, mimeType string) error {
	// SQLに image_selfie_data を追加
	query := `
        INSERT INTO identity_verifications 
        (user_id, real_name, real_name_kana, birth_date, address, image_front_data, image_back_data, image_selfie_data, mime_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

	// Execの引数にも selfieData を追加
	_, err := db.DB.Exec(query, userID, realName, realNameKana, birthDate, address, frontData, backData, selfieData, mimeType)
	if err != nil {
		return fmt.Errorf("failed to insert identity verification: %w", err)
	}

	return nil
}
