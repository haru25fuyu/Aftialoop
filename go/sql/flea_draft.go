package sql

import (
	"animaloop/utils"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"
)

// -----------------------------------------------------------
// 下書き関係
// -----------------------------------------------------------

// ==========================================
// CreateDraft: ドラフト作成（画像保存対応版）
// ==========================================
func (db *Database) CreateDraft(ctx context.Context, userID string, p utils.DraftPayload) (id uint64, savedAt time.Time, err error) {
	if db.DB == nil {
		return 0, time.Time{}, errors.New("db not ready")
	}

	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, time.Time{}, err
	}
	defer tx.Rollback()

	var detailsJSON interface{} = nil
	if p.Details != nil {
		if b, err := json.Marshal(p.Details); err == nil {
			detailsJSON = string(b)
		}
	}

	// 親テーブルへの INSERT (PostgreSQL: VALUES + RETURNING)
	query := `
        INSERT INTO flea_item_drafts (
            user_id, name, description, price, quantity, type,
            category_id, supply_type_id, is_multi_purchasable,
            main_image_url, status, ship_from, shipping_fee_type,
            ships_within_days, details, created_at, updated_at
        )
        VALUES (
            $1, $2, $3,
            CASE WHEN $4::text IS NULL OR $4::text = '' THEN NULL ELSE $4::numeric END,
            $5, $6, $7, $8, COALESCE($9, 0), $10, 0, $11, $12, $13, $14,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id, updated_at
    `

	err = tx.QueryRowContext(ctx, query,
		userID, p.Name, p.Description, p.Price, // $1 ~ $4
		p.Quantity, p.Type, p.CategoryID, p.SupplyTypeID, // $5 ~ $8
		p.IsMultiPurchasable, p.MainImageURL, // $9 ~ $10
		p.ShipFrom, p.ShippingFeeType, p.ShipsWithinDays, // $11 ~ $13
		detailsJSON, // $14
	).Scan(&id, &savedAt)
	if err != nil {
		return 0, time.Time{}, fmt.Errorf("insert draft: %w", err)
	}

	// 子テーブル (画像) への INSERT
	// ここは Rebind 方式 (? を書いて db.DB.Rebind で $n に変換) なので元のままで正しい。
	if p.UploadedImages != nil && len(*p.UploadedImages) > 0 {
		imgQuery := "INSERT INTO flea_item_draft_images (draft_id, asset_id, temp_path, sort_order) VALUES "
		var args []interface{}

		for i, img := range *p.UploadedImages {
			imgQuery += "(?, ?, ?, ?),"
			args = append(args, id, img.ServerID, img.URL, i)
		}
		imgQuery = imgQuery[:len(imgQuery)-1]

		imgQuery = db.DB.Rebind(imgQuery)

		if _, err := tx.ExecContext(ctx, imgQuery, args...); err != nil {
			return 0, time.Time{}, fmt.Errorf("insert draft images: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, time.Time{}, err
	}

	return id, savedAt, nil
}

// ==========================================
// UpdateDraftByID: ドラフト更新（asset_id対応版）
// ==========================================
func (db *Database) UpdateDraftByID(ctx context.Context, userID string, draftID uint64, p utils.DraftPayload) (savedAt time.Time, err error) {
	if db.DB == nil {
		return time.Time{}, errors.New("db not ready")
	}
	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return time.Time{}, err
	}
	defer tx.Rollback()

	// details を JSON 文字列に
	var detailsJSON interface{} = nil
	if p.Details != nil {
		b, err := json.Marshal(p.Details)
		if err == nil {
			detailsJSON = string(b)
		}
	}

	// 存在チェック
	var exists bool
	err = tx.QueryRowContext(ctx, `
        SELECT EXISTS(
            SELECT 1 FROM flea_item_drafts
            WHERE id = $1 AND user_id = $2 AND status = 0
        )
    `, draftID, userID).Scan(&exists)
	if err != nil {
		return time.Time{}, err
	}
	if !exists {
		log.Printf("DEBUG: Draft %d not found for user %s", draftID, userID)
		return time.Time{}, sql.ErrNoRows
	}

	// 親テーブル更新
	_, err = tx.ExecContext(ctx, `
        UPDATE flea_item_drafts
           SET name = COALESCE($1, name),
               description = COALESCE($2, description),
               price = CASE WHEN $3::text IS NULL OR $3::text = '' THEN NULL ELSE $3::numeric END,
               quantity = COALESCE($4, quantity),
               type = COALESCE($5, type),
               category_id = COALESCE($6, category_id),
               supply_type_id = COALESCE($7, supply_type_id),
               is_multi_purchasable = COALESCE($8, is_multi_purchasable),
               main_image_url = $9,
               ship_from = COALESCE($10, ship_from),
               shipping_fee_type = COALESCE($11, shipping_fee_type),
               ships_within_days = COALESCE($12, ships_within_days),
               details = COALESCE($13, details),
               updated_at = CURRENT_TIMESTAMP
         WHERE id = $14 AND user_id = $15 AND status = 0
    `,
		p.Name, p.Description, p.Price,
		p.Quantity, p.Type, p.CategoryID, p.SupplyTypeID,
		p.IsMultiPurchasable, p.MainImageURL,
		p.ShipFrom, p.ShippingFeeType, p.ShipsWithinDays,
		detailsJSON,
		draftID, userID,
	)
	if err != nil {
		return time.Time{}, err
	}

	// 画像更新処理
	if p.UploadedImages != nil {
		if _, err := tx.ExecContext(ctx, "DELETE FROM flea_item_draft_images WHERE draft_id = $1", draftID); err != nil {
			return time.Time{}, err
		}
		if len(*p.UploadedImages) > 0 {
			// ★修正: 以前は毎ループ "($1, $2, $3, $4)," を固定で書いており、
			//   プレースホルダ番号が重複して 2 枚目以降が壊れていた。
			//   ループごとに連番を振り直す。
			query := "INSERT INTO flea_item_draft_images (draft_id, asset_id, temp_path, sort_order) VALUES "
			var args []interface{}
			ph := 1
			for i, img := range *p.UploadedImages {
				query += fmt.Sprintf("($%d, $%d, $%d, $%d),", ph, ph+1, ph+2, ph+3)
				args = append(args, draftID, img.ServerID, img.URL, i)
				ph += 4
			}
			query = query[:len(query)-1]
			if _, err := tx.ExecContext(ctx, query, args...); err != nil {
				return time.Time{}, err
			}
		}
	}

	if err := tx.QueryRowContext(ctx, "SELECT updated_at FROM flea_item_drafts WHERE id = $1", draftID).Scan(&savedAt); err != nil {
		return time.Time{}, err
	}
	return savedAt, tx.Commit()
}

// ==========================================
// GetFleaDraftByID: ドラフト取得（復元対応版）
// ==========================================
func (db *Database) GetFleaDraftByID(ctx context.Context, userID string, draftID uint64) (utils.LatestDraftResponse, error) {
	var out utils.LatestDraftResponse
	if db.DB == nil {
		return out, errors.New("db not ready")
	}
	var updated time.Time
	var detailsString sql.NullString

	query := `
        SELECT
            d.id,
            d.name,
            d.description,
            CASE
                WHEN d.price IS NULL THEN NULL
                ELSE TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM d.price::text))
            END,
            d.quantity,
            d.type,
            d.category_id,
            d.supply_type_id,
            CASE
                WHEN d.supply_type_id IS NOT NULL AND st.name IS NOT NULL
                THEN c.name || ' > ' || st.name
                ELSE c.name
            END AS category_name,
            d.is_multi_purchasable,
            d.main_image_url,
            d.ship_from,
            d.shipping_fee_type,
            d.ships_within_days,
            d.details,
            d.updated_at
        FROM flea_item_drafts AS d
        LEFT JOIN categories AS c ON d.category_id = c.id
        LEFT JOIN supply_types AS st ON d.supply_type_id = st.id
        WHERE d.id = $1 AND d.user_id = $2 AND d.status = 0
    `

	err := db.DB.QueryRowContext(ctx, query, draftID, userID).Scan(
		&out.DraftID, &out.Name, &out.Description, &out.Price, &out.Quantity, &out.Type,
		&out.CategoryID,
		&out.SupplyTypeID,
		&out.CategoryName,
		&out.IsMultiPurchasable,
		&out.MainImageURL, &out.ShipFrom, &out.ShippingFeeType, &out.ShipsWithinDays,
		&detailsString,
		&updated,
	)
	if err != nil {
		return out, err
	}

	if detailsString.Valid && detailsString.String != "" {
		var det interface{}
		if err := json.Unmarshal([]byte(detailsString.String), &det); err == nil {
			out.Details = det
		}
	}

	out.UpdatedAt = updated.UTC().Format(time.RFC3339)

	imgRows, err := db.DB.QueryContext(ctx, `
        SELECT asset_id, temp_path
          FROM flea_item_draft_images
         WHERE draft_id = $1
         ORDER BY sort_order ASC
    `, draftID)
	if err != nil {
		return out, err
	}
	defer imgRows.Close()

	var images []utils.DraftUploadedImage
	for imgRows.Next() {
		var assetID int64
		var path string
		if err := imgRows.Scan(&assetID, &path); err != nil {
			return out, err
		}
		images = append(images, utils.DraftUploadedImage{
			ID:       fmt.Sprintf("%d", assetID),
			ServerID: assetID,
			URL:      path,
		})
	}
	out.UploadedImages = &images
	return out, nil
}

func (db *Database) ListDraftsByUser(ctx context.Context, userID string, limit, offset int) (utils.DraftListResponse, error) {
	var out utils.DraftListResponse
	if db.DB == nil {
		return out, errors.New("db not ready")
	}

	// ★修正: ? -> $n
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, name, updated_at, status, main_image_url
		  FROM flea_item_drafts
		 WHERE user_id = $1 AND status = 0
		 ORDER BY updated_at DESC
		 LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return out, err
	}
	defer rows.Close()

	for rows.Next() {
		var it utils.DraftListItem
		var updated time.Time
		if err := rows.Scan(&it.DraftID, &it.Name, &updated, &it.Status, &it.MainImageURL); err != nil {
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
        SET status = 2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2 AND status = 0
    `, draftID, userID)
	if err != nil {
		return err
	}

	if rows, _ := res.RowsAffected(); rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (db *Database) UploadImageAsset(publicURL string) (int64, error) {
	var id int64
	err := db.DB.QueryRow("INSERT INTO image_assets (url) VALUES ($1) RETURNING id", publicURL).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}
