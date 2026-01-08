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

type Database struct {
	DB *sqlx.DB
}

// ============================================================
// DB 初期化
// ============================================================

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

// ============================================================
// Flea config (system_settings)
// ============================================================

func (d *Database) LoadFleaConfig() (*config.FleaConfig, error) {
	rows, err := d.DB.Query(`
		SELECT ` + "`key`, `value`, `updated_at`" + `
		FROM system_settings
		WHERE ` + "`key`" + ` IN ('flea.base_rate', 'flea.max_rate')
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cfg := &config.FleaConfig{}
	var updatedAt time.Time

	for rows.Next() {
		var k, v string
		var ua time.Time
		if err := rows.Scan(&k, &v, &ua); err != nil {
			return nil, err
		}

		switch k {
		case "flea.base_rate":
			f, err := strconv.ParseFloat(v, 64)
			if err != nil {
				return nil, fmt.Errorf("invalid base_rate: %w", err)
			}
			cfg.BaseRate = f
			updatedAt = ua

		case "flea.max_rate":
			f, err := strconv.ParseFloat(v, 64)
			if err != nil {
				return nil, fmt.Errorf("invalid max_rate: %w", err)
			}
			cfg.MaxRate = f
			updatedAt = ua
		}
	}

	if cfg.BaseRate <= 0 || cfg.MaxRate <= 0 {
		return nil, errors.New("flea config is incomplete")
	}
	if cfg.BaseRate > cfg.MaxRate {
		return nil, errors.New("base_rate > max_rate")
	}

	cfg.UpdatedAt = updatedAt
	return cfg, nil
}

func (d *Database) SaveFleaConfig(ctx context.Context, cfg config.FleaConfig) error {
	if cfg.BaseRate <= 0 {
		return errors.New("base_rate must be > 0")
	}
	if cfg.MaxRate <= 0 {
		return errors.New("max_rate must be > 0")
	}
	if cfg.BaseRate > cfg.MaxRate {
		return errors.New("base_rate > max_rate")
	}

	tx, err := d.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	upsert := `
		INSERT INTO system_settings (` + "`key`, `value`" + `)
		VALUES (?, ?)
		ON DUPLICATE KEY UPDATE
			value = VALUES(value),
			updated_at = CURRENT_TIMESTAMP
	`

	if _, err := tx.ExecContext(ctx, upsert,
		"flea.base_rate",
		strconv.FormatFloat(cfg.BaseRate, 'f', -1, 64),
	); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, upsert,
		"flea.max_rate",
		strconv.FormatFloat(cfg.MaxRate, 'f', -1, 64),
	); err != nil {
		return err
	}

	return tx.Commit()
}

// ============================================================
// ユーザー登録トークン
// ============================================================

func (d *Database) EmailCheck(email string) (bool, error) {
	var count int
	err := d.DB.Get(&count, "SELECT COUNT(*) FROM users WHERE email = ?", email)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (d *Database) SetRegistrationToken(user *utils.SqlUser) (string, error) {
	userData := utils.User{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
		Exp:   time.Now().Add(24 * time.Hour).Unix(),
		Limit: 24,
	}

	user.ID = uuid.New().String()
	token, err := GenerateToken(&userData)
	if err != nil {
		return "", err
	}

	_, err = d.DB.Exec("DELETE FROM user_registration_tokens WHERE email = ?", user.Email)
	if err != nil {
		return "", err
	}

	_, err = d.DB.Exec(`
		INSERT INTO user_registration_tokens (id, email, password, token, expires_at)
		VALUES (?, ?, ?, ?, ?)
	`, user.ID, user.Email, user.Password, token, time.Now().Add(24*time.Hour))

	return token, err
}

func (d *Database) GetUserFromRegistrationToken(token string) (utils.SqlUser, error) {
	query := `
		SELECT email, password
		FROM user_registration_tokens
		WHERE token = ? AND expires_at > ?
		LIMIT 1
	`

	var result utils.SqlUser
	err := d.DB.Get(&result, query, token, time.Now())
	if err == sql.ErrNoRows {
		return result, fmt.Errorf("invalid token")
	}
	return result, err
}

func (d *Database) DeleteRegistrationToken(token string) error {
	_, err := d.DB.Exec("DELETE FROM user_registration_tokens WHERE token = ?", token)
	return err
}

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
	query := "SELECT id, email, name, password, default_card, point FROM users"
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

	query := fmt.Sprintf("UPDATE users SET %s WHERE id = ?", join(setClauses, ","))
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

	query := fmt.Sprintf("INSERT INTO profile (%s) VALUES (%s)", join(columns, ","), join(placeholders, ","))

	_, err := d.DB.Exec(query, values...)
	return err
}

func (d *Database) GetProfile(id string) (utils.Profile, error) {
	query := "SELECT date_of_birth, gender, phone_number, bio, icon_url FROM profile WHERE user_id = ?"
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

	query := fmt.Sprintf("UPDATE profile SET %s WHERE user_id = ?", join(setClauses, ","))
	values = append(values, id)

	_, err := d.DB.Exec(query, values...)
	return err
}

func (d *Database) GetUserDataAndProfile(where []string, values []interface{}) (utils.RequestUserProfile, error) {
	query := `
		SELECT u.id, u.name, u.email, u.default_card,
		       p.date_of_birth, p.gender, p.phone_number, p.bio, p.icon_url
		FROM users u
		LEFT JOIN profile p ON u.id = p.user_id
	`
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

// ============================================================
// リフレッシュトークン
// ============================================================

func (d *Database) SaveRefreshToken(token string, userID string, expiresAt time.Time) error {
	_, err := d.DB.Exec("DELETE FROM refresh_tokens WHERE user_id = ?", userID)
	if err != nil {
		return err
	}
	_, err = d.DB.Exec(`
		INSERT INTO refresh_tokens (refresh_token, user_id, expires_at)
		VALUES (?, ?, ?)
	`, token, userID, expiresAt)
	return err
}

func (d *Database) GetUserByRefreshToken(token string) (*utils.User, int64, error) {
	var userID string
	var expiresAt time.Time

	err := d.DB.QueryRow(`
		SELECT user_id, expires_at
		FROM refresh_tokens
		WHERE refresh_token = ?
		LIMIT 1
	`, token).Scan(&userID, &expiresAt)

	log.Println("GetUserByRefreshToken:", token, userID, expiresAt, err)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, 0, errors.New("refresh token not found: " + err.Error())
		}
		return nil, 0, err
	}

	if time.Now().UTC().After(expiresAt) {
		return nil, 0, errors.New("refresh token expired")
	}

	return &utils.User{ID: userID}, expiresAt.Unix(), nil
}

func (d *Database) RotateRefreshToken(
	userID string,
	oldToken string,
	newToken string,
	newExpiresAt time.Time,
) error {
	_, err := d.DB.Exec(`
		UPDATE refresh_tokens
		SET refresh_token = ?, expires_at = ?, created_at = UTC_TIMESTAMP()
		WHERE user_id = ? AND refresh_token = ?
	`, newToken, newExpiresAt, userID, oldToken)

	return err
}

func (d *Database) CreateRefreshToken(userID string, token string, expiresAt time.Time) error {
	_, err := d.DB.Exec(`
		INSERT INTO refresh_tokens (user_id, refresh_token, expires_at)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE
			refresh_token = VALUES(refresh_token),
			expires_at = VALUES(expires_at),
			created_at = UTC_TIMESTAMP()
	`, userID, token, expiresAt)

	return err
}

// ============================================================
// プロフィール興味関係
// ============================================================

func (d *Database) GetFavoriteItems(userID string, limit int) ([]map[string]interface{}, error) {
	var queryLimit string
	if limit != 0 {
		queryLimit = "LIMIT " + strconv.Itoa(limit)
	}
	query := "SELECT * FROM favorites INNER JOIN items ON favorites.item_id = items.id WHERE favorites.user_id = ? " + queryLimit

	var results []map[string]interface{}
	err := d.DB.Select(&results, query, userID)
	return results, err
}

func (d *Database) AddFavorite(userID string, itemID string) error {
	_, err := d.DB.Exec("INSERT INTO favorites (user_id, item_id) VALUES (?, ?)", userID, itemID)
	return err
}

func (d *Database) DeleteFavorite(userID string, itemID string) error {
	_, err := d.DB.Exec("DELETE FROM favorites WHERE user_id = ? AND item_id = ?", userID, itemID)
	return err
}

func (d *Database) GetHistory(userID string, limit int) ([]map[string]interface{}, error) {
	var queryLimit string
	if limit != 0 {
		queryLimit = "LIMIT " + strconv.Itoa(limit)
	}
	query := "SELECT * FROM histories INNER JOIN items ON histories.item_id = items.id WHERE histories.user_id = ? " + queryLimit

	var results []map[string]interface{}
	err := d.DB.Select(&results, query, userID)
	return results, err
}

func (d *Database) AddHistory(userID string, itemID string) error {
	_, err := d.DB.Exec("INSERT INTO histories (user_id, item_id) VALUES (?, ?)", userID, itemID)
	return err
}

func (d *Database) DeleteHistory(userID string, itemID string) error {
	_, err := d.DB.Exec("DELETE FROM histories WHERE user_id = ? AND item_id = ?", userID, itemID)
	return err
}

// ============================================================
// 住所関係
// ============================================================

func (d *Database) UpdateAddress(
	userID string,
	id string,
	p *utils.Address,
) error {

	set := []string{}
	vals := []any{}

	if p.Name != nil && *p.Name != "" {
		set = append(set, "name = ?")
		vals = append(vals, *p.Name)
	}
	if p.Phone != nil && *p.Phone != "" {
		set = append(set, "phone = ?")
		vals = append(vals, *p.Phone)
	}
	if p.PostCode != nil && *p.PostCode != "" {
		set = append(set, "post_code = ?")
		vals = append(vals, *p.PostCode)
	}
	if p.Pref != nil && *p.Pref != "" {
		set = append(set, "pref = ?")
		vals = append(vals, *p.Pref)
	}
	if p.Address1 != nil && *p.Address1 != "" {
		set = append(set, "address1 = ?")
		vals = append(vals, *p.Address1)
	}
	if p.Address2 != nil && *p.Address2 != "" {
		set = append(set, "address2 = ?")
		vals = append(vals, *p.Address2)
	}
	if p.Address3 != nil && *p.Address3 != "" {
		set = append(set, "address3 = ?")
		vals = append(vals, *p.Address3)
	}

	if len(set) == 0 {
		return nil
	}

	q := fmt.Sprintf(
		"UPDATE addresses SET %s WHERE id = ? AND user_id = ?",
		strings.Join(set, ", "),
	)
	vals = append(vals, id, userID)

	_, err := d.DB.Exec(q, vals...)
	return err
}

func (d *Database) AddAddress(a *utils.Address) error {
	_, err := d.DB.NamedExec(`
		INSERT INTO addresses
		(user_id, name, phone, post_code, pref, address1, address2, address3)
		VALUES
		(:user_id, :name, :phone, :post_code, :pref, :address1, :address2, :address3)
	`, a)
	return err
}

func (d *Database) GetAddress(id string, userID string) (utils.Address, error) {
	query := `
		SELECT id, name, phone, user_id, post_code, pref, address1, address2, address3, status
		FROM addresses
		WHERE id = ? AND user_id = ?
		LIMIT 1
	`
	var address utils.Address
	err := d.DB.Get(&address, query, id, userID)
	if err == sql.ErrNoRows {
		return address, fmt.Errorf("address not found")
	}
	return address, err
}

func (d *Database) DeleteAddress(id string) error {
	// 元コードは WHERE user_id = ? に id を渡してたので明確にバグ。
	// ここは「id を渡す」想定で直す（意図に沿う）。
	_, err := d.DB.Exec("UPDATE addresses SET status = ? WHERE id = ?", 3, id)
	return err
}

func (d *Database) SetStatusAddress(userID, addressID string) error {
	_, err := d.DB.Exec("UPDATE addresses SET status = ? WHERE user_id = ? AND status = 1", 0, userID)
	if err != nil {
		return err
	}
	_, err = d.DB.Exec("UPDATE addresses SET status = ? WHERE id = ?", 1, addressID)
	return err
}

func (d *Database) GetAddressList(userID string) ([]utils.Address, error) {
	query := `
		SELECT id, name, phone, user_id, post_code, pref, address1, address2, address3, status
		FROM addresses
		WHERE user_id = ? AND status != 3
		ORDER BY status DESC
	`
	var addresses []utils.Address
	err := d.DB.Select(&addresses, query, userID)
	return addresses, err
}

func (d *Database) GetDefaultAddress(userID string) (*utils.Address, error) {
	query := `
		SELECT id, name, phone, user_id, post_code, pref, address1, address2, address3, status
		FROM addresses
		WHERE user_id = ? AND status = 1
		LIMIT 1
	`
	var address utils.Address
	err := d.DB.Get(&address, query, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // ← ここが超重要（正常）
		}
		return nil, err
	}
	return &address, nil
}

// ============================================================
// カード関係
// ============================================================

func (d *Database) SaveOrUpdateCardAddress(userID, cardID string, addressID string) error {
	var count int
	checkQuery := "SELECT COUNT(*) FROM user_payment_methods WHERE card_id = ?"
	err := d.DB.Get(&count, checkQuery, cardID)
	if err != nil {
		return fmt.Errorf("DBチェック失敗: %w", err)
	}

	if count > 0 {
		updateQuery := `
			UPDATE user_payment_methods
			SET address_id = ?, updated_at = UTC_TIMESTAMP()
			WHERE card_id = ? AND user_id = ?
		`
		_, err := d.DB.Exec(updateQuery, addressID, cardID, userID)
		if err != nil {
			return fmt.Errorf("更新失敗: %w", err)
		}
		log.Printf("カード情報を更新しました %s", cardID)
	} else {
		insertQuery := `
			INSERT INTO user_payment_methods (user_id, card_id, address_id, created_at, updated_at)
			VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
		`
		_, err := d.DB.Exec(insertQuery, userID, cardID, addressID)
		if err != nil {
			return fmt.Errorf("挿入失敗: %w", err)
		}
		log.Println("カード情報を新規保存しました")
	}

	return nil
}

func (d *Database) GetCardAddress(userID, cardID string) (utils.Address, error) {
	query := `
		SELECT a.id, a.name, a.phone, a.user_id, a.post_code, a.pref, a.address1, a.address2, a.address3, a.status
		FROM user_payment_methods upm
		INNER JOIN addresses a ON upm.address_id = a.id
		WHERE upm.user_id = ? AND upm.card_id = ?
	`
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

func (d *Database) DeleteCardAddress(userID, cardID string) error {
	_, err := d.DB.Exec("DELETE FROM user_payment_methods WHERE user_id = ? AND card_id = ?", userID, cardID)
	return err
}

func (d *Database) GetCardAddressByID(cardID string) (utils.CardSummary, error) {
	query := "SELECT id FROM cards WHERE id = ?"
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

func (d *Database) AddToCart(userID string, item utils.Item) error {
	var count int
	checkQuery := "SELECT COUNT(*) FROM cart_items WHERE user_id = ? AND item_id = ?"
	err := d.DB.Get(&count, checkQuery, userID, item.ID)
	if err != nil {
		return fmt.Errorf("DBチェック失敗: %w", err)
	}

	if count > 0 {
		updateQuery := "UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND item_id = ?"
		_, err := d.DB.Exec(updateQuery, item.Quantity, userID, item.ID)
		if err != nil {
			return fmt.Errorf("更新失敗: %w", err)
		}
		log.Printf("カートのアイテムを更新しました: %s", item.ID)
	} else {
		insertQuery := "INSERT INTO cart_items (user_id, item_id, quantity) VALUES (?, ?, ?)"
		_, err := d.DB.Exec(insertQuery, userID, item.ID, item.Quantity)
		if err != nil {
			return fmt.Errorf("挿入失敗: %w", err)
		}
		log.Println("カートにアイテムを追加しました")
	}

	return nil
}

func (d *Database) GetCartItems(userID string) ([]utils.Item, error) {
	query := `
		SELECT i.id, i.name, i.price, i.point, i.main_image_url, c.quantity, c.is_selected
		FROM cart_items c
		INNER JOIN items i ON c.item_id = i.id
		WHERE c.user_id = ?
	`
	var items []utils.Item
	err := d.DB.Select(&items, query, userID)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("cart is empty")
	}
	return items, err
}

func (d *Database) DeleteCartItem(userID, itemID string) error {
	_, err := d.DB.Exec("DELETE FROM cart_items WHERE user_id = ? AND item_id = ?", userID, itemID)
	if err != nil {
		return fmt.Errorf("削除失敗: %w", err)
	}
	log.Printf("カートからアイテムを削除しました: %s", itemID)
	return nil
}

func (d *Database) UpdateCartItem(userID, itemID string, quantity int, isSelected bool) error {
	if quantity <= 0 {
		return d.DeleteCartItem(userID, itemID)
	}

	query := "UPDATE cart_items SET quantity = ?, is_selected = ? WHERE user_id = ? AND item_id = ?"
	_, err := d.DB.Exec(query, quantity, isSelected, userID, itemID)
	if err != nil {
		return fmt.Errorf("更新失敗: %w", err)
	}

	log.Printf("カートのアイテムを更新しました: %s", itemID)
	return nil
}

// ============================================================
// 購入履歴関係
// ============================================================

func (d *Database) SavePurchaseHistory(userID, cardID string, amount int64, items []utils.Item, addressID string, url string) (int64, error) {
	query := `
		INSERT INTO purchase_history (user_id, payment_method, total_price, address_id, purchase_date, receipt_url)
		VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), ?)
	`
	result, err := d.DB.Exec(query, userID, cardID, amount, addressID, url)
	if err != nil {
		return 0, fmt.Errorf("購入履歴の保存に失敗: %w", err)
	}

	purchaseID, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("購入履歴のID取得に失敗: %w", err)
	}

	log.Printf("購入履歴を保存しました: ID=%d, UserID=%s, PaymentMethod=%s, TotalPrice=%d, AddressID=%s, ReceiptURL=%s",
		purchaseID, userID, cardID, amount, addressID, url)

	if err := d.SavePurchaseItems(purchaseID, items); err != nil {
		return 0, fmt.Errorf("%w", err)
	}

	return purchaseID, nil
}

func (d *Database) SaveReceiptURL(purchaseID int64, receiptURL string) error {
	query := "UPDATE purchase_history SET receipt_url = ?, status = ? WHERE id = ?"
	_, err := d.DB.Exec(query, receiptURL, config.OrderStatusPaid, purchaseID)
	if err != nil {
		return fmt.Errorf("領収書URLの保存に失敗: %w", err)
	}
	log.Printf("領収書URLを保存しました: PurchaseID=%d, URL=%s", purchaseID, receiptURL)
	return nil
}

func (d *Database) SavePurchaseItems(purchaseID int64, items []utils.Item) error {
	for _, item := range items {
		query := `
			INSERT INTO purchase_items (purchase_id, item_id, quantity)
			VALUES (?, ?, ?)
		`
		_, err := d.DB.Exec(query, purchaseID, item.ID, item.Quantity)
		if err != nil {
			return fmt.Errorf("購入履歴アイテムの保存に失敗: %w", err)
		}
	}
	return nil
}

func (d *Database) GetPurchaseHistory(userID string, limit int) ([]utils.PurchaseHistory, error) {
	query := `
		SELECT ph.id, ph.user_id, ph.payment_method, ph.total_price, ph.address_id, ph.purchase_date, ph.receipt_url, ph.status,
		       GROUP_CONCAT(pi.item_id SEPARATOR ',') AS item_ids,
		       GROUP_CONCAT(pi.quantity SEPARATOR ',') AS quantities
		FROM purchase_history ph
		INNER JOIN purchase_items pi ON ph.id = pi.purchase_id
		WHERE ph.user_id = ?
		GROUP BY ph.id
		ORDER BY ph.purchase_date DESC
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

func (d *Database) ChargePoint(userID string, amount int64) error {
	var user utils.SqlUser
	err := d.DB.Get(&user, "SELECT id, point FROM users WHERE id = ?", userID)
	if err != nil {
		return fmt.Errorf("ユーザーの取得に失敗: %w", err)
	}

	if int64(user.Point) < amount {
		return fmt.Errorf("ポイントが不足しています")
	}

	newPoint := int64(user.Point) - amount
	_, err = d.DB.Exec("UPDATE users SET point = ? WHERE id = ?", newPoint, userID)
	if err != nil {
		return fmt.Errorf("ポイントの更新に失敗: %w", err)
	}

	log.Printf("ポイント決済成功: UserID=%s, Amount=%d", userID, amount)
	return nil
}

func (d *Database) AddPoint(userID string, amount int64) error {
	var user utils.SqlUser
	err := d.DB.Get(&user, "SELECT id, point FROM users WHERE id = ?", userID)
	if err != nil {
		return fmt.Errorf("ユーザーの取得に失敗: %w", err)
	}

	newPoint := int64(user.Point) + amount
	_, err = d.DB.Exec("UPDATE users SET point = ? WHERE id = ?", newPoint, userID)
	if err != nil {
		return fmt.Errorf("ポイントの更新に失敗: %w", err)
	}

	log.Printf("ポイント追加成功: UserID=%s, Amount=%d", userID, amount)
	return nil
}

// ============================================================
// 商品関係
// ============================================================

func (d *Database) GetItemByID(id string) (*utils.Item, error) {
	var item utils.Item
	err := d.DB.Get(&item, "SELECT * FROM items WHERE id = ?", id)
	if err != nil {
		return nil, fmt.Errorf("商品取得に失敗: %w", err)
	}
	return &item, nil
}

func (d *Database) SaveItem(item *utils.Item) error {
	query := `
		INSERT INTO items (name, price, cost_price, point, description, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
	`
	_, err := d.DB.Exec(query, item.Name, item.Price, item.CostPrice, item.Point, item.Description)
	if err != nil {
		return fmt.Errorf("商品保存に失敗: %w", err)
	}
	return nil
}

func (d *Database) UpdateItem(id string, item *utils.Item) error {
	query := `
		UPDATE items
		SET name = ?, price = ?, description = ?, cost_price = ?, point = ?, updated_at = UTC_TIMESTAMP()
		WHERE id = ?
	`
	_, err := d.DB.Exec(query, item.Name, item.Price, item.Description, item.CostPrice, item.Point, id)
	if err != nil {
		return fmt.Errorf("商品更新に失敗: %w", err)
	}
	return nil
}

func (d *Database) DeleteItem(id string) error {
	_, err := d.DB.Exec("DELETE FROM items WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("商品削除に失敗: %w", err)
	}
	return nil
}

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
	err := d.DB.Select(&images, "SELECT * FROM item_image WHERE item_id = ? ORDER BY sort_num", itemID)
	if err != nil {
		return nil, fmt.Errorf("商品画像取得に失敗: %w", err)
	}
	return images, nil
}

// ============================================================
// フリーマーケット関係
// ============================================================

func (db *Database) ListFleaMarketItemsLite(limit, offset int) ([]utils.FleaMarketListLite, error) {
	const q = `
		SELECT
		  f.id,
		  f.name,
		  f.price,
		  f.seller_rate,
		  f.type,
		  f.main_image_url,
		  u.name    AS seller_name,
		  p.icon_url AS seller_icon_url
		FROM flea_items AS f
		LEFT JOIN users   AS u ON u.id     = f.user_id
		LEFT JOIN profile AS p ON p.user_id = f.user_id
		WHERE f.deleted_at IS NULL
		AND f.status = ?
		ORDER BY f.created_at DESC
		LIMIT ? OFFSET ?;
	`

	rows, err := db.DB.Query(q, config.FleaItemStatusActive, limit, offset)
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
			&it.SellerRate,
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

func (d *Database) GetFleaMarketItemByID(id uint64) (*utils.FleaMarketItemDetail, error) {
	var item utils.FleaMarketItemDetail
	log.Println("GetFleaMarketItemByID called with id:", id)

	const q = `
		SELECT
			f.*,
			u.name AS user_name,
			p.icon_url AS user_icon
		FROM flea_items AS f
		JOIN users AS u ON u.id = f.user_id
		LEFT JOIN profile AS p ON p.user_id = u.id
		WHERE f.id = ?
		  AND f.deleted_at IS NULL
		LIMIT 1;
	`

	if err := d.DB.Get(&item, q, id); err != nil {
		return nil, err
	}
	return &item, nil
}

func (d *Database) GetFleaMarketSellerID(itemID int64) (*string, error) {
	var sellerID string
	const q = `
		SELECT
			f.user_id
		FROM flea_items AS f
		WHERE f.id = ?
		LIMIT 1;
	`

	if err := d.DB.Get(&sellerID, q, itemID); err != nil {
		return nil, err
	}
	return &sellerID, nil
}

func (d *Database) GetFleaMarketItemImages(itemID uint64) ([]utils.ItemImage, error) {
	const q = `
        SELECT
            id,
            item_id,
            sort_num,
            url
        FROM flea_item_images
        WHERE item_id = ?
        ORDER BY sort_num ASC, id ASC;
    `
	var images []utils.ItemImage
	if err := d.DB.Select(&images, q, itemID); err != nil {
		return nil, err
	}
	return images, nil
}

func (d *Database) CreateFleaMarketItem(uID string, in utils.CreateFleaMarketItemInput) (id int64, err error) {
	tx, err := d.DB.Beginx()
	if err != nil {
		return 0, err
	}

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

	res, err := tx.Exec(`
		INSERT INTO flea_items
			(user_id, name, description, price, seller_rate, quantity, type, is_multi_purchasable,
			 main_image_url, status, ship_from, shipping_fee_type, ships_within_days,
			 created_at, updated_at)
		VALUES
			(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
	`,
		uID,
		in.Name,
		in.Description,
		in.Price,
		in.SellerRateBP,
		in.Quantity,
		in.Type,
		in.IsMultiPurchasable,
		in.MainImageURL,
		0,
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

	firstImageURL := ""
	for i, u := range in.ImageURLs {
		if _, err = tx.Exec(`
			INSERT INTO flea_item_images (item_id, url, sort_num)
			VALUES (?, ?, ?)
		`, itemID, u, i); err != nil {
			return 0, err
		}
		if i == 0 {
			firstImageURL = u
		}
	}

	if (in.MainImageURL == "" || in.MainImageURL == "null") && firstImageURL != "" {
		if _, err = tx.Exec(`
			UPDATE flea_items
			SET main_image_url = ?, updated_at = UTC_TIMESTAMP()
			WHERE id = ?
		`, firstImageURL, itemID); err != nil {
			return 0, err
		}
	}

	return itemID, nil
}

func (d *Database) SoftDeleteFleaMarketItem(id int64, userID string) error {
	res, err := d.DB.Exec(`
		UPDATE flea_items
		SET deleted_at = UTC_TIMESTAMP()
		WHERE id = ? AND user_id = ? AND deleted_at IS NULL
	`, id, userID)
	if err != nil {
		return err
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		return fmt.Errorf("no target updated (id=%d, user=%s)", id, userID)
	}
	return nil
}

func (db *Database) FindFleaItemOwnerID(ctx context.Context, itemID uint64) (string, error) {
	const q = `
        SELECT user_id
        FROM flea_items
        WHERE id = ? AND deleted_at IS NULL
    `
	var uid string
	err := db.DB.QueryRowContext(ctx, q, itemID).Scan(&uid)
	if err != nil {
		return "", err
	}
	return uid, nil
}

// 動物詳細取得
func (d *Database) GetAnimalDetailsByItemID(itemID int64) (*utils.AnimalDetails, error) {
	const q = `
		SELECT locality, hatch_date, generation, size, sex
		FROM flea_item_animal_details
		WHERE item_id = ?
		LIMIT 1;
	`

	var detail utils.AnimalDetails
	if err := d.DB.Get(&detail, q, itemID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &detail, nil
}

func (db *Database) UpsertAnimalDetails(ctx context.Context, itemID uint64, d0 *utils.AnimalDetails) error {
	if d0 == nil {
		return nil
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
		d0.Locality,
		d0.HatchDate,
		d0.Generation,
		d0.Size,
		d0.Sex,
	)
	return err
}

func (db *Database) UpsertSupplyDetails(ctx context.Context, itemID uint64, d0 *utils.SupplyDetails) error {
	if d0 == nil {
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
		d0.Brand,
		d0.SKU,
		d0.NetWeightG,
	)
	return err
}

func (d *Database) GetSupplyDetailsByItemID(itemID int64) (*utils.SupplyDetails, error) {
	const q = `
		SELECT brand, sku, net_weight_g
		FROM flea_item_supply_details
		WHERE item_id = ?
		LIMIT 1;
	`

	var detail utils.SupplyDetails
	if err := d.DB.Get(&detail, q, itemID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &detail, nil
}

func (d *Database) GetFleaMarketItemDetail(id int64, itemType string) (*utils.FleaMarketItemDetails, error) {
	detail := &utils.FleaMarketItemDetails{}

	switch itemType {
	case "animal":
		ad, err := d.GetAnimalDetailsByItemID(id)
		if err != nil {
			return nil, err
		}
		detail.Animal = ad

	case "supply":
		sd, err := d.GetSupplyDetailsByItemID(id)
		if err != nil {
			return nil, err
		}
		detail.Supply = sd

	default:
		// noop
	}

	return detail, nil
}

// -----------------------------------------------------------
// 取引関係
// -----------------------------------------------------------

// CreateFleaPurchaseRequest: 購入申請を作成（契約前）
func (db *Database) CreateFleaPurchaseRequest(
	ctx context.Context,
	buyerID string,
	itemID int64,
	addressID int,
	shippingMethodPref string,
	shippingFeePref string,
	note *string,
) (uint64, error) {

	if db.DB == nil {
		return 0, errors.New("db not ready")
	}
	buyerID = strings.TrimSpace(buyerID)
	if buyerID == "" || itemID <= 0 || addressID <= 0 {
		return 0, errors.New("bad input")
	}

	shippingMethodPref = normalizeEnum(shippingMethodPref)
	shippingFeePref = normalizeEnum(shippingFeePref)

	if !isOneOf(shippingMethodPref, "SELLER_CHOICE", "ANONYMIZED", "MEETUP") {
		return 0, errors.New("invalid shipping method pref")
	}
	if !isOneOf(shippingFeePref, "OK_EITHER", "WANT_INCLUDED", "WANT_COD") {
		return 0, errors.New("invalid shipping fee pref")
	}

	// 出品者取得（flea_items のカラム名はあなたの環境の実名に合わせている：user_id）
	var sellerID string
	sellerIDPtr, err := db.GetFleaMarketSellerID(itemID)

	if err == nil && sellerIDPtr != nil {
		sellerID = *sellerIDPtr
	} else {
		return 0, errors.New("item not found")
	}

	if err != nil {
		return 0, err
	}
	if sellerID == buyerID {
		return 0, errors.New("forbidden")
	}

	var noteVal any = nil
	if note != nil {
		s := strings.TrimSpace(*note)
		if s != "" {
			if len([]rune(s)) > 500 {
				return 0, errors.New("note too long")
			}
			noteVal = s
		}
	}

	res, err := db.DB.ExecContext(ctx, `
		INSERT INTO flea_purchase_requests
			(item_id, buyer_id, seller_id, address_id, shipping_method_pref, shipping_fee_pref, note, status)
		VALUES
			(?, ?, ?, ?, ?, ?, ?, 'REQUESTED')
	`, itemID, buyerID, sellerID, addressID, shippingMethodPref, shippingFeePref, noteVal)
	if err != nil {
		return 0, err
	}

	lastID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	//　アイテムのステータスを変更する
	_, err = db.DB.ExecContext(ctx, `
		UPDATE flea_items
		   SET status = ?
		 WHERE id = ? AND status = 0 AND deleted_at IS NULL
	`, config.FleaItemStatusTrading, itemID)
	if err != nil {
		return 0, err
	}

	return uint64(lastID), nil
}

// GetFleaPurchaseRequestByID: 購入申請詳細（購入者 or 出品者のみ閲覧可）
func (db *Database) GetFleaPurchaseRequestByID(ctx context.Context, userID string, reqID uint64) (utils.FleaPurchaseRequestRow, error) {
	var out utils.FleaPurchaseRequestRow
	if db.DB == nil {
		return out, errors.New("db not ready")
	}
	userID = strings.TrimSpace(userID)
	if userID == "" || reqID == 0 {
		return out, errors.New("bad input")
	}

	var created, updated time.Time
	var note sql.NullString

	err := db.DB.QueryRowContext(ctx, `
		SELECT id, item_id, buyer_id, seller_id, address_id,
		       shipping_method_pref, shipping_fee_pref, note, status,
		       created_at, updated_at
		  FROM flea_purchase_requests
		 WHERE id = ?
		   AND (buyer_id = ? OR seller_id = ?)
		 LIMIT 1
	`, reqID, userID, userID).Scan(
		&out.ID, &out.ItemID, &out.BuyerID, &out.SellerID, &out.AddressID,
		&out.ShippingMethodPref, &out.ShippingFeePref, &note, &out.Status,
		&created, &updated,
	)
	if err != nil {
		return out, err
	}

	if note.Valid {
		s := note.String
		out.Note = &s
	}

	out.CreatedAt = created.UTC().Format(time.RFC3339)
	out.UpdatedAt = updated.UTC().Format(time.RFC3339)
	return out, nil
}

// CancelFleaPurchaseRequest: 購入者が REQUESTED の間だけキャンセル
func (db *Database) CancelFleaPurchaseRequest(ctx context.Context, buyerID string, reqID uint64) error {
	if db.DB == nil {
		return errors.New("db not ready")
	}
	buyerID = strings.TrimSpace(buyerID)
	if buyerID == "" || reqID == 0 {
		return errors.New("bad input")
	}

	res, err := db.DB.ExecContext(ctx, `
		UPDATE flea_purchase_requests
		   SET status = 'CANCELLED'
		 WHERE id = ? AND buyer_id = ? AND status = 'REQUESTED'
	`, reqID, buyerID)
	if err != nil {
		return err
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		return errors.New("invalid state")
	}
	return nil
}

// ------------------------------
// Flea Transaction
// ------------------------------

// AcceptFleaPurchaseRequest: 出品者が承諾して transaction を作成
func (db *Database) AcceptFleaPurchaseRequest(
	ctx context.Context,
	sellerID string,
	reqID uint64,
	shippingMethod string,
	shippingFeeType string,
	priceItem uint32,
	priceShipping uint32,
) (uint64, error) {

	if db.DB == nil {
		return 0, errors.New("db not ready")
	}
	sellerID = strings.TrimSpace(sellerID)
	if sellerID == "" || reqID == 0 || priceItem == 0 {
		return 0, errors.New("bad input")
	}

	shippingMethod = normalizeEnum(shippingMethod)
	shippingFeeType = normalizeEnum(shippingFeeType)

	if !isOneOf(shippingMethod, "SELLER_CHOICE", "ANONYMIZED", "MEETUP") {
		return 0, errors.New("invalid shipping method")
	}
	if !isOneOf(shippingFeeType, "INCLUDED", "COD") {
		return 0, errors.New("invalid shipping fee type")
	}

	tx, err := db.DB.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return 0, err
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	// 申請行ロック
	var prID uint64
	var itemID int64
	var buyerID string
	var prSellerID string
	var addressID int
	var status string

	err = tx.QueryRowContext(ctx, `
		SELECT id, item_id, buyer_id, seller_id, address_id, status
		  FROM flea_purchase_requests
		 WHERE id = ?
		 FOR UPDATE
	`, reqID).Scan(&prID, &itemID, &buyerID, &prSellerID, &addressID, &status)
	if err != nil {
		return 0, err
	}

	if prSellerID != sellerID {
		return 0, errors.New("forbidden")
	}
	if status != "REQUESTED" {
		return 0, errors.New("purchase request already handled")
	}

	// 申請をACCEPTEDへ
	res, err := tx.ExecContext(ctx, `
		UPDATE flea_purchase_requests
		   SET status = 'ACCEPTED'
		 WHERE id = ? AND status = 'REQUESTED'
	`, reqID)
	if err != nil {
		return 0, err
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		return 0, errors.New("invalid state")
	}

	// transaction 作成（purchase_request_id UNIQUEで二重作成防止）
	res, err = tx.ExecContext(ctx, `
		INSERT INTO flea_transactions
			(purchase_request_id, item_id, buyer_id, seller_id, address_id,
			 shipping_method, shipping_fee_type, price_item, price_shipping,
			 payment_status, status)
		VALUES
			(?, ?, ?, ?, ?, ?, ?, ?, ?, 'NONE', 'ACCEPTED')
	`, reqID, itemID, buyerID, prSellerID, addressID,
		shippingMethod, shippingFeeType, priceItem, priceShipping)
	if err != nil {
		if isDuplicateErr(err) {
			return 0, errors.New("transaction already exists")
		}
		return 0, err
	}

	lastID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	committed = true

	return uint64(lastID), nil
}

// GetFleaTransactionByID: 取引詳細（購入者 or 出品者のみ閲覧可）
func (db *Database) GetFleaTransactionByID(ctx context.Context, userID string, txID uint64) (utils.FleaTransactionRow, error) {
	var out utils.FleaTransactionRow
	if db.DB == nil {
		return out, errors.New("db not ready")
	}
	userID = strings.TrimSpace(userID)
	if userID == "" || txID == 0 {
		return out, errors.New("bad input")
	}

	var shipped, completed sql.NullTime
	var created, updated time.Time
	var payProv, payID sql.NullString

	err := db.DB.QueryRowContext(ctx, `
		SELECT id, purchase_request_id, item_id, buyer_id, seller_id, address_id,
		       shipping_method, shipping_fee_type, price_item, price_shipping,
		       payment_provider, payment_id, payment_status, status,
		       shipped_at, completed_at, created_at, updated_at
		  FROM flea_transactions
		 WHERE id = ?
		   AND (buyer_id = ? OR seller_id = ?)
		 LIMIT 1
	`, txID, userID, userID).Scan(
		&out.ID, &out.PurchaseRequestID, &out.ItemID, &out.BuyerID, &out.SellerID, &out.AddressID,
		&out.ShippingMethod, &out.ShippingFeeType, &out.PriceItem, &out.PriceShipping,
		&payProv, &payID, &out.PaymentStatus, &out.Status,
		&shipped, &completed, &created, &updated,
	)
	if err != nil {
		return out, err
	}

	if payProv.Valid {
		s := payProv.String
		out.PaymentProvider = &s
	}
	if payID.Valid {
		s := payID.String
		out.PaymentID = &s
	}
	if shipped.Valid {
		s := shipped.Time.UTC().Format(time.RFC3339)
		out.ShippedAt = &s
	}
	if completed.Valid {
		s := completed.Time.UTC().Format(time.RFC3339)
		out.CompletedAt = &s
	}

	out.CreatedAt = created.UTC().Format(time.RFC3339)
	out.UpdatedAt = updated.UTC().Format(time.RFC3339)
	return out, nil
}

// ListFleaTransactionsByBuyer: 購入者側の取引一覧（status 絞り込み可、totalも返す）
func (db *Database) ListFleaTransactionsByBuyer(
	ctx context.Context,
	buyerID string,
	status *string, // nil or "" なら全件
	limit, offset int,
) ([]utils.FleaTransactionRow, int, error) {

	if db.DB == nil {
		return nil, 0, errors.New("db not ready")
	}
	buyerID = strings.TrimSpace(buyerID)
	if buyerID == "" {
		return nil, 0, errors.New("bad input")
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	where := "buyer_id = ?"
	args := []any{buyerID}

	if status != nil && strings.TrimSpace(*status) != "" {
		st := normalizeEnum(*status)
		where += " AND status = ?"
		args = append(args, st)
	}

	// total
	var total int
	if err := db.DB.QueryRowContext(ctx, `
		SELECT COUNT(*)
		  FROM flea_transactions
		 WHERE `+where+`
	`, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// list
	args = append(args, limit, offset)
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, purchase_request_id, item_id, buyer_id, seller_id, address_id,
		       shipping_method, shipping_fee_type, price_item, price_shipping,
		       payment_provider, payment_id, payment_status, status,
		       shipped_at, completed_at, created_at, updated_at
		  FROM flea_transactions
		 WHERE `+where+`
		 ORDER BY created_at DESC
		 LIMIT ? OFFSET ?
	`, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []utils.FleaTransactionRow
	for rows.Next() {
		var it utils.FleaTransactionRow
		var shipped, completed sql.NullTime
		var created, updated time.Time
		var payProv, payID sql.NullString

		if err := rows.Scan(
			&it.ID, &it.PurchaseRequestID, &it.ItemID, &it.BuyerID, &it.SellerID, &it.AddressID,
			&it.ShippingMethod, &it.ShippingFeeType, &it.PriceItem, &it.PriceShipping,
			&payProv, &payID, &it.PaymentStatus, &it.Status,
			&shipped, &completed, &created, &updated,
		); err != nil {
			return nil, 0, err
		}

		if payProv.Valid {
			s := payProv.String
			it.PaymentProvider = &s
		}
		if payID.Valid {
			s := payID.String
			it.PaymentID = &s
		}
		if shipped.Valid {
			s := shipped.Time.UTC().Format(time.RFC3339)
			it.ShippedAt = &s
		}
		if completed.Valid {
			s := completed.Time.UTC().Format(time.RFC3339)
			it.CompletedAt = &s
		}

		it.CreatedAt = created.UTC().Format(time.RFC3339)
		it.UpdatedAt = updated.UTC().Format(time.RFC3339)

		list = append(list, it)
	}

	return list, total, nil
}

// ListFleaTransactionsBySeller: 販売者側の取引一覧（status 絞り込み可、totalも返す）
func (db *Database) ListFleaPurchaseRequestsBySeller(
	ctx context.Context,
	sellerID string,
	status *string,
	limit, offset int,
) ([]utils.FleaPurchaseRequestListItem, int, error) {

	if db.DB == nil {
		return nil, 0, errors.New("db not ready")
	}
	sellerID = strings.TrimSpace(sellerID)
	if sellerID == "" {
		return nil, 0, errors.New("bad input")
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	where := "pr.seller_id = ?"
	args := []any{sellerID}

	if status != nil && strings.TrimSpace(*status) != "" {
		st := normalizeEnum(*status)
		where += " AND pr.status = ?"
		args = append(args, st)
	}

	// total
	var total int
	if err := db.DB.QueryRowContext(ctx, `
		SELECT COUNT(*)
		  FROM flea_purchase_requests pr
		 WHERE `+where+`
	`, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// list
	args2 := append(append([]any{}, args...), limit, offset)

	rows, err := db.DB.QueryContext(ctx, `
		SELECT
			pr.id, pr.item_id,
			COALESCE(fi.name, '') AS item_name,
			fi.main_image_url,
			pr.buyer_id, pr.seller_id, pr.address_id,
			pr.shipping_method_pref, pr.shipping_fee_pref,
			pr.note, pr.status,
			pr.created_at, pr.updated_at
		FROM flea_purchase_requests pr
		JOIN flea_items fi ON fi.id = pr.item_id
		WHERE `+where+`
		ORDER BY pr.created_at DESC
		LIMIT ? OFFSET ?
	`, args2...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]utils.FleaPurchaseRequestListItem, 0, limit)
	for rows.Next() {
		var it utils.FleaPurchaseRequestListItem
		var note sql.NullString
		var mainURL sql.NullString
		var created, updated time.Time

		if err := rows.Scan(
			&it.ID, &it.ItemID,
			&it.ItemName,
			&mainURL,
			&it.BuyerID, &it.SellerID, &it.AddressID,
			&it.ShippingMethodPref, &it.ShippingFeePref,
			&note, &it.Status,
			&created, &updated,
		); err != nil {
			return nil, 0, err
		}

		if mainURL.Valid {
			s := mainURL.String
			it.ItemMainImageURL = &s
		}
		if note.Valid {
			s := note.String
			it.Note = &s
		}

		it.CreatedAt = created.UTC().Format(time.RFC3339)
		it.UpdatedAt = updated.UTC().Format(time.RFC3339)

		list = append(list, it)
	}

	return list, total, rows.Err()
}

// -----------------------------------------------------------
// コメント関係
// -----------------------------------------------------------

func (d *Database) GetFleaItemMessages(itemID uint64) ([]*utils.FleaItemMessage, error) {
	rows, err := d.DB.Query(`
        SELECT
			fim.id,
			fim.item_id,
			fim.parent_message_id,
			fim.user_id,
			fim.body,
			fim.created_at,
			u.name AS user_name,
			p.icon_url AS user_icon
        FROM flea_item_messages fim
		JOIN users u ON u.id = fim.user_id
		LEFT JOIN profile p ON p.user_id = u.id
        WHERE fim.item_id = ? AND fim.deleted_at IS NULL
        ORDER BY fim.created_at ASC, fim.id ASC
    `, itemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]*utils.FleaItemMessage, 0)

	for rows.Next() {
		var (
			id, iid      int64
			parent       sql.NullInt64
			userID, body string
			userName     sql.NullString
			userIcon     sql.NullString
			createdAt    time.Time
		)

		if err := rows.Scan(&id, &iid, &parent, &userID, &body, &createdAt, &userName, &userIcon); err != nil {
			return nil, err
		}

		var pID *int64
		if parent.Valid {
			v := parent.Int64
			pID = &v
		}

		result = append(result, &utils.FleaItemMessage{
			ID:              id,
			ItemID:          iid,
			ParentMessageID: pID,
			UserID:          userID,
			Body:            body,
			UserName:        userName.String,
			UserIcon:        userIcon.String,
			CreatedAt:       createdAt.UnixMilli(),
		})
	}

	return result, nil
}

func (d *Database) AddFleaItemMessage(itemID uint64, userID string, parentID *uint64, body string) (int64, error) {
	body = strings.TrimSpace(body)
	if body == "" {
		return 0, fmt.Errorf("body empty")
	}

	res, err := d.DB.Exec(`
        INSERT INTO flea_item_messages (item_id, parent_message_id, user_id, body, created_at)
        VALUES (?, ?, ?, ?, UTC_TIMESTAMP())
    `, itemID, parentID, userID, body)
	if err != nil {
		return 0, err
	}

	newID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	return newID, nil
}

func (d *Database) GetFleaItemMessageUserIDs(itemID uint64, userID string) ([]string, error) {
	rows, err := d.DB.Query(`
		SELECT DISTINCT user_id
		FROM flea_item_messages
		WHERE item_id = ?
		  AND deleted_at IS NULL
		  AND user_id != ?
	`, itemID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var userIDs []string
	for rows.Next() {
		var uid string
		if err := rows.Scan(&uid); err != nil {
			return nil, err
		}
		userIDs = append(userIDs, uid)
	}

	return userIDs, nil
}

// -----------------------------------------------------------
// 下書き関係
// -----------------------------------------------------------

func (db *Database) CreateDraft(ctx context.Context, userID string, p utils.DraftPayload) (id uint64, savedAt time.Time, err error) {
	if db.DB == nil {
		return 0, time.Time{}, errors.New("db not ready")
	}

	var tempJSON *string
	if p.TempImageURLs != nil {
		b, _ := json.Marshal(*p.TempImageURLs)
		s := string(b)
		tempJSON = &s
	}

	res, err := db.DB.ExecContext(ctx, `
		INSERT INTO flea_item_drafts
		SET user_id = ?,
		    name = ?,
		    description = ?,
		    price = CASE WHEN ? IS NULL OR ? = '' THEN NULL ELSE ? END,
		    quantity = ?,
		    type = ?,
		    is_multi_purchasable = COALESCE(?, 0),
		    main_image_url = ?,
		    temp_image_urls = ?,
		    status = 0,
		    ship_from = ?,
		    shipping_fee_type = ?,
		    ships_within_days = ?,
		    created_at = UTC_TIMESTAMP(),
		    updated_at = UTC_TIMESTAMP()
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

	if err = db.DB.QueryRowContext(ctx, `SELECT updated_at FROM flea_item_drafts WHERE id = ?`, id).Scan(&savedAt); err != nil {
		return 0, time.Time{}, fmt.Errorf("select updated_at: %w", err)
	}

	return id, savedAt, nil
}

func (db *Database) UpdateDraftByID(ctx context.Context, userID string, draftID uint64, p utils.DraftPayload) (savedAt time.Time, err error) {
	if db.DB == nil {
		return time.Time{}, errors.New("db not ready")
	}

	var exists bool
	if err = db.DB.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM flea_item_drafts
			WHERE id = ? AND user_id = ? AND status = 0
		)
	`, draftID, userID).Scan(&exists); err != nil {
		return
	}
	if !exists {
		return time.Time{}, sql.ErrNoRows
	}

	var tempJSON *string
	if p.TempImageURLs != nil {
		b, _ := json.Marshal(*p.TempImageURLs)
		s := string(b)
		tempJSON = &s
	}

	_, err = db.DB.ExecContext(ctx, `
		UPDATE flea_item_drafts
		   SET name = COALESCE(?, name),
		       description = COALESCE(?, description),
		       price = CASE WHEN ? IS NULL OR ? = '' THEN NULL ELSE ? END,
		       quantity = COALESCE(?, quantity),
		       type = COALESCE(?, type),
		       is_multi_purchasable = COALESCE(?, is_multi_purchasable),
		       main_image_url = COALESCE(?, main_image_url),
		       temp_image_urls = COALESCE(?, temp_image_urls),
		       ship_from = COALESCE(?, ship_from),
		       shipping_fee_type = COALESCE(?, shipping_fee_type),
		       ships_within_days = COALESCE(?, ships_within_days),
		       updated_at = UTC_TIMESTAMP()
		 WHERE id = ? AND user_id = ? AND status = 0
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

	err = db.DB.QueryRowContext(ctx, `SELECT updated_at FROM flea_item_drafts WHERE id = ?`, draftID).Scan(&savedAt)
	return
}

func (db *Database) GetFleaDraftByID(ctx context.Context, userID string, draftID uint64) (utils.LatestDraftResponse, error) {
	var out utils.LatestDraftResponse
	if db.DB == nil {
		return out, errors.New("db not ready")
	}

	var updated time.Time
	var tempJSON sql.NullString

	err := db.DB.QueryRowContext(ctx, `
		SELECT id, name, description,
		       CASE WHEN price IS NULL THEN NULL ELSE TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM price)) END,
		       quantity, type, is_multi_purchasable,
		       main_image_url, temp_image_urls,
		       ship_from, shipping_fee_type, ships_within_days, updated_at
		  FROM flea_item_drafts
		 WHERE id = ? AND user_id = ? AND status = 0
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
		SELECT id, name, updated_at, status
		  FROM flea_item_drafts
		 WHERE user_id = ? AND status = 0
		 ORDER BY updated_at DESC
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

	res, err := db.DB.ExecContext(ctx, `
		UPDATE flea_item_drafts
		SET status = 2, updated_at = UTC_TIMESTAMP()
		WHERE id = ? AND user_id = ? AND status = 0
	`, draftID, userID)
	if err != nil {
		return err
	}

	if rows, _ := res.RowsAffected(); rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}
