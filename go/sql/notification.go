package sql

import (
	"context"
)

type Notification struct {
	ID        uint64 `json:"id" db:"id"`
	Type      string `json:"type" db:"type"`
	Title     string `json:"title" db:"title"`
	Body      string `json:"body" db:"body"`
	URL       string `json:"url" db:"url"`
	IsRead    bool   `json:"is_read" db:"is_read"`
	CreatedAt string `json:"created_at" db:"created_at"`
}

// GetNotifications: 自分宛の通知 + 全体のお知らせを取得
func (db *Database) GetNotifications(ctx context.Context, userID string, limit, offset int) ([]Notification, error) {
	const q = `
		SELECT id, type, title, body, url, is_read, created_at
		FROM notifications
		WHERE user_id = $1 OR user_id IS NULL
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	var notifs []Notification
	err := db.DB.SelectContext(ctx, &notifs, q, userID, limit, offset)
	return notifs, err
}

// CreateNotification: 通知を作成
func (db *Database) CreateNotification(userID *string, nType, title, body, url string) error {
	// UTC_TIMESTAMP() -> CURRENT_TIMESTAMP, ? -> $n
	const q = `
		INSERT INTO notifications (user_id, type, title, body, url, created_at)
		VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
	`
	_, err := db.DB.Exec(q, userID, nType, title, body, url)
	return err
}

// MarkNotificationAsRead: 既読にする
func (db *Database) MarkNotificationAsRead(userID string, notifID uint64) error {
	// TRUE は PostgreSQL でも有効。? -> $n
	const q = `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`
	_, err := db.DB.Exec(q, notifID, userID)
	return err
}