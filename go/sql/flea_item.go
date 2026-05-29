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
	//    生体詳細(ad)・用品詳細(sd)を LEFT JOIN。1商品につき高々1行なので DISTINCT は維持。
	query := `
        SELECT DISTINCT
            f.id,
            f.name,
            f.price,
            f.seller_rate,
            f.type,
            f.category_id,
            f.supply_type_id,
            f.main_image_url,
            f.status,
            f.quantity,
            f.shipping_fee_type,
            u.name     AS seller_name,
            u.icon_url AS seller_icon_url,
            EXISTS(SELECT 1 FROM flea_likes fl WHERE fl.item_id = f.id AND fl.user_id = ?)::boolean AS is_liked,
            (SELECT COUNT(*) FROM flea_likes WHERE item_id = f.id) AS likes_count,
            f.created_at
        FROM flea_items AS f
        LEFT JOIN users AS u ON u.id = f.user_id
        LEFT JOIN search_tags st ON f.category_id = st.category_id
        LEFT JOIN flea_item_animal_details ad ON ad.item_id = f.id
        LEFT JOIN flea_item_supply_details sd ON sd.item_id = f.id
        WHERE f.deleted_at IS NULL
    `

	args := []interface{}{currentUserID}

	// ---------------------------------------------------------
	// 2. 検索条件の追加
	// ---------------------------------------------------------
	if req.Keyword != "" {
		keyword := strings.ReplaceAll(req.Keyword, "　", " ")
		words := strings.Fields(keyword)

		for _, w := range words {
			// details::text LIKE は廃止。代わりに専用テーブルの locality / generation を対象に含める。
			condition := ` AND (
                f.name LIKE ?
                OR f.description LIKE ?
                OR ad.locality LIKE ?
                OR ad.generation LIKE ?
                OR sd.brand LIKE ?
                OR st.term LIKE ?
                OR (? LIKE '%' || st.term || '%' AND LENGTH(st.term) >= 2)
            )`
			query += condition
			likeWord := "%" + w + "%"
			exactWord := w
			args = append(args, likeWord, likeWord, likeWord, likeWord, likeWord, likeWord, exactWord)
		}
	}

	if req.Type != "" {
		query += " AND f.type = ?"
		args = append(args, req.Type)
	}

	if req.Type == "SUPPLY" && req.SupplyTypeID != nil && *req.SupplyTypeID > 0 {
		query += " AND f.supply_type_id = ?"
		args = append(args, req.SupplyTypeID)
	} else if req.CategoryID > 0 {
		// カテゴリ階層: 選んだカテゴリの配下を path 前方一致で取る
		query += ` AND f.category_id IN (
            SELECT id FROM categories
            WHERE path LIKE (SELECT path FROM categories WHERE id = ?) || '%'
        )`
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
	// 詳細条件（専用テーブル参照）
	// ---------------------------------------------------------
	if req.DetailSex != "" {
		query += " AND ad.sex = ?"
		args = append(args, req.DetailSex)
	}
	if req.DetailLocality != "" {
		query += " AND ad.locality ILIKE ?"
		args = append(args, "%"+req.DetailLocality+"%")
	}
	if req.DetailBrand != "" {
		query += " AND sd.brand ILIKE ?"
		args = append(args, "%"+req.DetailBrand+"%")
	}
	if req.DetailSizeUnit != "" && (req.DetailSizeMin != nil || req.DetailSizeMax != nil) {
		query += " AND ad.size_unit = ?"
		args = append(args, req.DetailSizeUnit)
	}
	if req.DetailSizeMin != nil {
		query += " AND ad.size_value >= ?"
		args = append(args, *req.DetailSizeMin)
	}
	if req.DetailSizeMax != nil {
		query += " AND ad.size_value <= ?"
		args = append(args, *req.DetailSizeMax)
	}

	// ---------------------------------------------------------
	// 3. 並び替え
	// ---------------------------------------------------------
	switch req.Sort {
	case "price_asc":
		query += " ORDER BY f.price ASC"
	case "price_desc":
		query += " ORDER BY f.price DESC"
	case "likes":
		query += " ORDER BY likes_count DESC"
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
	query = db.DB.Rebind(query)

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
			shippingFee   sql.NullInt64
			createdAt     sql.NullTime
			supplyTypeID  sql.NullInt64
		)

		if err := rows.Scan(
			&it.ID, &it.Name, &it.Price, &it.SellerRate, &it.Type,
			&it.CategoryID, &supplyTypeID, &mainURL, &it.Status, &it.Quantity,
			&shippingFee, &sellerName, &sellerIconURL, &it.IsLiked, &it.LikesCount,
			&createdAt,
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
		it.ShippingFeeType = int(shippingFee.Int64)
		if supplyTypeID.Valid {
			val := uint64(supplyTypeID.Int64)
			it.SupplyTypeID = &val
		}

		items = append(items, it)
	}

	return items, rows.Err()
}

func (d *Database) GetFleaMarketItemByID(userID string, id uint64) (*utils.FleaMarketItemDetailResponse, error) {
	var item utils.FleaMarketItemDetailResponse

	// f.* は details 列が無くなったぶん自動で追従する。
	// ※ FleaMarketItemDetailResponse 側に details の db タグが残っていても
	//   実害は無いが、混乱を避けるなら構造体からも details を消すこと。
	query := `
        SELECT 
            f.*, 
            u.name AS user_name, 
            u.icon_url AS user_icon,
            EXISTS(SELECT 1 FROM flea_likes fl WHERE fl.item_id = f.id AND fl.user_id = ?)::boolean AS is_liked
        FROM flea_items AS f
        JOIN users AS u ON u.id = f.user_id
        WHERE f.id = ? 
          AND f.deleted_at IS NULL
        LIMIT 1;
    `

	query = d.DB.Rebind(query)

	if err := d.DB.Get(&item, query, userID, id); err != nil {
		log.Printf("GetFleaMarketItemByID error: %v", err)
		return nil, err
	}

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
        WHERE item_id = $1
        ORDER BY sort_num ASC, id ASC;
    `
	var images []utils.ItemImage
	if err := d.DB.Select(&images, q, itemID); err != nil {
		return nil, err
	}
	return images, nil
}

// CreateFleaMarketItem: 商品を作成し、生体/用品の詳細も同一トランザクションで専用テーブルに保存する
func (db *Database) CreateFleaMarketItem(ctx context.Context, userID string, p utils.CreateFleaMarketItemInput) (int64, error) {
	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()

	// 1. flea_items への保存（details 列は廃止したので含めない）
	query := `
        INSERT INTO flea_items (
            user_id, name, description, price, quantity, type,
            category_id, supply_type_id, category_name,
            is_multi_purchasable,
            main_image_url, ship_from, shipping_fee_type,
            ships_within_days, seller_rate, status, commission_rate,
            created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10::boolean::int,
            $11, $12, $13, $14, $15, $16, $17,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING id
    `

	var itemID int64
	err = tx.QueryRowContext(ctx, query,
		userID,
		p.Name,
		p.Description,
		p.Price,
		p.Quantity,
		p.Type,
		p.CategoryID,
		p.SupplyTypeID,
		p.CategoryName,
		p.IsMultiPurchasable,
		p.MainImageURL,
		p.ShipFrom,
		p.ShippingFeeType,
		p.ShipsWithinDays,
		p.SellerRateBP,
		1, // status: 出品中
		p.CommissionRateBP,
	).Scan(&itemID)
	if err != nil {
		return 0, fmt.Errorf("insert item: %w", err)
	}

	// 2. 詳細を専用テーブルへ（入力があるときだけ）
	if p.Animal != nil {
		if _, err := tx.ExecContext(ctx, `
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
			p.Animal.Locality,
			nullableDate(p.Animal.HatchDate),
			p.Animal.Generation,
			p.Animal.SizeValue,
			p.Animal.SizeUnit,
			p.Animal.Sex,
		); err != nil {
			return 0, fmt.Errorf("insert animal details: %w", err)
		}
	}

	if p.Supply != nil {
		if _, err := tx.ExecContext(ctx, `
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
			p.Supply.Brand,
			p.Supply.SKU,
			p.Supply.NetWeightG,
		); err != nil {
			return 0, fmt.Errorf("insert supply details: %w", err)
		}
	}

	// 3. 画像の保存（バルクINSERT・連番プレースホルダ）
	if len(p.ImageURLs) > 0 {
		sqlStr := "INSERT INTO flea_item_images (item_id, url, sort_num) VALUES "
		var args []interface{}
		placeholderCount := 1

		for i, url := range p.ImageURLs {
			sqlStr += fmt.Sprintf("($%d, $%d, $%d),", placeholderCount, placeholderCount+1, placeholderCount+2)
			args = append(args, itemID, url, i)
			placeholderCount += 3
		}
		sqlStr = sqlStr[:len(sqlStr)-1]

		if _, err := tx.ExecContext(ctx, sqlStr, args...); err != nil {
			return 0, fmt.Errorf("insert item images: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return itemID, nil
}

// nullableDate は空文字を nil(NULL) に変換する。DATE 列に "" を入れられないため。
func nullableDate(s *string) interface{} {
	if s == nil || *s == "" {
		return nil
	}
	return *s
}

// UpdateFleaItem: 商品テキスト情報の更新（details 列は廃止）
// ※ 生体/用品の詳細更新は UpsertAnimalDetails / UpsertSupplyDetails を別途呼ぶ。
func (d *Database) UpdateFleaItem(itemID uint64, name, desc string, price int, categoryID *int64, supplyTypeID *int64, method, fee string, from, days, status int) error {
	query := `
        UPDATE flea_items
        SET name = $1, 
            description = $2, 
            price = $3, 
            category_id = $4,
            supply_type_id = $5,
            shipping_method = $6,
            shipping_fee_type = $7,
            ship_from = $8, 
            ships_within_days = $9,
            status = $10,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $11
    `
	_, err := d.DB.Exec(query, name, desc, price, categoryID, supplyTypeID, method, fee, from, days, status, itemID)
	return err
}

// SyncFleaItemImages: 指定されたID以外の画像を削除する
func (d *Database) SyncFleaItemImages(itemID uint64, keptIDs []uint64) error {
	if len(keptIDs) == 0 {
		_, err := d.DB.Exec("DELETE FROM flea_item_images WHERE item_id = $1", itemID)
		return err
	}

	query := "DELETE FROM flea_item_images WHERE item_id = ? AND id NOT IN (?" + strings.Repeat(",?", len(keptIDs)-1) + ")"
	args := make([]interface{}, len(keptIDs)+1)
	args[0] = itemID
	for i, id := range keptIDs {
		args[i+1] = id
	}

	_, err := d.DB.Exec(d.DB.Rebind(query), args...)
	return err
}

// UpdateFleaImageSortNum: 既存画像の並び順を更新
func (d *Database) UpdateFleaImageSortNum(imageID uint64, sortNum int) error {
	_, err := d.DB.Exec("UPDATE flea_item_images SET sort_num = $1 WHERE id = $2", sortNum, imageID)
	return err
}

// AddFleaItemImageWithSort: sort_numを指定して画像を追加
func (d *Database) AddFleaItemImageWithSort(itemID uint64, url string, sortNum int) error {
	_, err := d.DB.Exec("INSERT INTO flea_item_images (item_id, url, sort_num) VALUES ($1, $2, $3)", itemID, url, sortNum)
	return err
}

// UpdateFleaMainImage: sort_num が一番小さい画像をメイン画像にする
func (d *Database) UpdateFleaMainImage(itemID uint64) error {
	var mainURL string
	err := d.DB.QueryRow(`
        SELECT url FROM flea_item_images 
        WHERE item_id = $1 
        ORDER BY sort_num ASC, id ASC 
        LIMIT 1
    `, itemID).Scan(&mainURL)

	if err != nil {
		return nil
	}

	_, err = d.DB.Exec("UPDATE flea_items SET main_image_url = $1 WHERE id = $2", mainURL, itemID)
	return err
}

func (d *Database) SoftDeleteFleaMarketItem(id int64, userID string) error {
	res, err := d.DB.Exec(`
        UPDATE flea_items
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
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
	err := db.DB.QueryRowContext(ctx, "SELECT price FROM flea_items WHERE id = $1", itemID).Scan(&price)
	if err != nil {
		return 0, err
	}
	return price, nil
}

func (db *Database) FindFleaItemOwnerID(ctx context.Context, itemID uint64) (string, error) {
	const q = `
        SELECT user_id
        FROM flea_items
        WHERE id = $1 AND deleted_at IS NULL
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
        SELECT user_id
        FROM flea_items
        WHERE id = $1
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
        SELECT commission_rate
        FROM flea_items
        WHERE id = $1
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
	err := d.DB.Get(&count, `
        SELECT COUNT(*) 
        FROM flea_items 
        WHERE user_id = $1 AND deleted_at IS NULL
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

	query := "SELECT id, name, price, main_image_url, status, created_at, updated_at FROM flea_items WHERE user_id = ?"

	if includeDrafts {
		query += " AND status IN (0, 1, 2, 3, 4) "
	} else {
		query += " AND status IN (1, 2, 3, 4) "
	}

	query += " AND deleted_at IS NULL ORDER BY status ASC, created_at DESC LIMIT ? OFFSET ? "

	query = d.DB.Rebind(query)

	var items []utils.FleaMarketItemResponse
	err := d.DB.SelectContext(ctx, &items, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	return items, nil
}

// ToggleFleaLike: いいねの切り替え (登録されていれば削除、なければ追加)
func (db *Database) ToggleFleaLike(ctx context.Context, userID string, itemID int64) (bool, error) {
	if db.DB == nil {
		return false, errors.New("db not ready")
	}

	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	var exists int
	err = tx.QueryRowContext(ctx, `
        SELECT COUNT(*) FROM flea_likes WHERE user_id = $1 AND item_id = $2
    `, userID, itemID).Scan(&exists)
	if err != nil {
		return false, err
	}

	var isLiked bool
	if exists > 0 {
		_, err = tx.ExecContext(ctx, "DELETE FROM flea_likes WHERE user_id = $1 AND item_id = $2", userID, itemID)
		isLiked = false
	} else {
		_, err = tx.ExecContext(ctx, "INSERT INTO flea_likes (user_id, item_id) VALUES ($1, $2)", userID, itemID)
		isLiked = true
	}

	if err != nil {
		return false, err
	}

	if err := tx.Commit(); err != nil {
		return false, err
	}

	return isLiked, nil
}

// ListLikedFleaItems: 自分がいいねした商品一覧を取得
func (db *Database) ListLikedFleaItems(ctx context.Context, userID string, limit, offset int) ([]utils.FleaMarketListLite, error) {
	const q = `
        SELECT
          f.id, f.name, f.price, f.seller_rate, f.type,
          f.main_image_url, u.name AS seller_name, u.icon_url AS seller_icon_url,
          f.status
        FROM flea_likes l
        JOIN flea_items f ON f.id = l.item_id
        LEFT JOIN users u ON u.id = f.user_id
        WHERE l.user_id = ?
          AND f.deleted_at IS NULL
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?;
    `
	rows, err := db.DB.QueryContext(ctx, db.DB.Rebind(q), userID, limit, offset)
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
			status        string
		)
		if err := rows.Scan(&it.ID, &it.Name, &it.Price, &it.SellerRate, &it.Type, &mainURL, &sellerName, &sellerIconURL, &status); err != nil {
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
		it.IsLiked = true
		items = append(items, it)
	}
	return items, nil
}