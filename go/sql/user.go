package sql

import (
	"animaloop/utils"

	"database/sql"
	"fmt"
	"log"
	"strings"
)

// ============================================================
// ユーザー関係
// ============================================================

func (d *Database) SaveUser(user map[string]interface{}) error {
	columns := []string{}
	values := []interface{}{}

	for key, value := range user {
		log.Println(key, value)

		if key == "google_id" && value == "" {
			continue
		}
		if key == "password" && value == "" {
			continue
		}
		if key == "apple_id" && value == "" {
			continue
		}

		columns = append(columns, key)
		values = append(values, value)
	}

	placeholders := "?"
	for i := 1; i < len(columns); i++ {
		placeholders += ", ?"
	}

	query := fmt.Sprintf("INSERT INTO users (%s) VALUES (%s)", strings.Join(columns, ","), placeholders)
	log.Println(query)

	_, err := d.DB.Exec(query, values...)
	return err
}

func (d *Database) GetUserData(where []string, values []interface{}) (utils.SqlUser, error) {
	query := "SELECT id, email, name, default_card, point, icon_url, google_id ,following_count, followers_count,sales_balance,identity_status FROM users"

	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}

	var user utils.SqlUser
	err := d.DB.Get(&user, query, values...)

	if err != nil {
		// データが無い場合
		if err == sql.ErrNoRows {
			return user, fmt.Errorf("user not found")
		}
		// ★それ以外のエラー（型変換エラーなど）もここでキャッチして返す！
		log.Println("データベース取得エラー:", err) // ここに本当の原因が出ます
		return user, err
	}

	log.Println("GetUserDataクエリ成功:", user.Point)
	return user, nil
}

// 　ユーザーIDでカスタマーIDも含めたユーザーデータ取得
func (d *Database) GetUserDataWithCustomerIDByID(userID string) (utils.SqlUser, error) {
	return d.GetUserDataWithCustomerID([]string{"id = ?"}, []interface{}{userID})
}

// 　カスタマーIDも含めたユーザーデータ取得
func (d *Database) GetUserDataWithCustomerID(where []string, values []interface{}) (utils.SqlUser, error) {
	query := "SELECT id, email, name, default_card, point, customer_id, icon_url, following_count, followers_count FROM users"
	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}
	var user utils.SqlUser
	err := d.DB.Get(&user, query, values...)
	if err != nil {
		// データが無い場合
		if err == sql.ErrNoRows {
			return user, fmt.Errorf("user not found")
		}
		// ★それ以外のエラー（型変換エラーなど）もここでキャッチして返す！
		log.Println("データベース取得エラー:", err) // ここに本当の原因が出ます
		return user, err
	}
	return user, nil
}

func (d *Database) GetUserDataByID(userID string) (utils.SqlUser, error) {
	return d.GetUserData([]string{"id = ?"}, []interface{}{userID})
}

func (d *Database) GetUserDataByEmail(email string) (utils.SqlUser, error) {
	return d.GetUserData([]string{"email = ?"}, []interface{}{email})
}

func (d *Database) GetCustomerID(userID string) (string, error) {
	query := "SELECT customer_id FROM users WHERE id = ? LIMIT 1"
	var customerID string
	err := d.DB.Get(&customerID, query, userID)
	if err == sql.ErrNoRows {
		return "", fmt.Errorf("customer_id not found")
	}
	return customerID, err
}

func (d *Database) UpdateUser(id string, user utils.SqlUser) error {
	var setClauses []string
	var args []interface{}

	// 1. 各フィールドをチェックして、更新対象リストに追加

	// Name
	if user.Name != "" {
		setClauses = append(setClauses, "name = ?")
		args = append(args, user.Name)
	}

	// Email
	if user.Email != "" {
		setClauses = append(setClauses, "email = ?")
		args = append(args, user.Email)
	}

	// IconURL (*string なので nil チェック)
	// nil でなければ、空文字であっても更新する（アイコン削除の場合などに対応可能）
	if user.IconURL != nil {
		setClauses = append(setClauses, "icon_url = ?")
		args = append(args, *user.IconURL)
	}

	// Password
	if user.Password != "" {
		setClauses = append(setClauses, "password = ?")
		args = append(args, user.Password)
	}

	// GoogleID
	if user.GoogleID != "" {
		setClauses = append(setClauses, "google_id = ?")
		args = append(args, user.GoogleID)
	}

	// AppleID
	if user.AppleID != "" {
		setClauses = append(setClauses, "apple_id = ?")
		args = append(args, user.AppleID)
	}

	// DefaultCard
	if user.DefaultCard != "" {
		setClauses = append(setClauses, "default_card = ?")
		args = append(args, user.DefaultCard)
	}

	// 2. 更新する項目がなければ終了
	if len(setClauses) == 0 {
		return nil
	}

	// 3. クエリ組み立て
	query := fmt.Sprintf("UPDATE users SET %s WHERE id = ?", strings.Join(setClauses, ", "))

	// 4. IDを追加して実行
	args = append(args, id)

	_, err := d.DB.Exec(query, args...)
	return err
}

func (d *Database) SetDefaultCard(userID, cardID string) error {
	_, err := d.DB.Exec("UPDATE users SET default_card = ? WHERE id = ?", cardID, userID)
	return err
}

func (d *Database) GetUserDataAndProfile(where []string, values []interface{}) (utils.RequestUserProfile, error) {
	query := `
        SELECT 
            u.id, u.name, u.email, u.default_card, u.icon_url,u.identity_status, u.following_count, u.followers_count, u.google_id,
            p.date_of_birth, p.gender, p.phone_number, p.bio   
        FROM users u
        LEFT JOIN profile p ON u.id = p.user_id
    `
	// WHERE句の追加
	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}

	var user utils.SqlResponsUserProfile
	err := d.DB.Get(&user, query, values...)
	if err != nil {
		if err == sql.ErrNoRows {
			return utils.RequestUserProfile{}, fmt.Errorf("user not found")
		}
		return utils.RequestUserProfile{}, err
	}
	return utils.ToUserProfileResponse(user), nil
}

// メインまたは（認証済みの）予備メールアドレスからユーザーを検索
func (d *Database) GetUserByAnyEmail(email string) (utils.SqlUser, error) {
	// メインメアドが一致 OR (予備メアドが一致 かつ 認証済み)
	query := `
		SELECT * FROM users 
		WHERE email = ? 
		OR (sub_email = ? AND sub_email_verified_at IS NOT NULL)
		LIMIT 1
	`

	var user utils.SqlUser
	err := d.DB.Get(&user, query, email, email)

	if err != nil {
		return user, err
	}
	return user, nil
}

// 予備メールアドレスを更新（認証日時もセット）
func (d *Database) UpdateSubEmail(userID string, email string) error {
	// NOW() で現在時刻を入れる
	query := "UPDATE users SET sub_email = ?, sub_email_verified_at = NOW() WHERE id = ?"
	_, err := d.DB.Exec(query, email, userID)
	return err
}
