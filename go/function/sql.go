package function

import (
	"animaloop/config"
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Initialize DB connection
func init() {
	var err error
	user := "app-user"
	password := `q+b4(F}{bH"LzSQm`
	database := "Animaloop"

	encodedPassword := url.QueryEscape(password)

	dsn := fmt.Sprintf("%s:%s@tcp(localhost:3306)/%s", user, encodedPassword, database)

	config.DB, err = sqlx.Open("mysql", dsn)
	if err != nil {
		log.Fatal("MySQL connection error:", err)
	}
}

func EmailCheck(email string) (bool, error) {
	var count int
	err := config.DB.Get(&count, "SELECT COUNT(*) FROM users WHERE Email = ?", email)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func SetRegistrationToken(user *SqlUser) (string, error) {
	user_data := User{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
		Exp:   time.Now().Add(24 * time.Hour).Unix(),
		Limit: 24,
	}
	user.ID = uuid.New().String()
	token, err := GenerateToken(&user_data)
	if err != nil {
		return "", err
	}
	//前に同じメールアドレスのやつを消す
	_, err = config.DB.Exec("DELETE FROM user_registration_tokens WHERE Email = ?", user.Email)
	if err != nil {
		return "", err
	}
	_, err = config.DB.Exec("INSERT INTO user_registration_tokens (ID,Email, Password, Token, ExpiresAt) VALUES (?,?, ?, ?, ?)", user.ID, user.Email, user.Password, token, time.Now().Add(24*time.Hour))
	return token, err
}

func GetUserFromRegistrationToken(token string) (SqlUser, error) {
	query := "SELECT Email, Password FROM user_registration_tokens WHERE Token = ? AND ExpiresAt > ? LIMIT 1"

	var result SqlUser
	err := config.DB.Get(&result, query, token, time.Now())

	if err != nil {
		if err == sql.ErrNoRows {
			return result, fmt.Errorf("invalid token")
		}
		return result, err
	}
	return result, nil
}

func DeleteRegistrationToken(token string) error {
	_, err := config.DB.Exec("DELETE FROM user_registration_tokens WHERE Token = ?", token)
	return err
}

func SaveUser(user map[string]interface{}) error {
	// カラム名と値のスライスを生成
	columns := []string{}
	values := []interface{}{}
	for key, value := range user {
		log.Println(key, value)
		columns = append(columns, key)
		values = append(values, value)
	}

	// プレースホルダの生成
	placeholders := "?"
	for i := 1; i < len(columns); i++ {
		placeholders += ", ?"
	}

	// クエリの組み立て
	query := fmt.Sprintf("INSERT INTO users (%s) VALUES (%s)", strings.Join(columns, ","), placeholders)
	log.Println(query)
	// クエリの実行
	_, err := config.DB.Exec(query, values...)
	return err
}

func GetUserData(where []string, values []interface{}) (SqlUser, error) {
	query := "SELECT ID, Email, Name, Password, DefaultCard FROM users"
	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}
	var user SqlUser
	err := config.DB.Get(&user, query, values...)
	if err != nil {
		if err == sql.ErrNoRows {
			return user, fmt.Errorf("user not found")
		}
		return user, err
	}
	return user, nil
}

func UpdateUser(id string, user map[string]interface{}) error {
	setClauses := []string{}
	values := []interface{}{}
	for key, value := range user {
		if key == "ID" {
			continue
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = ?", key))
		values = append(values, value)
	}

	query := fmt.Sprintf("UPDATE users SET %s WHERE ID = ?", join(setClauses, ","))
	log.Println(query)
	values = append(values, id)
	log.Println(values)
	_, err := config.DB.Exec(query, values...)
	return err
}

func SaveProfile(id string, profile map[string]interface{}) error {
	columns := []string{"UserID"}
	values := []interface{}{id}
	for key, value := range profile {
		columns = append(columns, key)
		values = append(values, value)
	}

	placeholders := make([]string, len(columns))
	for i := range placeholders {
		placeholders[i] = "?"
	}

	query := fmt.Sprintf("INSERT INTO profile (%s) VALUES (%s)", join(columns, ","), join(placeholders, ","))

	_, err := config.DB.Exec(query, values...)
	return err
}

func GetProfile(id string) (Profile, error) {
	query := "SELECT DateOfBirth,Gender,PhoneNumber,Bio,IconURL FROM profile WHERE UserID = ?"
	var profile Profile
	err := config.DB.Get(&profile, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			saveErr := SaveProfile(id, map[string]interface{}{})
			if saveErr != nil {
				return profile, fmt.Errorf("プロフィール作成に失敗しました: %v", saveErr)
			}
			// 再度取得
			err = config.DB.Get(&profile, query, id)
			if err != nil {
				return profile, fmt.Errorf("プロフィール取得に失敗しました: %v", err)
			}
		}
		return profile, err
	}
	return profile, nil
}

func SetDefaultCard(userID, cardID string) error {
	//usersテーブルのDefaultCardを更新
	_, err := config.DB.Exec("UPDATE users SET DefaultCard = ? WHERE ID = ?", cardID, userID)
	if err != nil {
		return err
	}
	return err
}

func UpdateProfile(id string, profile map[string]interface{}) error {
	setClauses := []string{}
	values := []interface{}{}
	for key, value := range profile {
		setClauses = append(setClauses, fmt.Sprintf("%s = ?", key))
		values = append(values, value)
	}

	query := fmt.Sprintf("UPDATE profile SET %s WHERE UserID = ?", join(setClauses, ","))
	values = append(values, id)
	_, err := config.DB.Exec(query, values...)
	return err
}

func GetUserDataAndProfile(where []string, values []interface{}) (RequestUserProfile, error) {
	query := `SELECT u.ID,u.Name,u.Email,u.DefaultCard, p.DateOfBirth,p.Gender,p.PhoneNumber,p.Bio,p.IconURL 
	          FROM users u LEFT JOIN profile p ON u.ID = p.UserId`

	if len(where) > 0 {
		query += " WHERE " + join(where, " AND ")
	}

	var user RequestUserProfile
	err := config.DB.Get(&user, query, values...)
	if err != nil {
		if err == sql.ErrNoRows {
			return RequestUserProfile{}, fmt.Errorf("user not found")
		}
		return RequestUserProfile{}, err
	}
	return user, nil
}

func SaveRefreshToken(token string, user_id string) error {
	//　ユーザーIDが一致するトークンを削除
	_, err := config.DB.Exec("DELETE FROM refresh_tokens WHERE UserID = ?", user_id)
	if err != nil {
		return err
	}

	// 新しいリフレッシュトークンを保存
	_, err = config.DB.Exec("INSERT INTO refresh_tokens (Token, UserId, ExpiresAt) VALUES (?, ?, ?)", token, user_id, time.Now().Add(14*24*time.Hour))
	return err
}

// お気に入りと商品情報をjoinして取得
func GetFavoriteItems(user_id string, limit int) ([]map[string]interface{}, error) {
	var query_limit string
	if limit != 0 {
		query_limit = "LIMIT " + string(limit)
	}
	query := "SELECT * FROM favorites INNER JOIN items ON favorites.ItemID = items.ID WHERE favorites.UserID = ? " + query_limit
	var results []map[string]interface{}
	err := config.DB.Select(&results, query, user_id)
	return results, err
}

// お気に入りの追加
func AddFavorite(user_id string, item_id string) error {
	_, err := config.DB.Exec("INSERT INTO favorites (UserID, ItemID) VALUES (?, ?)", user_id, item_id)

	if err != nil {
		return err
	}
	return nil
}

// お気に入りの削除
func DeleteFavorite(user_id string, item_id string) error {
	_, err := config.DB.Exec("DELETE FROM favorites WHERE UserID = ? AND ItemID = ?", user_id, item_id)

	if err != nil {
		return err
	}
	return nil
}

// 閲覧履歴の取得
func GetHistory(user_id string, limit int) ([]map[string]interface{}, error) {
	var query_limit string
	if limit != 0 {
		query_limit = "LIMIT " + string(limit)
	}
	query := "SELECT * FROM histories INNER JOIN items ON histories.ItemID = items.ID WHERE histories.UserID = ? " + query_limit
	var results []map[string]interface{}
	err := config.DB.Select(&results, query, user_id)
	return results, err
}

// 閲覧履歴の追加
func AddHistory(user_id string, item_id string) error {
	_, err := config.DB.Exec("INSERT INTO histories (UserID, ItemID) VALUES (?, ?)", user_id, item_id)

	if err != nil {
		return err
	}

	return nil
}

// 閲覧履歴の削除
func DeleteHistory(user_id string, item_id string) error {
	_, err := config.DB.Exec("DELETE FROM histories WHERE UserID = ? AND ItemID = ?", user_id, item_id)

	if err != nil {
		return err
	}

	return nil
}

// 住所の更新
func UpdateAddress(id string, address map[string]interface{}) error {
	setClauses := []string{}
	values := []interface{}{}
	for key, value := range address {
		if key == "ID" || key == "UserID" || key == "Status" {
			continue
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = ?", key))
		values = append(values, value)
	}
	query := fmt.Sprintf("UPDATE addresses SET %s WHERE ID = ?", join(setClauses, ","))
	values = append(values, id)
	_, err := config.DB.Exec(query, values...)
	return err
}

// 住所の新規保存
func SaveAddress(address map[string]interface{}) error {
	// Generate columns and values
	columns := []string{}
	values := []interface{}{}
	for key, value := range address {
		if key == "ID" || key == "Status" {
			continue
		}
		columns = append(columns, key)
		values = append(values, value)
	}

	// SQL query
	placeholders := "?"
	for i := 1; i < len(columns); i++ {
		placeholders += ", ?"
	}
	query := fmt.Sprintf("INSERT INTO addresses (%s) VALUES (%s)", join(columns, ","), placeholders)

	_, err := config.DB.Exec(query, values...)
	return err
}

// 住所の取得
func GetAddress(id string) (Address, error) {
	query := "SELECT ID,Name,Phone,UserID,PostCode,Pref,Address1,Address2,Address3,Status FROM addresses WHERE ID = ?"
	var address Address
	err := config.DB.Get(&address, query, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return address, fmt.Errorf("address not found")
		}
		return address, err
	}
	return address, nil
}

// 住所の削除
func DeleteAddress(id string) error {
	_, err := config.DB.Exec("UPDATE addresses SET Status = ? WHERE UserID = ?", 3, id)
	return err
}

func SetStatusAddress(userID, addressID string) error {
	// 全部 false に
	_, err := config.DB.Exec("UPDATE addresses SET Status = ? WHERE UserID = ? AND Status = 1", 0, userID)
	if err != nil {
		return err
	}

	// 指定のアドレスだけ true に
	_, err = config.DB.Exec("UPDATE addresses SET Status = ? WHERE ID = ?", 1, addressID)
	return err
}

// 住所リストの取得
func GetAddressList(user_id string) ([]Address, error) {
	query := "SELECT ID,Name,Phone,UserID,PostCode,Pref,Address1,Address2,Address3,Status FROM addresses WHERE UserID = ? AND Status != 3 ORDER BY Status DESC"
	var addresses []Address
	err := config.DB.Select(&addresses, query, user_id)
	return addresses, err
}

// カードのアドレス情報を保存
func SaveOrUpdateCardAddress(userID, cardID string, addressID string) error {
	// 既に存在するか確認
	var count int
	checkQuery := "SELECT COUNT(*) FROM user_payment_methods WHERE CardID = ?"
	err := config.DB.Get(&count, checkQuery, cardID)
	if err != nil {
		return fmt.Errorf("DBチェック失敗: %w", err)
	}

	if count > 0 {
		// 存在する → 更新
		updateQuery := `
			UPDATE user_payment_methods 
			SET AddressID = ?, UpdatedAt = NOW() 
			WHERE CardID = ? AND UserID = ?
		`
		_, err := config.DB.Exec(updateQuery, addressID, cardID, userID)
		if err != nil {
			return fmt.Errorf("更新失敗: %w", err)
		}
		log.Printf("カード情報を更新しました"+" %s", cardID)
	} else {
		// 存在しない → 追加
		insertQuery := `
			INSERT INTO user_payment_methods (UserID, CardID, AddressID, CreatedAt, UpdatedAt) 
			VALUES (?, ?, ?, NOW(), NOW())
		`
		_, err := config.DB.Exec(insertQuery, userID, cardID, addressID)
		if err != nil {
			return fmt.Errorf("挿入失敗: %w", err)
		}
		log.Println("カード情報を新規保存しました")
	}

	return nil
}

// カードのアドレス情報を取得
func GetCardAddress(userID, cardID string) (Address, error) {
	query := "SELECT a.ID,a.Name,a.Phone,a.UserID,a.PostCode,a.Pref,a.Address1,a.Address2,a.Address3,a.IsDefault FROM user_payment_methods upm INNER JOIN addresses a ON upm.AddressID = a.ID WHERE upm.UserID = ? AND upm.CardID = ?"
	var address Address
	err := config.DB.Get(&address, query, userID, cardID)
	if err != nil {
		if err == sql.ErrNoRows {
			return address, fmt.Errorf("address not found")
		}
		return address, err
	}
	return address, nil
}

// カードのアドレス情報を削除
func DeleteCardAddress(userID, cardID string) error {
	_, err := config.DB.Exec("DELETE FROM user_payment_methods WHERE UserID = ? AND CardID = ?", userID, cardID)
	if err != nil {
		return err
	}
	return nil
}

// カードのアドレス情報を取得
func GetCardByID(cardID string) (CardSummary, error) {
	query := "SELECT ID FROM cards WHERE ID = ?"
	var card CardSummary
	err := config.DB.Get(&card, query, cardID)
	if err != nil {
		if err == sql.ErrNoRows {
			return card, fmt.Errorf("card not found")
		}
		return card, err
	}
	return card, nil
}

// スライスを結合する関数
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
