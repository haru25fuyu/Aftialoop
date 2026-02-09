package sql

import (
	"animaloop/config"
	"animaloop/utils"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strings"
)

// ============================================================
// フリマ商品関係
// ============================================================

// SearchFleaItems は条件に基づいて商品一覧を取得します
func (db *Database) SearchFleaItems(ctx context.Context, req utils.ListFleaMarketRequest, currentUserID int64) ([]utils.FleaMarketListLite, error) {
	// 1. ベースのクエリ
	// ★修正: フロントエンドに必要な quantity, status, shipping_fee_type, likes_count を追加
	query := `
        SELECT
            f.id,
            f.name,
            f.price,
            f.seller_rate,
            f.type,
            f.main_image_url,
            f.status,             -- 追加
            f.quantity,           -- 追加
            f.shipping_fee_type,  -- 追加
            u.name     AS seller_name,
            u.icon_url AS seller_icon_url,
            EXISTS(SELECT 1 FROM flea_likes fl WHERE fl.item_id = f.id AND fl.user_id = ?) AS is_liked,
            (SELECT COUNT(*) FROM flea_likes WHERE item_id = f.id) AS likes_count -- 追加
        FROM flea_items AS f
        LEFT JOIN users AS u ON u.id = f.user_id
        WHERE f.deleted_at IS NULL
    `

	args := []interface{}{currentUserID}

	// ---------------------------------------------------------
	// 2. 検索条件の追加
	// ---------------------------------------------------------

	if req.Keyword != "" {
		query += " AND (f.name LIKE ? OR f.description LIKE ?)"
		search := "%" + req.Keyword + "%"
		args = append(args, search, search)
	}

	if req.Type != "" {
		query += " AND f.type = ?"
		args = append(args, req.Type)
	}

	if req.CategoryID > 0 {
		query += " AND f.category_id = ?"
		args = append(args, req.CategoryID)
	}

	if req.MinPrice != nil {
		query += " AND f.price >= ?"
		args = append(args, *req.MinPrice)
	}

	if req.MaxPrice != nil {
		query += " AND f.price <= ?"
		args = append(args, *req.MaxPrice)
	}

	if req.Status != 0 {
		query += " AND f.status = ?"
		args = append(args, req.Status)
	}

	// ---------------------------------------------------------
	// 3. 並び替え
	// ---------------------------------------------------------
	// likes順の場合はエイリアスではなくサブクエリかカラム指定が必要なケースがあるが
	// MySQLはORDER BY句でSELECT句のエイリアス(likes_count)を使えることが多い
	switch req.Sort {
	case "price_asc":
		query += " ORDER BY f.price ASC"
	case "price_desc":
		query += " ORDER BY f.price DESC"
	case "likes":
		query += " ORDER BY likes_count DESC" // エイリアスを使用
	case "oldest":
		query += " ORDER BY f.created_at ASC"
	default:
		query += " ORDER BY f.created_at DESC"
	}

	// ---------------------------------------------------------
	// 4. ページネーション
	// ---------------------------------------------------------
	query += " LIMIT ? OFFSET ?"

	limit := req.Limit
	if limit <= 0 {
		limit = 20
	}
	offset := (req.Page - 1) * limit
	if offset < 0 {
		offset = 0
	}
	args = append(args, limit, offset)

	// ---------------------------------------------------------
	// 5. 実行 & スキャン
	// ---------------------------------------------------------
	rows, err := db.DB.QueryContext(ctx, query, args...)
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
			shippingFee   sql.NullInt64 // NULL許容のため
		)

		// SELECTしたカラム数・順番に合わせてScan
		if err := rows.Scan(
			&it.ID,
			&it.Name,
			&it.Price,
			&it.SellerRate,
			&it.Type,
			&mainURL,
			&it.Status,   // 追加
			&it.Quantity, // 追加
			&shippingFee, // 追加 (NullInt64)
			&sellerName,
			&sellerIconURL,
			&it.IsLiked,
			&it.LikesCount, // 追加
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
		if shippingFee.Valid {
			it.ShippingFeeType = int(shippingFee.Int64)
		} else {
			it.ShippingFeeType = 0 // デフォルト
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

func (db *Database) CreateFleaMarketItem(ctx context.Context, userID string, p utils.CreateFleaMarketItemInput) (int64, error) {
	// 1. トランザクション開始
	tx, err := db.DB.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// 2. flea_items テーブルへの保存 (ここは既存のまま)
	query := `
        INSERT INTO flea_items (
            user_id,
            name,
            description,
            price,
            quantity,
            type,
            category_id,
            category_name,
            is_multi_purchasable,
            main_image_url,
            details,
            ship_from,
            shipping_fee_type,
            ships_within_days,
            seller_rate,
			status,
            commission_rate,
            created_at,
            updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP()
        )
    `

	res, err := db.DB.ExecContext(ctx, query,
		userID,
		p.Name,
		p.Description,
		p.Price,
		p.Quantity,
		p.Type,
		p.CategoryID,
		p.CategoryName,
		p.IsMultiPurchasable,
		p.MainImageURL,
		p.Details,
		p.ShipFrom,
		p.ShippingFeeType,
		p.ShipsWithinDays,
		p.SellerRateBP,
		p.CommissionRateBP, // 最後の ? に対応
	)
	if err != nil {
		return 0, fmt.Errorf("insert item: %w", err)
	}

	itemID, err := res.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("get last insert id: %w", err)
	}

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

// UpdateFleaItem: 商品テキスト情報の更新
func (d *Database) UpdateFleaItem(itemID uint64, name, desc string, price int, categoryID *int64, method, fee string, from, days, status int) error {
	_, err := d.DB.Exec(`
        UPDATE flea_items
        SET name = ?, 
            description = ?, 
            price = ?, 
			category_id = ?,
            shipping_method = ?,
            shipping_fee_type = ?,
            ship_from = ?, 
            ships_within_days = ?,
            status = ?,
            updated_at = UTC_TIMESTAMP()
        WHERE id = ?
    `, name, desc, price, categoryID, method, fee, from, days, status, itemID) // 引数追加
	return err
}

// SyncFleaItemImages: 指定されたID以外の画像を削除する
func (d *Database) SyncFleaItemImages(itemID uint64, keptIDs []uint64) error {
	if len(keptIDs) == 0 {
		// 全削除の場合
		_, err := d.DB.Exec("DELETE FROM flea_item_images WHERE item_id = ?", itemID)
		return err
	}

	// 文字列組み立て (IN句を作る: ?,?,?)
	query := "DELETE FROM flea_item_images WHERE item_id = ? AND id NOT IN (?" + strings.Repeat(",?", len(keptIDs)-1) + ")"

	args := make([]interface{}, len(keptIDs)+1)
	args[0] = itemID
	for i, id := range keptIDs {
		args[i+1] = id
	}

	_, err := d.DB.Exec(query, args...)
	return err
}

// UpdateFleaImageSortNum: 既存画像の並び順を更新
func (d *Database) UpdateFleaImageSortNum(imageID uint64, sortNum int) error {
	_, err := d.DB.Exec("UPDATE flea_item_images SET sort_num = ? WHERE id = ?", sortNum, imageID)
	return err
}

// AddFleaItemImageWithSort: sort_numを指定して画像を追加
func (d *Database) AddFleaItemImageWithSort(itemID uint64, url string, sortNum int) error {
	_, err := d.DB.Exec("INSERT INTO flea_item_images (item_id, url, sort_num) VALUES (?, ?, ?)", itemID, url, sortNum)
	return err
}

// UpdateFleaMainImage: sort_num が一番小さい画像をメイン画像にする
func (d *Database) UpdateFleaMainImage(itemID uint64) error {
	// 1. 一番 sort_num が小さい (＝先頭の) 画像を取得
	var mainURL string
	err := d.DB.QueryRow(`
        SELECT url FROM flea_item_images 
        WHERE item_id = ? 
        ORDER BY sort_num ASC, id ASC 
        LIMIT 1
    `, itemID).Scan(&mainURL)

	if err != nil {
		// 画像がない場合などは何もしない、あるいはNULLにする
		return nil
	}

	// 2. 親テーブルを更新
	_, err = d.DB.Exec("UPDATE flea_items SET main_image_url = ? WHERE id = ?", mainURL, itemID)
	return err
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
// マイページ用: 出品した商品一覧 (下書きを表示するかフラグメント付きで)
// ---------------------------------------------------------
func (d *Database) GetUserListings(ctx context.Context, userID string, includeDrafts bool, limit, offset int) ([]utils.FleaMarketItemResponse, error) {
	if d.DB == nil {
		return nil, errors.New("db not ready")
	}

	query := `
        SELECT id, name, price, main_image_url, status, created_at, updated_at
        FROM flea_items 
        WHERE user_id = ? `

	if includeDrafts {
		query += "AND status IN (0, 1, 2, 3, 4) "
	} else {
		query += "AND status IN (1, 2, 3, 4) "
	}

	query += `AND deleted_at IS NULL
        ORDER BY status ASC, created_at DESC
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
