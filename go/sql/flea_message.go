package sql

import (
	"animaloop/utils"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

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
			u.icon_url AS user_icon
        FROM flea_item_messages fim
		JOIN users u ON u.id = fim.user_id
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
// 取引メッセージ関係
// -----------------------------------------------------------

// 取引メッセージ一覧取得
func (d *Database) GetTransactionMessages(prID uint64) ([]utils.FleaTXMessage, error) {
	query := `
        SELECT 
            m.id, m.purchase_request_id, m.user_id, m.message, m.created_at,
            u.name AS user_name, u.icon_url AS user_icon_url
        FROM flea_transaction_messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.purchase_request_id = ?
        ORDER BY m.created_at ASC
    `

	var messages []utils.FleaTXMessage
	err := d.DB.Select(&messages, query, prID)
	return messages, err
}

// 取引メッセージ追加
func (d *Database) CreateTransactionMessage(prID uint64, userID string, message string) error {
	query := `INSERT INTO flea_transaction_messages (purchase_request_id, user_id, message) VALUES (?, ?, ?)`
	_, err := d.DB.Exec(query, prID, userID, message)
	return err
}
