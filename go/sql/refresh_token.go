package sql

import (
	"animaloop/utils"
	"database/sql"
	"errors"
	"time"
)

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
