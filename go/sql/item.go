package sql

import (
	"animaloop/utils"
	"fmt"
)

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
