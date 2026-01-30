package sql

import (
	"animaloop/config"
	"animaloop/utils"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

// -----------------------------------------------------------
// 取引関係
// -----------------------------------------------------------

// ListFleaTransactionsByBuyer: 購入者側の取引一覧（status 絞り込み可、totalも返す）
func (db *Database) ListFleaTransactionsByBuyer(
	ctx context.Context,
	buyerID string,
	status *string, // nil or "" なら全件
	limit, offset int,
) ([]utils.FleaTransactionRow, int, error) {

	if db.DB == nil {
		return nil, 0, errors.New("db not ready")
	}
	buyerID = strings.TrimSpace(buyerID)
	if buyerID == "" {
		return nil, 0, errors.New("bad input")
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	where := "buyer_id = ?"
	args := []any{buyerID}

	if status != nil && strings.TrimSpace(*status) != "" {
		st := utils.NormalizeEnum(*status)
		where += " AND status = ?"
		args = append(args, st)
	}

	// total
	var total int
	if err := db.DB.QueryRowContext(ctx, `
		SELECT COUNT(*)
		  FROM flea_transactions
		 WHERE `+where+`
	`, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// list
	args = append(args, limit, offset)
	rows, err := db.DB.QueryContext(ctx, `
		SELECT id, purchase_request_id, item_id, buyer_id, seller_id, address_id,
		       shipping_method, shipping_fee_type, price_item, price_shipping,
		       payment_provider, payment_id, payment_status, status,
		       shipped_at, completed_at, created_at, updated_at
		  FROM flea_transactions
		 WHERE `+where+`
		 ORDER BY created_at DESC
		 LIMIT ? OFFSET ?
	`, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []utils.FleaTransactionRow
	for rows.Next() {
		var it utils.FleaTransactionRow
		var shipped, completed sql.NullTime
		var created, updated time.Time
		var payProv, payID sql.NullString

		if err := rows.Scan(
			&it.ID, &it.PurchaseRequestID, &it.ItemID, &it.BuyerID, &it.SellerID, &it.AddressID,
			&it.ShippingMethod, &it.ShippingFeeType, &it.PriceItem, &it.PriceShipping,
			&payProv, &payID, &it.PaymentStatus, &it.Status,
			&shipped, &completed, &created, &updated,
		); err != nil {
			return nil, 0, err
		}

		if payProv.Valid {
			s := payProv.String
			it.PaymentProvider = &s
		}
		if payID.Valid {
			s := payID.String
			it.PaymentID = &s
		}
		if shipped.Valid {
			s := shipped.Time.UTC().Format(time.RFC3339)
			it.ShippedAt = &s
		}
		if completed.Valid {
			s := completed.Time.UTC().Format(time.RFC3339)
			it.CompletedAt = &s
		}

		it.CreatedAt = created.UTC().Format(time.RFC3339)
		it.UpdatedAt = updated.UTC().Format(time.RFC3339)

		list = append(list, it)
	}

	return list, total, nil
}

// ListFleaTransactionsBySeller: 販売者側の取引一覧（status 絞り込み可、totalも返す）
func (db *Database) ListFleaPurchaseRequestsBySeller(
	ctx context.Context,
	sellerID string,
	status *string,
	limit, offset int,
) ([]utils.FleaPurchaseRequestListItem, int, error) {

	if db.DB == nil {
		return nil, 0, errors.New("db not ready")
	}
	sellerID = strings.TrimSpace(sellerID)
	if sellerID == "" {
		return nil, 0, errors.New("bad input")
	}
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	where := "pr.seller_id = ?"
	args := []any{sellerID}

	if status != nil && strings.TrimSpace(*status) != "" {
		st := utils.NormalizeEnum(*status)
		where += " AND pr.status = ?"
		args = append(args, st)
	}

	// total
	var total int
	if err := db.DB.QueryRowContext(ctx, `
		SELECT COUNT(*)
		  FROM flea_purchase_requests pr
		 WHERE `+where+`
	`, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// list
	args2 := append(append([]any{}, args...), limit, offset)

	rows, err := db.DB.QueryContext(ctx, `
		SELECT
			pr.id, pr.item_id,
			COALESCE(fi.name, '') AS item_name,
			fi.main_image_url,
			pr.buyer_id, pr.seller_id, pr.address_id,
			pr.shipping_method_pref, pr.shipping_fee_pref,
			pr.note, pr.status,
			pr.created_at, pr.updated_at
		FROM flea_purchase_requests pr
		JOIN flea_items fi ON fi.id = pr.item_id
		WHERE `+where+`
		ORDER BY pr.created_at DESC
		LIMIT ? OFFSET ?
	`, args2...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := make([]utils.FleaPurchaseRequestListItem, 0, limit)
	for rows.Next() {
		var it utils.FleaPurchaseRequestListItem
		var note sql.NullString
		var mainURL sql.NullString
		var created, updated time.Time

		if err := rows.Scan(
			&it.ID, &it.ItemID,
			&it.ItemName,
			&mainURL,
			&it.BuyerID, &it.SellerID, &it.AddressID,
			&it.ShippingMethodPref, &it.ShippingFeePref,
			&note, &it.Status,
			&created, &updated,
		); err != nil {
			return nil, 0, err
		}

		if mainURL.Valid {
			s := mainURL.String
			it.ItemMainImageURL = &s
		}
		if note.Valid {
			s := note.String
			it.Note = &s
		}

		it.CreatedAt = created.UTC().Format(time.RFC3339)
		it.UpdatedAt = updated.UTC().Format(time.RFC3339)

		list = append(list, it)
	}

	return list, total, rows.Err()
}

// GetFleaTransactionByPurchaseRequestID: 取引詳細（購入者 or 出品者のみ閲覧可）
func (db *Database) GetFleaTransactionByPurchaseRequestID(
	ctx context.Context,
	userID string,
	reqID uint64,
) (utils.FleaTransactionRow, error) {
	var out utils.FleaTransactionRow

	var shipped, completed sql.NullTime
	var created, updated time.Time
	var payProv, payID sql.NullString

	err := db.DB.QueryRowContext(ctx, `
		SELECT id, purchase_request_id, item_id, buyer_id, seller_id, address_id,
		       shipping_method, shipping_fee_type, price_item, price_shipping,
		       payment_provider, payment_id, payment_status, status, shipping_carrier, tracking_number,
			   use_point, point_rate,fee_amount, profit_amount,
		       paid_at, shipped_at, completed_at, created_at, updated_at
		  FROM flea_transactions
		 WHERE purchase_request_id = ?
		   AND (buyer_id = ? OR seller_id = ?)
		 LIMIT 1
	`, reqID, userID, userID).Scan(
		&out.ID, &out.PurchaseRequestID, &out.ItemID, &out.BuyerID, &out.SellerID, &out.AddressID,
		&out.ShippingMethod, &out.ShippingFeeType, &out.PriceItem, &out.PriceShipping,
		&payProv, &payID, &out.PaymentStatus, &out.Status, &out.ShippingCarrier, &out.TrackingNumber,
		&out.UsePoint, &out.PointRate, &out.FeeAmount, &out.ProfitAmount,
		&out.PaidAt, &shipped, &completed, &created, &updated,
	)
	if err != nil {
		return out, err
	}

	if payProv.Valid {
		s := payProv.String
		out.PaymentProvider = &s
	}
	if payID.Valid {
		s := payID.String
		out.PaymentID = &s
	}
	if shipped.Valid {
		s := shipped.Time.UTC().Format(time.RFC3339)
		out.ShippedAt = &s
	}
	if completed.Valid {
		s := completed.Time.UTC().Format(time.RFC3339)
		out.CompletedAt = &s
	}

	out.CreatedAt = created.UTC().Format(time.RFC3339)
	out.UpdatedAt = updated.UTC().Format(time.RFC3339)
	return out, nil
}

// UpdateFleaTransactionPaidTx: 決済完了に伴いステータスをPAIDに更新する
func (d *Database) UpdateFleaTransactionPaidTx(
	ctx context.Context,
	tx *sql.Tx,
	txID uint64,
	provider string,
	paymentID string,
	usePoint int64,
	pointRate int,
) error {
	const q = `
        UPDATE flea_transactions 
        SET 
            payment_status = 'PAID',
            status = 'PAID', 
            payment_provider = ?,
            payment_id = ?,
			use_point = ?,
			point_rate = ?,
			paid_at = UTC_TIMESTAMP(),
            updated_at = UTC_TIMESTAMP()
        WHERE id = ?
    `

	// sql.Tx経由で実行することでトランザクションに含める
	res, err := tx.ExecContext(ctx, q, provider, paymentID, usePoint, pointRate, txID)
	if err != nil {
		return fmt.Errorf("transaction update failed: %w", err)
	}

	// 念のため、本当に対象行があったか確認（ID間違いなどで0行更新になっていないか）
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("target transaction not found or already updated (id=%d)", txID)
	}

	return nil
}

// 発送完了
func (d *Database) MarkFleaTransactionShipped(tx *sql.Tx, txID uint64, shippingCarrier string, trackingNumber string) error {
	const q = `
		UPDATE flea_transactions
		SET
			status = 'SHIPPED',
			shipping_carrier = ?,
			tracking_number = ?,
			shipped_at = UTC_TIMESTAMP(),
			updated_at = UTC_TIMESTAMP()
		WHERE id = ? AND status = 'PAID'
	`

	res, err := tx.Exec(q, shippingCarrier, trackingNumber, txID)
	if err != nil {
		return fmt.Errorf("transaction update failed: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("target transaction not found or invalid state (id=%d)", txID)
	}

	return nil
}

// MarkFleaTransactionRatedByBuyer (購入者が評価した状態にする)
func (d *Database) MarkFleaTransactionRatedByBuyer(tx *sql.Tx, txID uint64) error {
	const q = `
        UPDATE flea_transactions
        SET
            status = 'RATED_BY_BUYER', -- ステータス変更
            updated_at = UTC_TIMESTAMP()
        WHERE id = ? AND status = 'SHIPPED' -- SHIPPEDからのみ遷移可能
    `

	res, err := tx.Exec(q, txID)
	if err != nil {
		return fmt.Errorf("transaction update failed: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("target transaction not found or invalid state (id=%d)", txID)
	}

	return nil
}

// MarkFleaTransactionCompleted: 出品者が評価を行い、取引を完全に終了する
func (d *Database) MarkFleaTransactionCompleted(tx *sql.Tx, txID uint64, feeAmount int, profitAmount int) error {
	const q = `
        UPDATE flea_transactions
        SET
            status = 'COMPLETED',
			fee_amount = ?,  
    		profit_amount = ?,
            completed_at = UTC_TIMESTAMP(),
            updated_at = UTC_TIMESTAMP()
        WHERE 
            id = ? 
            AND status = 'RATED_BY_BUYER' -- ★ここ重要: 購入者が評価済みの時だけ実行可能
    `

	res, err := tx.Exec(q, feeAmount, profitAmount, txID)
	if err != nil {
		return fmt.Errorf("transaction update failed: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		// 対象がない、またはステータスが RATED_BY_BUYER ではない（まだ購入者が評価していない等）
		return fmt.Errorf("target transaction not found or invalid state (id=%d)", txID)
	}

	//アイテムのステータスを売却済みに変更する
	const q2 = `
		UPDATE flea_items
		SET status = ?
		WHERE id = (
			SELECT item_id FROM flea_transactions WHERE id = ?
		) AND status = ?
	`
	_, err = tx.Exec(q2, config.FleaItemStatusSold, txID, config.FleaItemStatusTrading)
	if err != nil {
		return fmt.Errorf("item status update failed: %w", err)
	}

	return nil
}

// GetUserActionCounts: マイページ表示用の「対応が必要な件数」を取得する
// 戻り値: (承認待ち件数, 進行中取引件数, error)
func (db *Database) GetUserActionCounts(ctx context.Context, userID string) (int, int, error) {
	if db.DB == nil {
		return 0, 0, errors.New("db not ready")
	}

	// 1. あなたへの購入申請 (承認待ち) の件数
	// 条件: 自分が出品者(seller_id) かつ ステータスが REQUESTED
	var pendingCount int
	err := db.DB.QueryRowContext(ctx, `
        SELECT COUNT(*)
        FROM flea_purchase_requests
        WHERE seller_id = ? AND status = 'REQUESTED'
    `, userID).Scan(&pendingCount)
	if err != nil {
		return 0, 0, err
	}

	// 2. 進行中の取引件数
	// 条件: 自分が購入者 または 出品者
	// かつ ステータスが「完了(COMPLETED)」でも「キャンセル(CANCELLED)」でもない
	// (ACCEPTED, PAID, SHIPPED, RATED_BY_BUYER が対象)
	var activeCount int
	err = db.DB.QueryRowContext(ctx, `
        SELECT COUNT(*)
        FROM flea_transactions
        WHERE (buyer_id = ? OR seller_id = ?)
          AND status NOT IN ('COMPLETED', 'CANCELLED')
    `, userID, userID).Scan(&activeCount)
	if err != nil {
		return 0, 0, err
	}

	return pendingCount, activeCount, nil
}

// ListFleaTransactionsBySeller: 出品者側の取引一覧（売れたものリスト）
func (db *Database) ListFleaTransactionsBySeller(
	ctx context.Context,
	sellerID string,
	status *string,
	limit, offset int,
) ([]utils.FleaTransactionRow, int, error) {
	if db.DB == nil {
		return nil, 0, errors.New("db not ready")
	}
	sellerID = strings.TrimSpace(sellerID)
	// ... (基本チェックは省略、ByBuyerと同じ)

	where := "seller_id = ?"
	args := []any{sellerID}

	if status != nil && strings.TrimSpace(*status) != "" {
		st := utils.NormalizeEnum(*status)
		where += " AND status = ?"
		args = append(args, st)
	}

	// total取得
	var total int
	if err := db.DB.QueryRowContext(ctx, `SELECT COUNT(*) FROM flea_transactions WHERE `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// list取得
	args = append(args, limit, offset)
	rows, err := db.DB.QueryContext(ctx, `
        SELECT id, purchase_request_id, item_id, buyer_id, seller_id, address_id,
               shipping_method, shipping_fee_type, price_item, price_shipping,
               payment_provider, payment_id, payment_status, status,
               shipped_at, completed_at, created_at, updated_at
          FROM flea_transactions
         WHERE `+where+`
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?
    `, args...)
	// ... (Scan処理は ByBuyer と同じなので省略可、もしくはコピペ)
	// ※戻り値の処理を書いてください
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	// (Scan部分は省略せずに書くなら ByBuyer の中身と同じです)
	var list []utils.FleaTransactionRow
	// ... (ループ処理) ...
	return list, total, nil
}

// ListActiveFleaTransactions: 進行中の取引一覧（商品情報付き）
func (db *Database) ListActiveFleaTransactions(
	ctx context.Context,
	userID string,
	limit, offset int,
) ([]utils.ActiveTransactionResponse, error) {

	where := `(t.buyer_id = ? OR t.seller_id = ?) AND t.status NOT IN ('COMPLETED', 'CANCELLED')`
	args := []any{userID, userID, limit, offset}

	query := `
        SELECT 
            t.id, 
            t.item_id,
			t.purchase_request_id,
            COALESCE(i.name, '') AS item_name, 
            COALESCE(i.main_image_url, '') AS item_image_url,
            t.price_item + t.price_shipping AS total_price,
            t.status, 
            t.seller_id,
            t.updated_at
        FROM flea_transactions t
        JOIN flea_items i ON t.item_id = i.id
        WHERE ` + where + `
        ORDER BY t.updated_at DESC
        LIMIT ? OFFSET ?
    `

	rows, err := db.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []utils.ActiveTransactionResponse

	for rows.Next() {
		var it utils.ActiveTransactionResponse // ★ここで宣言した 'it' を使います

		var sellerID string // 計算用の一時変数
		var itemID int64    // 使わないがSQLの並び順的に受ける必要がある変数
		var updated time.Time

		// ★個別の変数ではなく、itの中身に直接Scanする
		if err := rows.Scan(
			&it.ID,
			&itemID,
			&it.PurchaseRequestID,
			&it.ItemName,
			&it.ItemImageURL,
			&it.Price,
			&it.Status,
			&sellerID,
			&updated,
		); err != nil {
			return nil, err
		}

		// 取得後に計算が必要なフィールドを埋める
		it.IsSeller = (sellerID == userID)
		it.UpdatedAt = updated.UTC().Format(time.RFC3339)

		list = append(list, it)
	}

	return list, nil
}

// ListCompletedFleaTransactions: 完了・キャンセル済みの取引一覧（履歴用）
func (db *Database) ListCompletedFleaTransactions(
	ctx context.Context,
	userID string,
	limit, offset int,
) ([]utils.ActiveTransactionResponse, error) {

	// ★条件: 自分が関わっていて、かつステータスが「完了(COMPLETED)」または「キャンセル(CANCELLED)」
	where := `(t.buyer_id = ? OR t.seller_id = ?) AND t.status IN ('COMPLETED', 'CANCELLED')`
	args := []any{userID, userID, limit, offset}

	query := `
        SELECT 
            t.id, 
            t.item_id, 
            t.purchase_request_id, -- 構造体に合わせて追加
            COALESCE(i.name, '') AS item_name, 
            COALESCE(i.main_image_url, '') AS item_image_url,
            t.price_item + t.price_shipping AS total_price,
            t.status, 
            t.seller_id,
            t.updated_at
        FROM flea_transactions t
        JOIN flea_items i ON t.item_id = i.id
        WHERE ` + where + `
        ORDER BY t.updated_at DESC
        LIMIT ? OFFSET ?
    `

	rows, err := db.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []utils.ActiveTransactionResponse

	for rows.Next() {
		var it utils.ActiveTransactionResponse
		var sellerID string
		var itemID int64
		var updated time.Time

		if err := rows.Scan(
			&it.ID,
			&itemID,
			&it.PurchaseRequestID, // 追加
			&it.ItemName,
			&it.ItemImageURL,
			&it.Price,
			&it.Status,
			&sellerID,
			&updated,
		); err != nil {
			return nil, err
		}

		it.IsSeller = (sellerID == userID)
		it.UpdatedAt = updated.UTC().Format(time.RFC3339)
		list = append(list, it)
	}
	return list, nil
}
