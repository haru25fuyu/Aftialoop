package sql

import (
	"animaloop/utils"
	"database/sql"
	"fmt"
	"log"
)

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
