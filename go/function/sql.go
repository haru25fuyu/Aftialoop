package function

import (
	"animaloop/config"
	"animaloop/utils"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Ensure that this file does NOT import "animaloop/app" or any package that imports "function".
// If you have shared types/interfaces between "function" and "app", move them to a new package (e.g., "animaloop/common").
// Then, import "animaloop/common" in both "function" and "app" as needed.

type Database struct {
	DB *sqlx.DB
}

// Initialize DB connection
func NewDatabase() (*Database, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=%s&parseTime=true",
		config.DB_user,
		config.DB_password,
		config.DB_host,
		config.DB_port,
		config.DB_name,
		config.DB_charset,
	)

	db, err := sqlx.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("MySQL connection error: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("MySQL ping failed: %w", err)
	}

	return &Database{DB: db}, nil
}

func (d *Database) EmailCheck(email string) (bool, error) {
	var count int
	err := d.DB.Get(&count, "SELECT COUNT(*) FROM users WHERE Email = ?", email)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (d *Database) SetRegistrationToken(user *utils.SqlUser) (string, error) {
	user_data := utils.User{
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
	_, err = d.DB.Exec("DELETE FROM user_registration_tokens WHERE Email = ?", user.Email)
	if err != nil {
		return "", err
	}
	_, err = d.DB.Exec("INSERT INTO user_registration_tokens (ID,Email, Password, Token, ExpiresAt) VALUES (?,?, ?, ?, ?)", user.ID, user.Email, user.Password, token, time.Now().Add(24*time.Hour))
	return token, err
}

func (d *Database) GetUserFromRegistrationToken(token string) (utils.SqlUser, error) {
	query := "SELECT Email, Password FROM user_registration_tokens WHERE Token = ? AND ExpiresAt > ? LIMIT 1"

	var result utils.SqlUser
	err := d.DB.Get(&result, query, token, time.Now())

	if err == sql.ErrNoRows {
		return result, fmt.Errorf("invalid token")
	}
	return result, nil
}

func (d *Database) DeleteRegistrationToken(token string) error {
	_, err := d.DB.Exec("DELETE FROM user_registration_tokens WHERE Token = ?", token)
	return err
}

// ============================================================
// ユーザー関係
// ============================================================
// ユーザーの保存
func (d *Database) SaveUser(user map[string]interface{}) error {
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
	_, err := d.DB.Exec(query, values...)
	return err
}

// ユーザーデータを取得する関数
func (d *Database) GetUserData(where []string, values []interface{}) (utils.SqlUser, error) {
	query := "SELECT ID, Email, Name, Password, DefaultCard, Point FROM users"
	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}
	var user utils.SqlUser
	err := d.DB.Get(&user, query, values...)
	if err == sql.ErrNoRows {
		return user, fmt.Errorf("user not found")
	}
	return user, nil
}

// ユーザー情報を更新する関数
func (d *Database) UpdateUser(id string, user map[string]interface{}) error {
	setClauses := []string{}
	values := []interface{}{}
	for key, value := range user {
		if key == "ID" {
			continue
		}
		if key == "GoogleID" && value == "" {
			continue
		}
		if key == "Password" && value == "" {
			continue
		}
		if key == "AppleID" && value == "" {
			continue
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = ?", key))
		values = append(values, value)
	}

	query := fmt.Sprintf("UPDATE users SET %s WHERE ID = ?", join(setClauses, ","))
	log.Println(query)
	values = append(values, id)
	log.Println(values)
	_, err := d.DB.Exec(query, values...)
	return err
}

// ユーザーのプロフィールを保存する関数
func (d *Database) SaveProfile(id string, profile map[string]interface{}) error {
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

	_, err := d.DB.Exec(query, values...)
	return err
}

// ユーザープロフィールを取得する関数
func (d *Database) GetProfile(id string) (utils.Profile, error) {
	query := "SELECT DateOfBirth,Gender,PhoneNumber,Bio,IconURL FROM profile WHERE UserID = ?"
	var profile utils.Profile
	err := d.DB.Get(&profile, query, id)
	if err == sql.ErrNoRows {
		saveErr := d.SaveProfile(id, map[string]interface{}{})
		if saveErr != nil {
			return profile, fmt.Errorf("プロフィール作成に失敗しました: %v", saveErr)
		}
		// 再度取得
		err = d.DB.Get(&profile, query, id)
		if err != nil {
			return profile, fmt.Errorf("プロフィール取得に失敗しました: %v", err)
		}
	}
	return profile, err
}

// ユーザーのデフォルトカードを設定する関数
func (d *Database) SetDefaultCard(userID, cardID string) error {
	//usersテーブルのDefaultCardを更新
	_, err := d.DB.Exec("UPDATE users SET DefaultCard = ? WHERE ID = ?", cardID, userID)
	if err != nil {
		return err
	}
	return err
}

// ユーザーのプロフィールを更新する関数
func (d *Database) UpdateProfile(id string, profile map[string]interface{}) error {
	setClauses := []string{}
	values := []interface{}{}
	for key, value := range profile {
		setClauses = append(setClauses, fmt.Sprintf("%s = ?", key))
		values = append(values, value)
	}

	query := fmt.Sprintf("UPDATE profile SET %s WHERE UserID = ?", join(setClauses, ","))
	values = append(values, id)
	_, err := d.DB.Exec(query, values...)
	return err
}

// 　ユーザーのデータとプロフィールを取得する関数
func (d *Database) GetUserDataAndProfile(where []string, values []interface{}) (utils.RequestUserProfile, error) {
	query := `SELECT u.ID,u.Name,u.Email,u.DefaultCard, p.DateOfBirth,p.Gender,p.PhoneNumber,p.Bio,p.IconURL 
	          FROM users u LEFT JOIN profile p ON u.ID = p.UserId`

	if len(where) > 0 {
		query += " WHERE " + join(where, " AND ")
	}

	var user utils.RequestUserProfile
	err := d.DB.Get(&user, query, values...)
	if err != nil {
		if err == sql.ErrNoRows {
			return utils.RequestUserProfile{}, fmt.Errorf("user not found")
		}
		return utils.RequestUserProfile{}, err
	}
	return user, nil
}

// ユーザーのリフレッシュトークンを保存する関数
func (d *Database) SaveRefreshToken(token string, user_id string) error {
	//　ユーザーIDが一致するトークンを削除
	_, err := d.DB.Exec("DELETE FROM refresh_tokens WHERE UserID = ?", user_id)
	if err != nil {
		return err
	}

	// 新しいリフレッシュトークンを保存
	_, err = d.DB.Exec("INSERT INTO refresh_tokens (Token, UserId, ExpiresAt) VALUES (?, ?, ?)", token, user_id, time.Now().Add(14*24*time.Hour))
	return err
}

//============================================================
// ユーザー興味関係
//============================================================

// お気に入りと商品情報をjoinして取得
func (d *Database) GetFavoriteItems(user_id string, limit int) ([]map[string]interface{}, error) {
	var query_limit string
	if limit != 0 {
		query_limit = "LIMIT " + strconv.Itoa(limit)
	}
	query := "SELECT * FROM favorites INNER JOIN items ON favorites.ItemID = items.ID WHERE favorites.UserID = ? " + query_limit
	var results []map[string]interface{}
	err := d.DB.Select(&results, query, user_id)
	return results, err
}

// お気に入りの追加
func (d *Database) AddFavorite(user_id string, item_id string) error {
	_, err := d.DB.Exec("INSERT INTO favorites (UserID, ItemID) VALUES (?, ?)", user_id, item_id)

	if err != nil {
		return err
	}
	return nil
}

// お気に入りの削除
func (d *Database) DeleteFavorite(user_id string, item_id string) error {
	_, err := d.DB.Exec("DELETE FROM favorites WHERE UserID = ? AND ItemID = ?", user_id, item_id)

	if err != nil {
		return err
	}
	return nil
}

// 閲覧履歴の取得
func (d *Database) GetHistory(user_id string, limit int) ([]map[string]interface{}, error) {
	var query_limit string
	if limit != 0 {
		query_limit = "LIMIT " + strconv.Itoa(limit)
	}
	query := "SELECT * FROM histories INNER JOIN items ON histories.ItemID = items.ID WHERE histories.UserID = ? " + query_limit
	var results []map[string]interface{}
	err := d.DB.Select(&results, query, user_id)
	return results, err
}

// 閲覧履歴の追加
func (d *Database) AddHistory(user_id string, item_id string) error {
	_, err := d.DB.Exec("INSERT INTO histories (UserID, ItemID) VALUES (?, ?)", user_id, item_id)

	if err != nil {
		return err
	}

	return nil
}

// 閲覧履歴の削除
func (d *Database) DeleteHistory(user_id string, item_id string) error {
	_, err := d.DB.Exec("DELETE FROM histories WHERE UserID = ? AND ItemID = ?", user_id, item_id)

	if err != nil {
		return err
	}

	return nil
}

// ============================================================
// 住所関係
// ============================================================
// 住所の更新
func (d *Database) UpdateAddress(id string, address map[string]interface{}) error {
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
	_, err := d.DB.Exec(query, values...)
	return err
}

// 住所の新規保存
func (d *Database) SaveAddress(address map[string]interface{}) error {
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

	_, err := d.DB.Exec(query, values...)

	return err
}

// 住所の取得
func (d *Database) GetAddress(id string) (utils.Address, error) {
	query := "SELECT ID,Name,Phone,UserID,PostCode,Pref,Address1,Address2,Address3,Status FROM addresses WHERE ID = ?"
	var address utils.Address
	err := d.DB.Get(&address, query, id)
	if err == sql.ErrNoRows {
		return address, fmt.Errorf("address not found")
	}
	return address, err
}

// 住所の削除
func (d *Database) DeleteAddress(id string) error {
	_, err := d.DB.Exec("UPDATE addresses SET Status = ? WHERE UserID = ?", 3, id)
	return err
}

func (d *Database) SetStatusAddress(userID, addressID string) error {
	// 全部 false に
	_, err := d.DB.Exec("UPDATE addresses SET Status = ? WHERE UserID = ? AND Status = 1", 0, userID)
	if err != nil {
		return err
	}

	// 指定のアドレスだけ true に
	_, err = d.DB.Exec("UPDATE addresses SET Status = ? WHERE ID = ?", 1, addressID)
	return err
}

// 住所リストの取得
func (d *Database) GetAddressList(user_id string) ([]utils.Address, error) {
	query := "SELECT ID,Name,Phone,UserID,PostCode,Pref,Address1,Address2,Address3,Status FROM addresses WHERE UserID = ? AND Status != 3 ORDER BY Status DESC"
	var addresses []utils.Address
	err := d.DB.Select(&addresses, query, user_id)
	return addresses, err
}

// デフォルトの住所を取得
func (d *Database) GetDefaultAddress(user_id string) (utils.Address, error) {
	query := "SELECT ID,Name,Phone,UserID,PostCode,Pref,Address1,Address2,Address3,Status FROM addresses WHERE UserID = ? AND Status = 1 LIMIT 1"
	var address utils.Address
	err := d.DB.Get(&address, query, user_id)
	return address, err
}

// ============================================================
// カード関係
// ============================================================
// カードのアドレス情報を保存
func (d *Database) SaveOrUpdateCardAddress(userID, cardID string, addressID string) error {
	// 既に存在するか確認
	var count int
	checkQuery := "SELECT COUNT(*) FROM user_payment_methods WHERE CardID = ?"
	err := d.DB.Get(&count, checkQuery, cardID)
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
		_, err := d.DB.Exec(updateQuery, addressID, cardID, userID)
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
		_, err := d.DB.Exec(insertQuery, userID, cardID, addressID)
		if err != nil {
			return fmt.Errorf("挿入失敗: %w", err)
		}
		log.Println("カード情報を新規保存しました")
	}

	return nil
}

// カードのアドレス情報を取得
func (d *Database) GetCardAddress(userID, cardID string) (utils.Address, error) {
	query := "SELECT a.ID,a.Name,a.Phone,a.UserID,a.PostCode,a.Pref,a.Address1,a.Address2,a.Address3,a.IsDefault FROM user_payment_methods upm INNER JOIN addresses a ON upm.AddressID = a.ID WHERE upm.UserID = ? AND upm.CardID = ?"
	var address utils.Address
	err := d.DB.Get(&address, query, userID, cardID)
	if err != nil {
		if err == sql.ErrNoRows {
			return address, fmt.Errorf("address not found")
		}
		return address, err
	}
	return address, nil
}

// カードのアドレス情報を削除
func (d *Database) DeleteCardAddress(userID, cardID string) error {
	_, err := d.DB.Exec("DELETE FROM user_payment_methods WHERE UserID = ? AND CardID = ?", userID, cardID)
	if err != nil {
		return err
	}
	return nil
}

// カードのアドレス情報を取得
func (d *Database) GetCardAddressByID(cardID string) (utils.CardSummary, error) {
	query := "SELECT ID FROM cards WHERE ID = ?"
	var card utils.CardSummary
	err := d.DB.Get(&card, query, cardID)
	if err == sql.ErrNoRows {
		return card, fmt.Errorf("card not found")
	}
	return card, nil
}

// ============================================================
// カート関係
// ============================================================
// カートにアイテムを追加
func (d *Database) AddToCart(userID string, item utils.Item) error {
	// 既に存在するか確認
	var count int
	checkQuery := "SELECT COUNT(*) FROM cart_items WHERE UserID = ? AND ItemID = ?"
	err := d.DB.Get(&count, checkQuery, userID, item.ID)
	if err != nil {
		return fmt.Errorf("DBチェック失敗: %w", err)
	}

	if count > 0 {
		// 存在する → //任意の数量分増やす
		updateQuery := "UPDATE cart_items SET Quantity = Quantity + ? WHERE UserID = ? AND ItemID = ?"
		_, err := d.DB.Exec(updateQuery, item.Quantity, userID, item.ID)
		if err != nil {
			return fmt.Errorf("更新失敗: %w", err)
		}
		log.Printf("カートのアイテムを更新しました: %s", item.ID)
	} else {
		// 存在しない → 追加
		insertQuery := "INSERT INTO cart_items (UserID, ItemID, Quantity) VALUES (?, ?, ?)"
		_, err := d.DB.Exec(insertQuery, userID, item.ID, item.Quantity)
		if err != nil {
			return fmt.Errorf("挿入失敗: %w", err)
		}
		log.Println("カートにアイテムを追加しました")
	}

	return nil
}

// カートのアイテムを取得
func (d *Database) GetCartItems(userID string) ([]utils.Item, error) {
	query := `
		SELECT i.ID, i.Name, i.Price,i.Point, i.MainImageURL, c.Quantity ,c.IsSelected
		FROM cart_items c 
		INNER JOIN items i ON c.ItemID = i.ID 
		WHERE c.UserID = ?
	`
	var items []utils.Item
	err := d.DB.Select(&items, query, userID)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("cart is empty")
	}
	return items, nil
}

// カートのアイテムを削除
func (d *Database) DeleteCartItem(userID, itemID string) error {
	_, err := d.DB.Exec("DELETE FROM cart_items WHERE UserID = ? AND ItemID = ?", userID, itemID)
	if err != nil {
		return fmt.Errorf("削除失敗: %w", err)
	}
	log.Printf("カートからアイテムを削除しました: %s", itemID)
	return nil
}

// カートのアイテムを更新
func (d *Database) UpdateCartItem(userID, itemID string, quantity int, isSelected bool) error {
	// 数量が0以下の場合は削除
	if quantity <= 0 {
		return d.DeleteCartItem(userID, itemID)
	}

	// 更新クエリ
	query := "UPDATE cart_items SET Quantity = ?, IsSelected = ? WHERE UserID = ? AND ItemID = ?"
	_, err := d.DB.Exec(query, quantity, isSelected, userID, itemID)
	if err != nil {
		return fmt.Errorf("更新失敗: %w", err)
	}
	log.Printf("カートのアイテムを更新しました: %s", itemID)
	return nil
}

//============================================================
// 購入履歴関係
//============================================================

// 　購入履歴を保存
func (d *Database) SavePurchaseHistory(userID, cardID string, amount int64, items []utils.Item,
	addressID string, url string) (int64, error) {
	// 購入履歴の保存してそのIDを取得
	query := `
		INSERT INTO purchase_history (UserID, PaymentMethod, TotalPrice, AddressID, PurchaseDate, ReceiptURL)
		VALUES (?, ?, ?, ?, NOW(), ?)
	`
	result, err := d.DB.Exec(query, userID, cardID, amount, addressID, url)
	if err != nil {
		return 0, fmt.Errorf("購入履歴の保存に失敗: %w", err)
	}
	// 取得したIDを取得
	purchaseID, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("購入履歴のID取得に失敗: %w", err)
	}
	log.Printf("購入履歴を保存しました: ID=%d, UserID=%s, PaymentMethod=%s, TotalPrice=%d, AddressID=%s, ReceiptURL=%s",
		purchaseID, userID, cardID, amount, addressID, url)

	//　購入履歴のアイテムを保存
	err = d.SavePurchaseItems(purchaseID, items)
	if err != nil {
		return 0, fmt.Errorf("%w", err)
	}
	return purchaseID, nil
}

// 購入履歴に領収書URLを保存
func (d *Database) SaveReceiptURL(purchaseID int64, receiptURL string) error {
	query := "UPDATE purchase_history SET ReceiptURL = ? , Status = ? WHERE ID = ?"
	_, err := d.DB.Exec(query, receiptURL, config.OrderStatusPaid, purchaseID)
	if err != nil {
		return fmt.Errorf("領収書URLの保存に失敗: %w", err)
	}
	log.Printf("領収書URLを保存しました: PurchaseID=%d, URL=%s", purchaseID, receiptURL)
	return nil
}

// 　購入履歴のアイテムを保存
func (d *Database) SavePurchaseItems(purchaseID int64, items []utils.Item) error {
	for _, item := range items {
		query := `
			INSERT INTO purchase_items (PurchaseID, ItemID, Quantity) 
			VALUES (?, ?, ?)
		`
		_, err := d.DB.Exec(query, purchaseID, item.ID, item.Quantity)
		if err != nil {
			return fmt.Errorf("購入履歴アイテムの保存に失敗: %w", err)
		}
	}
	return nil
}

// 購入履歴を取得
func (d *Database) GetPurchaseHistory(userID string, limit int) ([]utils.PurchaseHistory, error) {
	query := `
		SELECT ph.ID, ph.UserID, ph.PaymentMethod, ph.TotalPrice, ph.AddressID, ph.PurchaseDate, ph.ReceiptURL, ph.Status,
		       GROUP_CONCAT(pi.ItemID SEPARATOR ',') AS ItemIDs,
		       GROUP_CONCAT(pi.Quantity SEPARATOR ',') AS Quantities
		FROM purchase_history ph
		INNER JOIN purchase_items pi ON ph.ID = pi.PurchaseID
		WHERE ph.UserID = ?
		GROUP BY ph.ID
		ORDER BY ph.PurchaseDate DESC
	`
	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	var history []utils.PurchaseHistory
	err := d.DB.Select(&history, query, userID)
	if err != nil {
		return nil, fmt.Errorf("購入履歴の取得に失敗: %w", err)
	}
	return history, nil
}

// ============================================================
// ポイント関係
// ============================================================
// ポイントで決済を行う関数
func (d *Database) ChargePoint(userID string, amount int64) error {
	// ユーザーのポイントを取得
	var user utils.SqlUser
	err := d.DB.Get(&user, "SELECT ID, Point FROM users WHERE ID = ?", userID)
	if err != nil {
		return fmt.Errorf("ユーザーの取得に失敗: %w", err)
	}

	// ポイントが足りるか確認
	if int64(user.Point) < amount {
		return fmt.Errorf("ポイントが不足しています")
	}

	// ポイントを減算
	newPoint := int64(user.Point) - amount
	_, err = d.DB.Exec("UPDATE users SET Point = ? WHERE ID = ?", newPoint, userID)
	if err != nil {
		return fmt.Errorf("ポイントの更新に失敗: %w", err)
	}

	log.Printf("ポイント決済成功: UserID=%s, Amount=%d", userID, amount)
	return nil
}

// ポイントを追加する関数
func (d *Database) AddPoint(userID string, amount int64) error {
	// ユーザーのポイントを取得
	var user utils.SqlUser
	err := d.DB.Get(&user, "SELECT ID, Point FROM users WHERE ID = ?", userID)
	if err != nil {
		return fmt.Errorf("ユーザーの取得に失敗: %w", err)
	}

	// ポイントを加算
	newPoint := int64(user.Point) + amount
	_, err = d.DB.Exec("UPDATE users SET Point = ? WHERE ID = ?", newPoint, userID)
	if err != nil {
		return fmt.Errorf("ポイントの更新に失敗: %w", err)
	}

	log.Printf("ポイント追加成功: UserID=%s, Amount=%d", userID, amount)
	return nil
}

//============================================================
// 商品関係
//============================================================

// 商品を取得
func (d *Database) GetItemByID(id string) (*utils.Item, error) {
	var item utils.Item
	err := d.DB.Get(&item, "SELECT * FROM items WHERE ID = ?", id)
	if err != nil {
		return nil, fmt.Errorf("商品取得に失敗: %w", err)
	}
	return &item, nil
}

// 商品を保存
func (d *Database) SaveItem(item *utils.Item) error {
	query := `
		INSERT INTO items (Name, Price, CostPrice, Point, Description, CreatedAt, UpdatedAt) 
		VALUES (?, ?, ?, ?, ?, NOW(), NOW())
	`
	_, err := d.DB.Exec(query, item.Name, item.Price, item.CostPrice, item.Point, item.Description)
	if err != nil {
		return fmt.Errorf("商品保存に失敗: %w", err)
	}
	return nil
}

// 商品を更新
func (d *Database) UpdateItem(id string, item *utils.Item) error {
	query := `
		UPDATE items SET Name = ?, Price = ?, Description = ?, CostPrice = ?, Point = ?, UpdatedAt = NOW() WHERE ID = ?
	`
	_, err := d.DB.Exec(query, item.Name, item.Price, item.Description, item.CostPrice, item.Point, id)
	if err != nil {
		return fmt.Errorf("商品更新に失敗: %w", err)
	}
	return nil
}

// 商品を削除
func (d *Database) DeleteItem(id string) error {
	query := "DELETE FROM items WHERE ID = ?"
	_, err := d.DB.Exec(query, id)
	if err != nil {
		return fmt.Errorf("商品削除に失敗: %w", err)
	}
	return nil
}

// 商品一覧を取得
func (d *Database) ListItems(req utils.ListItemsRequest) ([]utils.Item, int64, error) {
	var items []utils.Item
	err := d.DB.Select(&items, "SELECT * FROM items")
	if err != nil {
		return nil, 0, fmt.Errorf("商品一覧取得に失敗: %w", err)
	}
	total := int64(len(items))
	return items, total, nil
}

func (d *Database) GetItemImages(itemID string) ([]utils.ItemImage, error) {
	var images []utils.ItemImage
	err := d.DB.Select(&images, "SELECT * FROM item_image WHERE ItemID = ? ORDER BY SortNum", itemID)
	if err != nil {
		return nil, fmt.Errorf("商品画像取得に失敗: %w", err)
	}
	return images, nil
}

// ============================================================
// フリーマーケット関係
// ============================================================
// 一覧（削除除外・新しい順）
// 一覧（削除除外・新しい順）
func (db *Database) ListFleaMarketItemsLite(limit, offset int) ([]utils.FleaMarketListLite, error) {
	const q = `
SELECT
  f.ID,
  f.Name,
  f.Price,
  f.Type,
  f.MainImageURL,
  u.Name      AS seller_name,
  p.IconURL   AS seller_icon_url
FROM flea_items AS f
LEFT JOIN users   AS u ON u.ID     = f.UserID
LEFT JOIN profile AS p ON p.UserID = f.UserID
WHERE f.DeletedAt IS NULL
ORDER BY f.CreatedAt DESC
LIMIT ? OFFSET ?;
`
	rows, err := db.DB.Query(q, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]utils.FleaMarketListLite, 0, limit)

	for rows.Next() {
		var (
			it            utils.FleaMarketListLite
			mainURL       sql.NullString
			sellerName    sql.NullString
			sellerIconURL sql.NullString
		)

		if err := rows.Scan(
			&it.ID,
			&it.Name,
			&it.Price,
			&it.Type,
			&mainURL,
			&sellerName,
			&sellerIconURL,
		); err != nil {
			return nil, err
		}

		if mainURL.Valid {
			s := mainURL.String
			it.MainImageURL = &s
		}
		if sellerName.Valid {
			it.SellerName = sellerName.String
		}
		if sellerIconURL.Valid {
			s := sellerIconURL.String
			it.SellerIconURL = &s
		}

		items = append(items, it)
	}
	return items, rows.Err()
}

// 単体取得（削除除外）
func (d *Database) GetFleaMarketItemByID(id int64) (*utils.FleaMarketItem, error) {
	var item utils.FleaMarketItem
	const q = `
		SELECT *
		FROM flea_items
		WHERE id = ? AND deleted_at IS NULL
		LIMIT 1
	`
	if err := d.DB.Get(&item, q, id); err != nil {
		return nil, err
	}
	return &item, nil
}

// 画像取得（削除済みでも参照したい運用ならこのまま、除外したいなら items 同様に条件を）
func (d *Database) GetFleaMarketItemImages(itemID int64) ([]utils.FleaMarketItemImage, error) {
	var imgs []utils.FleaMarketItemImage
	const q = `
	  SELECT *
	  FROM flea_item_images
	  WHERE item_id = ?
	  ORDER BY sort_order
	`
	if err := d.DB.Select(&imgs, q, itemID); err != nil {
		return nil, err
	}
	return imgs, nil
}

// 作成（アイテム＋画像をトランザクションで）
func (d *Database) CreateFleaMarketItem(uID string, in utils.CreateFleaMarketItemInput) (id int64, err error) {
	tx, err := d.DB.Beginx()
	if err != nil {
		return 0, err
	}

	// トランザクションの安全な終了（panic対策＋errに応じてcommit/rollback）
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		} else if err != nil {
			_ = tx.Rollback()
		} else {
			err = tx.Commit()
		}
	}()

	// まず items を作成（main_image_url は後で埋める可能性あり）
	res, err := tx.Exec(`
	  INSERT INTO flea_items
	  (UserID, Name, Description, Price, Quantity,Type, IsMultiPurchasable,
	   MainImageURL, Status, ShipFrom, ShippingFeeType, ShipsWithinDays,
	   CreatedAt, UpdatedAt)
	  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
	`,
		uID,
		in.Name,
		in.Description,
		in.Price,
		in.Quantity,
		in.Type,
		in.IsMultiPurchasable,

		in.MainImageURL, // 空ならこのあと更新する
		0,               // status=出品中
		in.ShipFrom,
		in.ShippingFeeType,
		in.ShipsWithinDays,
	)
	if err != nil {
		return 0, err
	}

	itemID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	// 画像のINSERT
	firstImageURL := ""
	for i, u := range in.ImageURLs {
		if _, err = tx.Exec(`
		  INSERT INTO flea_item_images (ItemID, URL, SortOrder)
		  VALUES (?, ?, ?)
		`, itemID, u, i); err != nil {
			return 0, err
		}
		if i == 0 {
			firstImageURL = u
		}
	}

	// main_image_url が未指定で、画像があるなら1枚目をメインに
	if (in.MainImageURL == "" || in.MainImageURL == "null") && firstImageURL != "" {
		if _, err = tx.Exec(`
		  UPDATE flea_items
		  SET main_image_url = ?, updated_at = NOW()
		  WHERE id = ?
		`, firstImageURL, itemID); err != nil {
			return 0, err
		}
	}

	return itemID, nil
}

// ソフトデリート（ヒット確認）
func (d *Database) SoftDeleteFleaMarketItem(id int64, userID string) error {
	res, err := d.DB.Exec(`
	  UPDATE flea_items
	  SET deleted_at = NOW()
	  WHERE id = ? AND user_id = ? AND deleted_at IS NULL
	`, id, userID)
	if err != nil {
		return err
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		// 既に削除済み or 権限なし or 存在しない
		// 必要に応じて nil でもOK。ここではわかりやすくエラーを返す例に。
		return fmt.Errorf("no target updated (id=%d, user=%s)", id, userID)
	}
	return nil
}

func (db *Database) FindFleaItemOwnerID(ctx context.Context, itemID uint64) (string, error) {
	const q = `
        SELECT UserId
        FROM flea_items
        WHERE ID = ? AND DeletedAt IS NULL
    `

	var uid string
	err := db.DB.QueryRowContext(ctx, q, itemID).Scan(&uid)
	if err != nil {
		return "", err
	}
	return uid, nil
}

// 生体の詳細保存
func (db *Database) UpsertAnimalDetails(
	ctx context.Context,
	itemID uint64,
	d *utils.AnimalDetails,
) error {
	if d == nil {
		return nil // 送ってこなかったら何もしない運用でもOK
	}

	_, err := db.DB.ExecContext(ctx, `
        INSERT INTO flea_item_animal_details
            (item_id, locality, hatch_date, generation, size, sex)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            locality   = VALUES(locality),
            hatch_date = VALUES(hatch_date),
            generation = VALUES(generation),
            size       = VALUES(size),
            sex        = VALUES(sex)
    `,
		itemID,
		d.Locality,
		d.HatchDate, // string(YYYY-MM-DD)で投げてれば MySQL 側でDATEに入る
		d.Generation,
		d.Size,
		d.Sex,
	)
	return err
}

// 用品の詳細
func (db *Database) UpsertSupplyDetails(
	ctx context.Context,
	itemID uint64,
	d *utils.SupplyDetails,
) error {
	if d == nil {
		return nil
	}

	_, err := db.DB.ExecContext(ctx, `
        INSERT INTO flea_item_supply_details
            (item_id, brand, sku, net_weight_g)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            brand        = VALUES(brand),
            sku          = VALUES(sku),
            net_weight_g = VALUES(net_weight_g)
    `,
		itemID,
		d.Brand,
		d.SKU,
		d.NetWeightG,
	)
	return err
}

// -----------------------------------------------------------
// 下書き関係
// ------------------------------------------------------------
func (db *Database) CreateDraft(ctx context.Context, userID string, p utils.DraftPayload) (id uint64, savedAt time.Time, err error) {
	if db.DB == nil {
		return 0, time.Time{}, errors.New("db not ready")
	}

	// TempImageURLs は JSON 文字列にして保存（列が TEXT/JSON どちらでもOK）
	var tempJSON *string
	if p.TempImageURLs != nil {
		b, _ := json.Marshal(*p.TempImageURLs)
		s := string(b)
		tempJSON = &s // nil のままなら NULL で入る
	}

	// INSERT ... SET なら列数と値数の不一致が起きない
	res, err := db.DB.ExecContext(ctx, `
		INSERT INTO flea_item_drafts
		SET UserID = ?,
		    Name = ?,
		    Description = ?,
		    Price = CASE WHEN ? IS NULL OR ? = '' THEN NULL ELSE ? END,
		    Quantity = ?,
		    Type = ?,
		    IsMultiPurchasable = COALESCE(?, 0),
		    MainImageURL = ?,
		    TempImageURLs = ?,
		    Status = 0,
		    ShipFrom = ?,
		    ShippingFeeType = ?,
		    ShipsWithinDays = ?,
		    CreatedAt = NOW(),
		    UpdatedAt = NOW()
	`,
		userID,
		p.Name, p.Description,
		p.Price, p.Price, p.Price,
		p.Quantity,
		p.Type,
		p.IsMultiPurchasable,
		p.MainImageURL,
		tempJSON,
		p.ShipFrom, p.ShippingFeeType, p.ShipsWithinDays,
	)
	if err != nil {
		return 0, time.Time{}, fmt.Errorf("insert draft: %w", err)
	}

	lastID, _ := res.LastInsertId()
	id = uint64(lastID)
	if err = db.DB.QueryRowContext(ctx, `SELECT UpdatedAt FROM flea_item_drafts WHERE ID=?`, id).Scan(&savedAt); err != nil {
		return 0, time.Time{}, fmt.Errorf("select updated_at: %w", err)
	}
	return id, savedAt, nil
}

func (db *Database) UpdateDraftByID(ctx context.Context, userID string, draftID uint64, p utils.DraftPayload) (savedAt time.Time, err error) {
	if db.DB == nil {
		return time.Time{}, errors.New("db not ready")
	}

	var exists bool
	if err = db.DB.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM flea_item_drafts WHERE ID=? AND UserID=? AND Status=0)`, draftID, userID).Scan(&exists); err != nil {
		return
	}
	if !exists {
		return time.Time{}, sql.ErrNoRows
	}

	var tempJSON *string
	if p.TempImageURLs != nil {
		b, _ := json.Marshal(p.TempImageURLs)
		s := string(b)
		tempJSON = &s
	}

	_, err = db.DB.ExecContext(ctx, `
    UPDATE flea_item_drafts
       SET Name = COALESCE(?, Name),
           Description = COALESCE(?, Description),
           Price = CASE WHEN ? IS NULL OR ? = '' THEN NULL ELSE ? END,
           Quantity = COALESCE(?, Quantity),
           Type = COALESCE(?, Type),
           IsMultiPurchasable = COALESCE(?, IsMultiPurchasable),
           MainImageURL = COALESCE(?, MainImageURL),
           TempImageURLs = COALESCE(?, TempImageURLs),
           ShipFrom = COALESCE(?, ShipFrom),
           ShippingFeeType = COALESCE(?, ShippingFeeType),
           ShipsWithinDays = COALESCE(?, ShipsWithinDays),
           UpdatedAt = NOW()
     WHERE ID=? AND UserID=? AND Status=0
  `,
		p.Name, p.Description,
		p.Price, p.Price, p.Price,
		p.Quantity, p.Type, p.IsMultiPurchasable,
		p.MainImageURL, tempJSON,
		p.ShipFrom, p.ShippingFeeType, p.ShipsWithinDays,
		draftID, userID,
	)
	if err != nil {
		return
	}
	err = db.DB.QueryRowContext(ctx, `SELECT UpdatedAt FROM flea_item_drafts WHERE ID=?`, draftID).Scan(&savedAt)
	return
}

func (db *Database) GetDraftByID(ctx context.Context, userID string, draftID uint64) (utils.LatestDraftResponse, error) {
	var out utils.LatestDraftResponse
	if db.DB == nil {
		return out, errors.New("db not ready")
	}

	var updated time.Time
	var tempJSON sql.NullString
	err := db.DB.QueryRowContext(ctx, `
    SELECT ID, Name, Description,
           CASE WHEN Price IS NULL THEN NULL ELSE TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM Price)) END,
           Quantity, Type, IsMultiPurchasable,
           MainImageURL, TempImageURLs,
           ShipFrom, ShippingFeeType, ShipsWithinDays, UpdatedAt
      FROM flea_item_drafts
     WHERE ID=? AND UserID=? AND Status=0
  `, draftID, userID).Scan(
		&out.DraftID, &out.Name, &out.Description,
		&out.Price, &out.Quantity, &out.Type, &out.IsMultiPurchasable,
		&out.MainImageURL, &tempJSON,
		&out.ShipFrom, &out.ShippingFeeType, &out.ShipsWithinDays, &updated,
	)
	if err != nil {
		return out, err
	}

	if tempJSON.Valid {
		var arr []string
		_ = json.Unmarshal([]byte(tempJSON.String), &arr)
		out.TempImageURLs = &arr
	}
	out.UpdatedAt = updated.UTC().Format(time.RFC3339)
	return out, nil
}

func (db *Database) ListDraftsByUser(ctx context.Context, userID string, limit, offset int) (utils.DraftListResponse, error) {
	var out utils.DraftListResponse
	if db.DB == nil {
		return out, errors.New("db not ready")
	}

	rows, err := db.DB.QueryContext(ctx, `
    SELECT ID, Name, UpdatedAt, Status
      FROM flea_item_drafts
     WHERE UserID=? AND Status=0
     ORDER BY UpdatedAt DESC
     LIMIT ? OFFSET ?
  `, userID, limit, offset)
	if err != nil {
		return out, err
	}
	defer rows.Close()

	for rows.Next() {
		var it utils.DraftListItem
		var updated time.Time
		if err := rows.Scan(&it.DraftID, &it.Name, &updated, &it.Status); err != nil {
			return out, err
		}
		it.UpdatedAt = updated.UTC().Format(time.RFC3339)
		out.Items = append(out.Items, it)
	}
	out.NextOffset = offset + len(out.Items)
	return out, nil
}

func (db *Database) ArchiveDraft(ctx context.Context, userID string, draftID uint64) error {
	if db.DB == nil {
		return errors.New("db not ready")
	}
	res, err := db.DB.ExecContext(ctx, `UPDATE flea_item_drafts SET Status=2, UpdatedAt=NOW() WHERE ID=? AND UserID=? AND Status=0`, draftID, userID)
	if err != nil {
		return err
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}
