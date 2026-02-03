package sql

import (
	"animaloop/utils"
	"context"
	"database/sql"
	"errors"
	"log"
)

// ============================================================
// フリマ商品詳細関係
// ============================================================

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
	case "ANIMAL":
		ad, err := d.GetAnimalDetailsByItemID(id)
		if err != nil {
			return nil, err
		}
		detail.Animal = ad

	case "SUPPLY":
		sd, err := d.GetSupplyDetailsByItemID(id)
		if err != nil {
			return nil, err
		}
		detail.Supply = sd

	default:
		// なかったログ
		log.Printf("[flea_item_detail] unknown item type: %s", itemType)
		return nil, nil
	}

	return detail, nil
}

// sql/flea_market.go に追加

// UpdateAnimalDetails: 生体詳細の更新 (UPSERT)
func (d *Database) UpdateAnimalDetails(itemID uint64, locality, hatchDate, size, generation, sex string) error {
	// hatchDate が空文字("")のままだとDATE型に入らないため、NULL(nil)に変換する
	var hDate interface{}
	if hatchDate == "" {
		hDate = nil
	} else {
		hDate = hatchDate
	}

	// テーブル名: flea_item_animal_details
	query := `
        INSERT INTO flea_item_animal_details (item_id, locality, hatch_date, size, generation, sex)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            locality = VALUES(locality),
            hatch_date = VALUES(hatch_date),
            size = VALUES(size),
            generation = VALUES(generation),
            sex = VALUES(sex),
            updated_at = UTC_TIMESTAMP()
    `
	_, err := d.DB.Exec(query, itemID, locality, hDate, size, generation, sex)
	return err
}

// UpdateSupplyDetails: 用品詳細の更新 (UPSERT)
func (d *Database) UpdateSupplyDetails(itemID uint64, brand, sku string, netWeight int) error {
	// テーブル名: flea_item_supply_details
	// net_weight_g カラムに注意
	query := `
        INSERT INTO flea_item_supply_details (item_id, brand, sku, net_weight_g)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            brand = VALUES(brand),
            sku = VALUES(sku),
            net_weight_g = VALUES(net_weight_g),
            updated_at = UTC_TIMESTAMP()
    `
	_, err := d.DB.Exec(query, itemID, brand, sku, netWeight)
	return err
}
