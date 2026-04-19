package sql

import (
	"fmt"
	"strings"
)

func (d *Database) LinkImagesToItem(itemID int64, imageIDs []int64) error {
	if len(imageIDs) == 0 {
		return nil
	}

	// 1. まず画像を商品に紐付ける（既存の処理）
	// (プレースホルダの生成部分)
	placeholders := make([]string, len(imageIDs))
	args := make([]interface{}, len(imageIDs)+1)
	args[0] = itemID
	for i, id := range imageIDs {
		placeholders[i] = "?"
		args[i+1] = id
	}

	query := fmt.Sprintf("UPDATE image_assets SET item_id = ? WHERE id IN (%s)", strings.Join(placeholders, ","))
	if _, err := d.DB.Exec(query, args...); err != nil {
		return err
	}

	// ---------------------------------------------------------
	// ★★★ セーフティネット） ★★★
	// ---------------------------------------------------------
	// 「もし商品の main_image_url が空っぽなら、
	//   紐付いている画像の中で一番若い（または並び順が先の）URLをセットする」
	// という自己修復クエリを実行します。
	// ---------------------------------------------------------
	_, err := d.DB.Exec(`
        UPDATE flea_items
           SET main_image_url = (
               SELECT url 
                 FROM image_assets 
                WHERE item_id = ? 
                ORDER BY id ASC 
                LIMIT 1
           )
         WHERE id = ? 
           AND (main_image_url IS NULL OR main_image_url = '')
    `, itemID, itemID)

	return err
}

func (db *Database) GetImageURLByID(id int64) (string, error) {
    var url string
    // PostgreSQL版: "?" を "$1" に変更
    err := db.DB.QueryRow("SELECT url FROM image_assets WHERE id = $1", id).Scan(&url)
    
    if err != nil {
        return "", err
    }
    return url, nil
}