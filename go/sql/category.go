package sql

import (
	"fmt"
	"strings"
)

// Category モデル
// sqlxを使うため `db` タグを追加し、NULL許容カラムはポインタ型(*string)にします
type Category struct {
	ID           uint64  `db:"id" json:"id"`
	Name         string  `db:"name" json:"name"`
	ParentID     *uint64 `db:"parent_id" json:"parent_id"`
	Path         *string `db:"path" json:"path"`
	Rank         *string `db:"rank" json:"rank"`
	FullPathName string  `db:"-" json:"full_path_name,omitempty"`
	BuiltInType  *string `db:"built_in_type" json:"built_in_type"`
}

// SupplyType モデル
type SupplyType struct {
	ID   uint64 `db:"id" json:"id"`
	Name string `db:"name" json:"name"`
}

// -------------------------------------------------------
// 1. 階層API用: 親IDを指定して子供を取得
// -------------------------------------------------------
func (db *Database) GetCategoriesByParentID(parentID *uint64) ([]Category, error) {
	var categories []Category
	var query string
	var err error

	if parentID == nil {
		// トップレベル（親なし）を取得
		query = "SELECT id, name, parent_id, path, `rank`, built_in_type FROM categories WHERE parent_id IS NULL ORDER BY id ASC"
		err = db.DB.Select(&categories, query)
	} else {
		// 指定された親の子供を取得
		query = "SELECT id, name, parent_id, path, `rank`, built_in_type FROM categories WHERE parent_id = ? ORDER BY id ASC"
		err = db.DB.Select(&categories, query, *parentID)
	}

	if err != nil {
		return nil, err
	}
	return categories, nil
}

// -------------------------------------------------------
// 2. 検索API用: キーワード検索＋パンくずリスト生成
// -------------------------------------------------------
func (db *Database) SearchCategories(keyword string) ([]Category, error) {
	var results []Category

	// sqlx の Select を使用して一括取得
	query := "SELECT id, name, parent_id, path, `rank`, built_in_type FROM categories WHERE name LIKE ? LIMIT 20"
	err := db.DB.Select(&results, query, "%"+keyword+"%")
	if err != nil {
		return nil, err
	}

	// パンくずリスト生成
	for i, cat := range results {
		if cat.Path == nil || *cat.Path == "" {
			results[i].FullPathName = cat.Name
			continue
		}

		// path "1/10/100/" を分解 -> [1, 10, 100]
		idsStr := strings.Split(strings.Trim(*cat.Path, "/"), "/")
		if len(idsStr) == 0 {
			results[i].FullPathName = cat.Name
			continue
		}

		idList := strings.Join(idsStr, ",")

		// IDリストを使って名前を一括取得（順番を保証するためにFIND_IN_SETを使用）
		pathQuery := fmt.Sprintf("SELECT name FROM categories WHERE id IN (%s) ORDER BY FIELD(id, %s)", idList, idList)

		var names []string
		// 文字列のスライスに直接入れることができます
		err := db.DB.Select(&names, pathQuery)
		if err != nil {
			results[i].FullPathName = cat.Name
			continue
		}

		// "昆虫 > クワガタ > ..." の形に結合
		results[i].FullPathName = strings.Join(names, " > ")
	}

	return results, nil
}

// -------------------------------------------------------
// 3. 用品種別API用: 全リスト取得
// -------------------------------------------------------
func (db *Database) GetSupplyTypes() ([]SupplyType, error) {
	var list []SupplyType
	err := db.DB.Select(&list, "SELECT id, name FROM supply_types ORDER BY id ASC")
	if err != nil {
		return nil, err
	}
	return list, nil
}
