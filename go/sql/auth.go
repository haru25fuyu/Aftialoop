package sql

import (
	"animaloop/utils"
	"database/sql"
	"fmt"
	"time"
)

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

func (d *Database) SetRegistrationToken(user utils.SqlUser, token string) error {

	_, err := d.DB.Exec("DELETE FROM user_registration_tokens WHERE email = ?", user.Email)
	if err != nil {
		return err
	}

	_, err = d.DB.Exec(`
		INSERT INTO user_registration_tokens (id, email, password, token, expires_at)
		VALUES (?, ?, ?, ?, ?)
	`, user.ID, user.Email, user.Password, token, time.Now().Add(24*time.Hour))

	return err
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
