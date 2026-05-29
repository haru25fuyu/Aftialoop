package sql

import (
	"animaloop/utils"
	"context"
	"database/sql"
	"errors"
	"log"
)

// ============================================================
// フリマ商品詳細関係（size_value / size_unit 分割対応版）
// ============================================================

// 動物詳細取得
func (d *Database) GetAnimalDetailsByItemID(itemID int64) (*utils.AnimalDetails, error) {
	const q = `
		SELECT locality, hatch_date, generation, size_value, size_unit, sex
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

// UpsertAnimalDetails: 生体詳細を UPSERT（context版・構造体を受ける）
func (db *Database) UpsertAnimalDetails(ctx context.Context, itemID uint64, d0 *utils.AnimalDetails) error {
	if d0 == nil {
		return nil
	}
	_, err := db.DB.ExecContext(ctx, `
        INSERT INTO flea_item_animal_details
            (item_id, locality, hatch_date, generation, size_value, size_unit, sex, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (item_id) DO UPDATE SET
            locality   = EXCLUDED.locality,
            hatch_date = EXCLUDED.hatch_date,
            generation = EXCLUDED.generation,
            size_value = EXCLUDED.size_value,
            size_unit  = EXCLUDED.size_unit,
            sex        = EXCLUDED.sex,
            updated_at = CURRENT_TIMESTAMP
    `,
		itemID,
		d0.Locality,
		nullableDate(d0.HatchDate),
		d0.Generation,
		d0.SizeValue,
		d0.SizeUnit,
		d0.Sex,
	)
	return err
}

// UpsertAnimalDetailsSimple: 非context版。ハンドラの更新フローから呼ぶ用。
func (d *Database) UpsertAnimalDetailsSimple(itemID uint64, ad *utils.AnimalDetails) error {
	if ad == nil {
		return nil
	}
	const q = `
        INSERT INTO flea_item_animal_details
            (item_id, locality, hatch_date, generation, size_value, size_unit, sex, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (item_id) DO UPDATE SET
            locality   = EXCLUDED.locality,
            hatch_date = EXCLUDED.hatch_date,
            generation = EXCLUDED.generation,
            size_value = EXCLUDED.size_value,
            size_unit  = EXCLUDED.size_unit,
            sex        = EXCLUDED.sex,
            updated_at = CURRENT_TIMESTAMP
    `
	_, err := d.DB.Exec(q,
		itemID,
		ad.Locality,
		nullableDate(ad.HatchDate),
		ad.Generation,
		ad.SizeValue,
		ad.SizeUnit,
		ad.Sex,
	)
	return err
}

// UpsertSupplyDetails: 用品詳細を UPSERT（context版）
func (db *Database) UpsertSupplyDetails(ctx context.Context, itemID uint64, d0 *utils.SupplyDetails) error {
	if d0 == nil {
		return nil
	}
	_, err := db.DB.ExecContext(ctx, `
        INSERT INTO flea_item_supply_details
            (item_id, brand, sku, net_weight_g, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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

// UpsertSupplyDetailsSimple: 非context版。ハンドラの更新フローから呼ぶ用。
func (d *Database) UpsertSupplyDetailsSimple(itemID uint64, sd *utils.SupplyDetails) error {
	if sd == nil {
		return nil
	}
	const q = `
        INSERT INTO flea_item_supply_details
            (item_id, brand, sku, net_weight_g, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (item_id) DO UPDATE SET
            brand        = EXCLUDED.brand,
            sku          = EXCLUDED.sku,
            net_weight_g = EXCLUDED.net_weight_g,
            updated_at   = CURRENT_TIMESTAMP
    `
	_, err := d.DB.Exec(q, itemID, sd.Brand, sd.SKU, sd.NetWeightG)
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

// 注: nullableDate は flea_item.go に定義済み（空文字を NULL に変換するヘルパー）。
// 同一 package sql 内なのでここでは再定義しない。