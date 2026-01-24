package sql

import (
	"animaloop/utils"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// -----------------------------------------------------------
// 下書き関係
// -----------------------------------------------------------

func (db *Database) CreateDraft(ctx context.Context, userID string, p utils.DraftPayload) (id uint64, savedAt time.Time, err error) {
	if db.DB == nil {
		return 0, time.Time{}, errors.New("db not ready")
	}

	var tempJSON *string
	if p.TempImageURLs != nil {
		b, _ := json.Marshal(*p.TempImageURLs)
		s := string(b)
		tempJSON = &s
	}

	res, err := db.DB.ExecContext(ctx, `
		INSERT INTO flea_item_drafts
		SET user_id = ?,
		    name = ?,
		    description = ?,
		    price = CASE WHEN ? IS NULL OR ? = '' THEN NULL ELSE ? END,
		    quantity = ?,
		    type = ?,
		    is_multi_purchasable = COALESCE(?, 0),
		    main_image_url = ?,
		    temp_image_urls = ?,
		    status = 0,
		    ship_from = ?,
		    shipping_fee_type = ?,
		    ships_within_days = ?,
		    created_at = UTC_TIMESTAMP(),
		    updated_at = UTC_TIMESTAMP()
	`,
		userID,
		p.Name, p.Description,
		p.Price, p.Price, p.Price,
		p.Quantity,
		p.Type,
		p.IsMultiPurchasable,
		p.MainImageURL,
		tempJSON,
		p.ShipFrom, p.ShippingFeeType, p.ShipsWithinDays,
	)
	if err != nil {
		return 0, time.Time{}, fmt.Errorf("insert draft: %w", err)
	}

	lastID, _ := res.LastInsertId()
	id = uint64(lastID)

	if err = db.DB.QueryRowContext(ctx, `SELECT updated_at FROM flea_item_drafts WHERE id = ?`, id).Scan(&savedAt); err != nil {
		return 0, time.Time{}, fmt.Errorf("select updated_at: %w", err)
	}

	return id, savedAt, nil
}

func (db *Database) UpdateDraftByID(ctx context.Context, userID string, draftID uint64, p utils.DraftPayload) (savedAt time.Time, err error) {
	if db.DB == nil {
		return time.Time{}, errors.New("db not ready")
	}

	var exists bool
	if err = db.DB.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM flea_item_drafts
			WHERE id = ? AND user_id = ? AND status = 0
		)
	`, draftID, userID).Scan(&exists); err != nil {
		return
	}
	if !exists {
		return time.Time{}, sql.ErrNoRows
	}

	var tempJSON *string
	if p.TempImageURLs != nil {
		b, _ := json.Marshal(*p.TempImageURLs)
		s := string(b)
		tempJSON = &s
	}

	_, err = db.DB.ExecContext(ctx, `
		UPDATE flea_item_drafts
		   SET name = COALESCE(?, name),
		       description = COALESCE(?, description),
		       price = CASE WHEN ? IS NULL OR ? = '' THEN NULL ELSE ? END,
		       quantity = COALESCE(?, quantity),
		       type = COALESCE(?, type),
		       is_multi_purchasable = COALESCE(?, is_multi_purchasable),
		       main_image_url = COALESCE(?, main_image_url),
		       temp_image_urls = COALESCE(?, temp_image_urls),
		       ship_from = COALESCE(?, ship_from),
		       shipping_fee_type = COALESCE(?, shipping_fee_type),
		       ships_within_days = COALESCE(?, ships_within_days),
		       updated_at = UTC_TIMESTAMP()
		 WHERE id = ? AND user_id = ? AND status = 0
	`,
		p.Name, p.Description,
		p.Price, p.Price, p.Price,
		p.Quantity, p.Type, p.IsMultiPurchasable,
		p.MainImageURL, tempJSON,
		p.ShipFrom, p.ShippingFeeType, p.ShipsWithinDays,
		draftID, userID,
	)
	if err != nil {
		return
	}

	err = db.DB.QueryRowContext(ctx, `SELECT updated_at FROM flea_item_drafts WHERE id = ?`, draftID).Scan(&savedAt)
	return
}

func (db *Database) GetFleaDraftByID(ctx context.Context, userID string, draftID uint64) (utils.LatestDraftResponse, error) {
	var out utils.LatestDraftResponse
	if db.DB == nil {
		return out, errors.New("db not ready")
	}

	var updated time.Time
	var tempJSON sql.NullString

	err := db.DB.QueryRowContext(ctx, `
		SELECT id, name, description,
		       CASE WHEN price IS NULL THEN NULL ELSE TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM price)) END,
		       quantity, type, is_multi_purchasable,
		       main_image_url, temp_image_urls,
		       ship_from, shipping_fee_type, ships_within_days, updated_at
		  FROM flea_item_drafts
		 WHERE id = ? AND user_id = ? AND status = 0
	`, draftID, userID).Scan(
		&out.DraftID, &out.Name, &out.Description,
		&out.Price, &out.Quantity, &out.Type, &out.IsMultiPurchasable,
		&out.MainImageURL, &tempJSON,
		&out.ShipFrom, &out.ShippingFeeType, &out.ShipsWithinDays, &updated,
	)
	if err != nil {
		return out, err
	}

	if tempJSON.Valid {
		var arr []string
		_ = json.Unmarshal([]byte(tempJSON.String), &arr)
		out.TempImageURLs = &arr
	}

	out.UpdatedAt = updated.UTC().Format(time.RFC3339)
	return out, nil
}

func (db *Database) ListDraftsByUser(ctx context.Context, userID string, limit, offset int) (utils.DraftListResponse, error) {
	var out utils.DraftListResponse
	if db.DB == nil {
		return out, errors.New("db not ready")
	}

	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, name, updated_at, status
		  FROM flea_item_drafts
		 WHERE user_id = ? AND status = 0
		 ORDER BY updated_at DESC
		 LIMIT ? OFFSET ?
	`, userID, limit, offset)
	if err != nil {
		return out, err
	}
	defer rows.Close()

	for rows.Next() {
		var it utils.DraftListItem
		var updated time.Time
		if err := rows.Scan(&it.DraftID, &it.Name, &updated, &it.Status); err != nil {
			return out, err
		}
		it.UpdatedAt = updated.UTC().Format(time.RFC3339)
		out.Items = append(out.Items, it)
	}

	out.NextOffset = offset + len(out.Items)
	return out, nil
}

func (db *Database) ArchiveDraft(ctx context.Context, userID string, draftID uint64) error {
	if db.DB == nil {
		return errors.New("db not ready")
	}

	res, err := db.DB.ExecContext(ctx, `
		UPDATE flea_item_drafts
		SET status = 2, updated_at = UTC_TIMESTAMP()
		WHERE id = ? AND user_id = ? AND status = 0
	`, draftID, userID)
	if err != nil {
		return err
	}

	if rows, _ := res.RowsAffected(); rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}
