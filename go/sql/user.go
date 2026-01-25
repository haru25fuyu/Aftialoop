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
	query := "SELECT id, email, name, default_card, point, icon_url, following_count, followers_count,sales_balance FROM users"

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

func (d *Database) UpdateUser(id string, user map[string]interface{}) error {
	setClauses := []string{}
	values := []interface{}{}

	for key, value := range user {
		if key == "id" {
			continue
		}
		if key == "google_id" && value == "" {
			continue
		}
		if key == "password" && value == "" {
			continue
		}
		if key == "apple_id" && value == "" {
			continue
		}

		setClauses = append(setClauses, fmt.Sprintf("%s = ?", key))
		values = append(values, value)
	}

	query := fmt.Sprintf("UPDATE users SET %s WHERE id = ?", strings.Join(setClauses, ","))
	log.Println(query)

	values = append(values, id)
	log.Println(values)

	_, err := d.DB.Exec(query, values...)
	return err
}

func (d *Database) SaveProfile(id string, profile map[string]interface{}) error {
	columns := []string{"user_id"}
	values := []interface{}{id}

	for key, value := range profile {
		columns = append(columns, key)
		values = append(values, value)
	}

	placeholders := make([]string, len(columns))
	for i := range placeholders {
		placeholders[i] = "?"
	}

	query := fmt.Sprintf("INSERT INTO profile (%s) VALUES (%s)", strings.Join(columns, ","), strings.Join(placeholders, ","))

	_, err := d.DB.Exec(query, values...)
	return err
}

func (d *Database) GetProfile(id string) (utils.Profile, error) {
	query := "SELECT date_of_birth, gender, phone_number, bio FROM profile WHERE user_id = ?"
	var profile utils.Profile

	err := d.DB.Get(&profile, query, id)
	if err == sql.ErrNoRows {
		saveErr := d.SaveProfile(id, map[string]interface{}{})
		if saveErr != nil {
			return profile, fmt.Errorf("プロフィール作成に失敗しました: %v", saveErr)
		}
		err = d.DB.Get(&profile, query, id)
		if err != nil {
			return profile, fmt.Errorf("プロフィール取得に失敗しました: %v", err)
		}
	}
	return profile, err
}

func (d *Database) SetDefaultCard(userID, cardID string) error {
	_, err := d.DB.Exec("UPDATE users SET default_card = ? WHERE id = ?", cardID, userID)
	return err
}

func (d *Database) UpdateProfile(id string, profile map[string]interface{}) error {
	setClauses := []string{}
	values := []interface{}{}

	for key, value := range profile {
		setClauses = append(setClauses, fmt.Sprintf("%s = ?", key))
		values = append(values, value)
	}

	query := fmt.Sprintf("UPDATE profile SET %s WHERE user_id = ?", strings.Join(setClauses, ","))
	values = append(values, id)

	_, err := d.DB.Exec(query, values...)
	return err
}

func (d *Database) GetUserDataAndProfile(where []string, values []interface{}) (utils.RequestUserProfile, error) {
	query := `
        SELECT 
            u.id, u.name, u.email, u.default_card, u.icon_url, -- ★修正: u.icon_url に変更
            p.date_of_birth, p.gender, p.phone_number, p.bio   -- p.icon_url は削除
        FROM users u
        LEFT JOIN profile p ON u.id = p.user_id
    `
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
