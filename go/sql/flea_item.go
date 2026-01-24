package sql

import (
	"animaloop/config"
	"animaloop/utils"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
)

// ============================================================
// フリマ商品関係
// ============================================================

func (db *Database) ListFleaMarketItemsLite(limit, offset int) ([]utils.FleaMarketListLite, error) {
	const q = `
		SELECT
		  f.id,
		  f.name,
		  f.price,
		  f.seller_rate,
		  f.type,
		  f.main_image_url,
		  u.name    AS seller_name,
		  p.icon_url AS seller_icon_url
		FROM flea_items AS f
		LEFT JOIN users   AS u ON u.id     = f.user_id
		LEFT JOIN profile AS p ON p.user_id = f.user_id
		WHERE f.deleted_at IS NULL
		AND f.status = ?
		ORDER BY f.created_at DESC
		LIMIT ? OFFSET ?;
	`

	rows, err := db.DB.Query(q, config.FleaItemStatusActive, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]utils.FleaMarketListLite, 0, limit)

	for rows.Next() {
		var (
			it            utils.FleaMarketListLite
			mainURL       sql.NullString
			sellerName    sql.NullString
			sellerIconURL sql.NullString
		)

		if err := rows.Scan(
			&it.ID,
			&it.Name,
			&it.Price,
			&it.SellerRate,
			&it.Type,
			&mainURL,
			&sellerName,
			&sellerIconURL,
		); err != nil {
			return nil, err
		}

		if mainURL.Valid {
			s := mainURL.String
			it.MainImageURL = &s
		}
		if sellerName.Valid {
			it.SellerName = sellerName.String
		}
		if sellerIconURL.Valid {
			s := sellerIconURL.String
			it.SellerIconURL = &s
		}

		items = append(items, it)
	}
	return items, rows.Err()
}

func (d *Database) GetFleaMarketItemByID(id uint64) (*utils.FleaMarketItemDetailResponse, error) {
	var item utils.FleaMarketItemDetailResponse
	log.Println("GetFleaMarketItemByID called with id:", id)

	const q = `
        SELECT 
            f.*, 
            u.name AS user_name, 
            p.icon_url AS user_icon
        FROM flea_items AS f
        JOIN users AS u ON u.id = f.user_id
        LEFT JOIN profile AS p ON p.user_id = u.id
        WHERE f.id = ? 
          AND f.deleted_at IS NULL
        LIMIT 1;
    `

	if err := d.DB.Get(&item, q, id); err != nil {
		return nil, err
	}

	// -----------------------------------------------------
	// ★ 追加: レート計算ロジック
	// -----------------------------------------------------
	cfg := config.GetFleaConfig()
	denominator := cfg.RateDen
	if denominator == 0 {
		denominator = 10000 // 安全策
	}

	// 計算
	if item.RawSellerRate > 0 {
		item.SellerRate = float64(item.RawSellerRate) / float64(denominator)
	} else {
		item.SellerRate = 1.0
	}

	return &item, nil
}

func (d *Database) GetFleaMarketItemImages(itemID uint64) ([]utils.ItemImage, error) {
	const q = `
        SELECT
            id,
            item_id,
            sort_num,
            url
        FROM flea_item_images
        WHERE item_id = ?
        ORDER BY sort_num ASC, id ASC;
    `
	var images []utils.ItemImage
	if err := d.DB.Select(&images, q, itemID); err != nil {
		return nil, err
	}
	return images, nil
}

func (d *Database) CreateFleaMarketItem(uID string, in utils.CreateFleaMarketItemInput) (id int64, err error) {
	tx, err := d.DB.Beginx()
	if err != nil {
		return 0, err
	}

	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		} else if err != nil {
			_ = tx.Rollback()
		} else {
			err = tx.Commit()
		}
	}()

	res, err := tx.Exec(`
		INSERT INTO flea_items
			(user_id, name, description, price, seller_rate, commission_rate, quantity, type, is_multi_purchasable,
			 main_image_url, status, ship_from, shipping_fee_type, ships_within_days,
			 created_at, updated_at)
		VALUES
			(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
	`,
		uID,
		in.Name,
		in.Description,
		in.Price,
		in.SellerRateBP,
		in.CommissionRateBP,
		in.Quantity,
		in.Type,
		in.IsMultiPurchasable,
		in.MainImageURL,
		0,
		in.ShipFrom,
		in.ShippingFeeType,
		in.ShipsWithinDays,
	)
	if err != nil {
		return 0, err
	}

	itemID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	firstImageURL := ""
	for i, u := range in.ImageURLs {
		if _, err = tx.Exec(`
			INSERT INTO flea_item_images (item_id, url, sort_num)
			VALUES (?, ?, ?)
		`, itemID, u, i); err != nil {
			return 0, err
		}
		if i == 0 {
			firstImageURL = u
		}
	}

	if (in.MainImageURL == "" || in.MainImageURL == "null") && firstImageURL != "" {
		if _, err = tx.Exec(`
			UPDATE flea_items
			SET main_image_url = ?, updated_at = UTC_TIMESTAMP()
			WHERE id = ?
		`, firstImageURL, itemID); err != nil {
			return 0, err
		}
	}

	return itemID, nil
}

func (d *Database) SoftDeleteFleaMarketItem(id int64, userID string) error {
	res, err := d.DB.Exec(`
		UPDATE flea_items
		SET deleted_at = UTC_TIMESTAMP()
		WHERE id = ? AND user_id = ? AND deleted_at IS NULL
	`, id, userID)
	if err != nil {
		return err
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		return fmt.Errorf("no target updated (id=%d, user=%s)", id, userID)
	}
	return nil
}

// GetFleaItemPrice: 商品IDから価格を取得するヘルパー
func (db *Database) GetFleaItemPrice(ctx context.Context, itemID uint64) (uint32, error) {
	var price uint32
	if db.DB == nil {
		return 0, errors.New("db not ready")
	}
	err := db.DB.QueryRowContext(ctx, "SELECT price FROM flea_items WHERE id = ?", itemID).Scan(&price)
	if err != nil {
		return 0, err
	}
	return price, nil
}

func (db *Database) FindFleaItemOwnerID(ctx context.Context, itemID uint64) (string, error) {
	const q = `
        SELECT user_id
        FROM flea_items
        WHERE id = ? AND deleted_at IS NULL
    `
	var uid string
	err := db.DB.QueryRowContext(ctx, q, itemID).Scan(&uid)
	if err != nil {
		return "", err
	}
	return uid, nil
}

func (d *Database) GetFleaMarketSellerID(itemID int64) (*string, error) {
	var sellerID string
	const q = `
		SELECT
			f.user_id
		FROM flea_items AS f
		WHERE f.id = ?
		LIMIT 1;
	`

	if err := d.DB.Get(&sellerID, q, itemID); err != nil {
		return nil, err
	}
	return &sellerID, nil
}

// commission_rate　の取得
func (d *Database) GetFleaMarketCommissionRate(itemID uint64) (int64, error) {
	var rate int64
	const q = `
		SELECT
			commission_rate
		FROM flea_items
		WHERE id = ?
		LIMIT 1;
	`

	if err := d.DB.Get(&rate, q, itemID); err != nil {
		return 0, err
	}
	return rate, nil
}
