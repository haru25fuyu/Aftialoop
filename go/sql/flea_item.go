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

// 引数に userID を追加
func (db *Database) ListFleaMarketItemsLite(ctx context.Context, userID string, limit, offset int) ([]utils.FleaMarketListLite, error) {
	const q = `
        SELECT
          f.id,
          f.name,
          f.price,
          f.seller_rate,
          f.type,
          f.main_image_url,
          u.name    AS seller_name,
          u.icon_url AS seller_icon_url,
          -- ★追加: 自分がいいねしているか判定
          EXISTS(SELECT 1 FROM flea_likes fl WHERE fl.item_id = f.id AND fl.user_id = ?) AS is_liked
        FROM flea_items AS f
        LEFT JOIN users   AS u ON u.id     = f.user_id
        WHERE f.deleted_at IS NULL
        AND f.status = ?
        ORDER BY f.created_at DESC
        LIMIT ? OFFSET ?;
    `

	// ★Queryの引数順序に注意: userID -> status -> limit -> offset
	rows, err := db.DB.QueryContext(ctx, q, userID, config.FleaItemStatusActive, limit, offset)
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

		// ★Scanに &it.IsLiked を追加 (最後)
		if err := rows.Scan(
			&it.ID,
			&it.Name,
			&it.Price,
			&it.SellerRate,
			&it.Type,
			&mainURL,
			&sellerName,
			&sellerIconURL,
			&it.IsLiked, // ここに追加
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

// 引数に userID を追加しました
func (d *Database) GetFleaMarketItemByID(userID string, id uint64) (*utils.FleaMarketItemDetailResponse, error) {
	var item utils.FleaMarketItemDetailResponse

	// SQL修正: EXISTSを使っていいね済みか判定
	// user_id = ? (1つ目のハテナ) には閲覧者のuserIDが入ります
	const q = `
        SELECT 
            f.*, 
            u.name AS user_name, 
            u.icon_url AS user_icon,
            EXISTS(SELECT 1 FROM flea_likes fl WHERE fl.item_id = f.id AND fl.user_id = ?) AS is_liked
        FROM flea_items AS f
        JOIN users AS u ON u.id = f.user_id
        WHERE f.id = ? 
          AND f.deleted_at IS NULL
        LIMIT 1;
    `

	// 引数の順番注意: userID, id の順
	if err := d.DB.Get(&item, q, userID, id); err != nil {
		log.Printf("GetFleaMarketItemByID error: %v", err)
		return nil, err
	}

	// -----------------------------------------------------
	// レート計算ロジック (そのまま)
	// -----------------------------------------------------
	cfg := config.GetFleaConfig()
	denominator := cfg.RateDen
	if denominator == 0 {
		denominator = 10000
	}

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

// utils.CreateFleaMarketItemInput に ImageURLs []string がある前提です

func (db *Database) CreateFleaMarketItem(userID string, p utils.CreateFleaMarketItemInput) (int64, error) {
	// 1. トランザクション開始
	tx, err := db.DB.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// 2. flea_items テーブルへの保存 (ここは既存のまま)
	res, err := tx.Exec(`
        INSERT INTO flea_items (
            user_id, name, description, price, 
            quantity, type, is_multi_purchasable, 
            main_image_url, 
            ship_from, shipping_fee_type, ships_within_days, 
            seller_rate, commission_rate, 
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
    `,
		userID, p.Name, p.Description, p.Price,
		p.Quantity, p.Type, p.IsMultiPurchasable,
		p.MainImageURL, // ← ここには1枚目のURLが入ります
		p.ShipFrom, p.ShippingFeeType, p.ShipsWithinDays,
		p.SellerRateBP, p.CommissionRateBP,
	)
	if err != nil {
		return 0, fmt.Errorf("insert item: %w", err)
	}

	itemID, _ := res.LastInsertId()

	// ------------------------------------------------------------
	// ★★★  flea_item_images への保存処理 ★★★
	// ------------------------------------------------------------
	// p.ImageURLs には「下書きからの画像」と「新規画像」のすべてのURLが入っている必要があります
	if len(p.ImageURLs) > 0 {
		query := "INSERT INTO flea_item_images (item_id, url, sort_num) VALUES "
		var args []interface{}

		for i, url := range p.ImageURLs {
			query += "(?, ?, ?),"
			args = append(args, itemID, url, i) // sort_num は 0 からの連番
		}

		// 最後のカンマを削除
		query = query[:len(query)-1]

		if _, err := tx.Exec(query, args...); err != nil {
			return 0, fmt.Errorf("insert item images: %w", err)
		}
	}
	// ------------------------------------------------------------

	// 3. コミット
	if err := tx.Commit(); err != nil {
		return 0, err
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

// ユーザーの出品数をカウント (削除済み以外)
func (d *Database) CountUserListings(userID string) (int, error) {
	var count int
	// status != 0 (出品中) や status != 99 (削除) など、仕様に合わせて調整してください
	// ここでは単純に「論理削除されていない自分の商品」を数えます
	err := d.DB.Get(&count, `
        SELECT COUNT(*) 
        FROM flea_items 
        WHERE user_id = ? AND deleted_at IS NULL
    `, userID)

	if err != nil {
		return 0, err
	}
	return count, nil
}

// ---------------------------------------------------------
// マイページ用: 出品した商品一覧 (status > 0)
// ---------------------------------------------------------
func (d *Database) GetUserListings(ctx context.Context, userID string, limit, offset int) ([]utils.FleaMarketItemResponse, error) {
	if d.DB == nil {
		return nil, errors.New("db not ready")
	}

	// status > 0 (1:出品中, 2:取引中, 3:売却済み) のものを取得
	// 下書きは別テーブルにあるので、ここでは status=0 は除外される（または存在しない）前提
	query := `
        SELECT id, name, price, main_image_url, status, created_at, updated_at
        FROM flea_items 
        WHERE user_id = ? AND status > 0 AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `

	var items []utils.FleaMarketItemResponse
	err := d.DB.SelectContext(ctx, &items, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	return items, nil
}

// ToggleFleaLike: いいねの切り替え (登録されていれば削除、なければ追加)
// 戻り値: (isLiked: true=登録した, false=解除した, err)
func (db *Database) ToggleFleaLike(ctx context.Context, userID string, itemID int64) (bool, error) {
	if db.DB == nil {
		return false, errors.New("db not ready")
	}

	// トランザクション開始
	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	// 既にいいねしているか確認
	var exists int
	err = tx.QueryRowContext(ctx, `
        SELECT COUNT(*) FROM flea_likes WHERE user_id = ? AND item_id = ?
    `, userID, itemID).Scan(&exists)
	if err != nil {
		return false, err
	}

	var isLiked bool
	if exists > 0 {
		// 削除 (いいね解除)
		_, err = tx.ExecContext(ctx, "DELETE FROM flea_likes WHERE user_id = ? AND item_id = ?", userID, itemID)
		isLiked = false
	} else {
		// 追加 (いいね登録)
		_, err = tx.ExecContext(ctx, "INSERT INTO flea_likes (user_id, item_id) VALUES (?, ?)", userID, itemID)
		isLiked = true
	}

	if err != nil {
		return false, err
	}

	// いいね数カウントの更新なども必要ならここで行う (flea_itemsテーブルにlike_countカラムがある場合など)

	if err := tx.Commit(); err != nil {
		return false, err
	}

	return isLiked, nil
}

// ListLikedFleaItems: 自分がいいねした商品一覧を取得
func (db *Database) ListLikedFleaItems(ctx context.Context, userID string, limit, offset int) ([]utils.FleaMarketListLite, error) {
	// flea_likes (l) を主軸にして、作成日順(いいねした順)に取得
	const q = `
        SELECT
          f.id,
          f.name,
          f.price,
          f.seller_rate,
          f.type,
          f.main_image_url,
          u.name    AS seller_name,
          u.icon_url AS seller_icon_url,
          f.status -- 売り切れ判定用にステータスも必要
        FROM flea_likes l
        JOIN flea_items f ON f.id = l.item_id
        LEFT JOIN users u ON u.id = f.user_id
        WHERE l.user_id = ?
          AND f.deleted_at IS NULL
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?;
    `

	rows, err := db.DB.QueryContext(ctx, q, userID, limit, offset)
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
			status        string // 売り切れ表示用（構造体になければ無視でもOKですが、あると便利）
		)

		if err := rows.Scan(
			&it.ID, &it.Name, &it.Price, &it.SellerRate, &it.Type,
			&mainURL, &sellerName, &sellerIconURL, &status,
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

		// ★重要: ここは「いいね一覧」なので、IsLikedは無条件で true
		it.IsLiked = true

		items = append(items, it)
	}
	return items, nil
}
