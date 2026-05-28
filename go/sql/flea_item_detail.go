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
		WHERE item_id = $1
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

	// ON DUPLICATE KEY UPDATE -> ON CONFLICT (item_id) DO UPDATE SET ... = EXCLUDED. ...
	// item_id が主キー(または UNIQUE)である前提。
	_, err := db.DB.ExecContext(ctx, `
        INSERT INTO flea_item_animal_details
            (item_id, locality, hatch_date, generation, size, sex)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (item_id) DO UPDATE SET
            locality   = EXCLUDED.locality,
            hatch_date = EXCLUDED.hatch_date,
            generation = EXCLUDED.generation,
            size       = EXCLUDED.size,
            sex        = EXCLUDED.sex,
            updated_at = CURRENT_TIMESTAMP
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
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (item_id) DO UPDATE SET
            brand        = EXCLUDED.brand,
            sku          = EXCLUDED.sku,
            net_weight_g = EXCLUDED.net_weight_g,
            updated_at   = CURRENT_TIMESTAMP
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
		WHERE item_id = $1
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
		log.Printf("[flea_item_detail] unknown item type: %s", itemType)
		return nil, nil
	}

	return detail, nil
}

// UpdateAnimalDetails: 生体詳細の更新 (UPSERT)
func (d *Database) UpdateAnimalDetails(itemID uint64, locality, hatchDate, size, generation, sex string) error {
	// hatchDate が空文字("")のままだとDATE型に入らないため、NULL(nil)に変換する
	var hDate interface{}
	if hatchDate == "" {
		hDate = nil
	} else {
		hDate = hatchDate
	}

	query := `
        INSERT INTO flea_item_animal_details (item_id, locality, hatch_date, size, generation, sex)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (item_id) DO UPDATE SET
            locality   = EXCLUDED.locality,
            hatch_date = EXCLUDED.hatch_date,
            size       = EXCLUDED.size,
            generation = EXCLUDED.generation,
            sex        = EXCLUDED.sex,
            updated_at = CURRENT_TIMESTAMP
    `
	_, err := d.DB.Exec(query, itemID, locality, hDate, size, generation, sex)
	return err
}

// UpdateSupplyDetails: 用品詳細の更新 (UPSERT)
func (d *Database) UpdateSupplyDetails(itemID uint64, brand, sku string, netWeight int) error {
	query := `
        INSERT INTO flea_item_supply_details (item_id, brand, sku, net_weight_g)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (item_id) DO UPDATE SET
            brand        = EXCLUDED.brand,
            sku          = EXCLUDED.sku,
            net_weight_g = EXCLUDED.net_weight_g,
            updated_at   = CURRENT_TIMESTAMP
    `
	_, err := d.DB.Exec(query, itemID, brand, sku, netWeight)
	return err
}