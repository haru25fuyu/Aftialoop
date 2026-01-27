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

// ==========================================
// CreateDraft: ドラフト作成（画像保存対応版）
// ==========================================
func (db *Database) CreateDraft(ctx context.Context, userID string, p utils.DraftPayload) (id uint64, savedAt time.Time, err error) {
	if db.DB == nil {
		return 0, time.Time{}, errors.New("db not ready")
	}

	// 1. トランザクション開始 (親と子を同時に保存するため)
	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, time.Time{}, err
	}
	defer tx.Rollback()

	// ★追加: detailsオブジェクトをJSON文字列に変換
	var detailsJSON interface{} = nil
	if p.Details != nil {
		b, err := json.Marshal(p.Details)
		if err == nil {
			detailsJSON = string(b) // 文字列として保存
		}
	}

	// 2. 親テーブル (flea_item_drafts) への INSERT
	res, err := tx.ExecContext(ctx, `
        INSERT INTO flea_item_drafts
        SET user_id = ?,
            name = ?,
            description = ?,
            price = CASE WHEN ? IS NULL OR ? = '' THEN NULL ELSE ? END,
            quantity = ?,
            type = ?,
            is_multi_purchasable = COALESCE(?, 0),
            main_image_url = ?,
            status = 0,
            ship_from = ?,
            shipping_fee_type = ?,
            ships_within_days = ?,
            
            details = ?,  -- ★ここにJSON文字列を入れる
            
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
		p.ShipFrom, p.ShippingFeeType, p.ShipsWithinDays,
		detailsJSON,
	)

	if err != nil {
		return 0, time.Time{}, fmt.Errorf("insert draft: %w", err)
	}

	lastID, _ := res.LastInsertId()
	id = uint64(lastID)

	// 3. 子テーブル (flea_item_draft_images) への INSERT ★ここを追加
	if p.UploadedImages != nil && len(*p.UploadedImages) > 0 {
		query := "INSERT INTO flea_item_draft_images (draft_id, asset_id, temp_path, sort_order) VALUES "
		var args []interface{}

		for i, img := range *p.UploadedImages {
			query += "(?, ?, ?, ?),"
			// ★重要: img.ServerID (image_assetsのID) を asset_id として保存
			args = append(args, id, img.ServerID, img.URL, i)
		}

		// 末尾のカンマ削除
		query = query[:len(query)-1]

		if _, err := tx.ExecContext(ctx, query, args...); err != nil {
			return 0, time.Time{}, fmt.Errorf("insert draft images: %w", err)
		}
	}

	// 4. updated_at 取得 & コミット
	if err = tx.QueryRowContext(ctx, `SELECT updated_at FROM flea_item_drafts WHERE id = ?`, id).Scan(&savedAt); err != nil {
		return 0, time.Time{}, fmt.Errorf("select updated_at: %w", err)
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
	// ... (前半の接続チェック等は省略、変更なし) ...
	if db.DB == nil {
		return time.Time{}, errors.New("db not ready")
	}
	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return time.Time{}, err
	}
	defer tx.Rollback()

	// detailsをJSON文字列に
	var detailsJSON interface{} = nil
	if p.Details != nil {
		b, err := json.Marshal(p.Details)
		if err == nil {
			detailsJSON = string(b)
		}
	}

	// ... (存在チェック等は省略、変更なし) ...
	// ↓ チェック用簡易コード
	var exists bool
	tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM flea_item_drafts WHERE id=? AND user_id=? AND status=0)", draftID, userID).Scan(&exists)
	if !exists {
		return time.Time{}, sql.ErrNoRows
	}

	// 親テーブル更新 (変更なし)
	_, err = tx.ExecContext(ctx, `
        UPDATE flea_item_drafts
           SET name = COALESCE(?, name),
               description = COALESCE(?, description),
               price = CASE WHEN ? IS NULL OR ? = '' THEN NULL ELSE ? END,
               quantity = COALESCE(?, quantity),
               type = COALESCE(?, type),
               is_multi_purchasable = COALESCE(?, is_multi_purchasable),
               main_image_url = ?,
               ship_from = COALESCE(?, ship_from),
               shipping_fee_type = COALESCE(?, shipping_fee_type),
               ships_within_days = COALESCE(?, ships_within_days),
               
               details = COALESCE(?, details), -- ★更新
               
               updated_at = UTC_TIMESTAMP()
         WHERE id = ? AND user_id = ?
    `,
		p.Name, p.Description,
		p.Price, p.Price, p.Price,
		p.Quantity, p.Type, p.IsMultiPurchasable, p.MainImageURL,
		p.ShipFrom, p.ShippingFeeType, p.ShipsWithinDays,
		detailsJSON,
		draftID, userID,
	)

	if err != nil {
		return time.Time{}, err
	}

	// ★画像更新処理（asset_id対応）
	if p.UploadedImages != nil {
		if _, err := tx.ExecContext(ctx, "DELETE FROM flea_item_draft_images WHERE draft_id = ?", draftID); err != nil {
			return time.Time{}, err
		}
		if len(*p.UploadedImages) > 0 {
			query := "INSERT INTO flea_item_draft_images (draft_id, asset_id, temp_path, sort_order) VALUES "
			var args []interface{}
			for i, img := range *p.UploadedImages {
				query += "(?, ?, ?, ?),"
				// ★ asset_id を保存
				args = append(args, draftID, img.ServerID, img.URL, i)
			}
			query = query[:len(query)-1]
			if _, err := tx.ExecContext(ctx, query, args...); err != nil {
				return time.Time{}, err
			}
		}
	}

	tx.QueryRowContext(ctx, "SELECT updated_at FROM flea_item_drafts WHERE id=?", draftID).Scan(&savedAt)
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

	var detailsString sql.NullString // ★DBのlongtextを受け取る変数

	// SELECT実行
	err := db.DB.QueryRowContext(ctx, `
        SELECT id, name, description,
               CASE WHEN price IS NULL THEN NULL ELSE TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM price)) END,
               quantity, type, is_multi_purchasable,
               main_image_url,
               ship_from, shipping_fee_type, ships_within_days, 
               
               details, -- ★取得
               
               updated_at
          FROM flea_item_drafts
         WHERE id = ? AND user_id = ? AND status = 0
    `, draftID, userID).Scan(
		&out.DraftID, &out.Name, &out.Description, &out.Price, &out.Quantity, &out.Type, &out.IsMultiPurchasable,
		&out.MainImageURL, &out.ShipFrom, &out.ShippingFeeType, &out.ShipsWithinDays,

		&detailsString, // ★受け取る

		&out.UpdatedAt, // (型に合わせて調整してください)
	)
	if err != nil {
		return out, err
	}

	// ★JSON文字列をオブジェクトに戻す
	if detailsString.Valid && detailsString.String != "" {
		var det interface{}
		if err := json.Unmarshal([]byte(detailsString.String), &det); err == nil {
			out.Details = det
		}
	}

	out.UpdatedAt = updated.UTC().Format(time.RFC3339)

	// ★画像取得（asset_id を serverId として復元）
	rows, err := db.DB.QueryContext(ctx, `
        SELECT asset_id, temp_path
          FROM flea_item_draft_images
         WHERE draft_id = ?
         ORDER BY sort_order ASC
    `, draftID)
	if err != nil {
		return out, err
	}
	defer rows.Close()

	var images []utils.DraftUploadedImage
	for rows.Next() {
		var assetID int64
		var path string
		if err := rows.Scan(&assetID, &path); err != nil {
			return out, err
		}

		images = append(images, utils.DraftUploadedImage{
			ID:       fmt.Sprintf("%d", assetID), // フロント識別用
			ServerID: assetID,                    // ★重要: 本番の画像ID
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

	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, name, updated_at, status, main_image_url
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

func (db *Database) UploadImageAsset(publicURL string) (int64, error) {

	result, err := db.DB.Exec("INSERT INTO image_assets (url) VALUES (?)", publicURL)
	if err != nil {
		return 0, err
	}
	id, _ := result.LastInsertId()

	return id, nil
}
