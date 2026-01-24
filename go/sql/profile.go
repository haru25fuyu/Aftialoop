package sql

import (
	"strconv"
)

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
