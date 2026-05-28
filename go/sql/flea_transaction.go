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

// txRowColumns: FleaTransactionRow を埋めるための共通 SELECT 列。
// ByBuyer / BySeller で取得列がバラバラだったのを統一する。
const txRowColumns = `
	id, purchase_request_id, item_id, buyer_id, seller_id, address_id,
	shipping_method, shipping_fee_type, price_item, price_shipping,
	payment_provider, payment_id, payment_status, status,
	shipped_at, completed_at, created_at, updated_at`

// scanTxRow: 上記 txRowColumns の並びで 1 行を FleaTransactionRow に読み込む共通ヘルパー。
func scanTxRow(rows *sql.Rows) (utils.FleaTransactionRow, error) {
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
		return it, err
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

	return it, nil
}

// listTransactionsByField: buyer_id / seller_id 共通の一覧取得処理。
// where 句を文字列連結で組み立てつつ、PostgreSQL の $n プレースホルダを正しく採番する。
func (db *Database) listTransactionsByField(
	ctx context.Context,
	field string, // "buyer_id" or "seller_id"
	id string,
	status *string,
	limit, offset int,
) ([]utils.FleaTransactionRow, int, error) {

	if db.DB == nil {
		return nil, 0, errors.New("db not ready")
	}
	id = strings.TrimSpace(id)
	if id == "" {
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

	// where 句と引数を組み立てる ($1 から順に採番)
	where := field + " = $1"
	args := []any{id}
	if status != nil && strings.TrimSpace(*status) != "" {
		st := utils.NormalizeEnum(*status)
		where += " AND status = $2"
		args = append(args, st)
	}

	// total
	var total int
	if err := db.DB.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM flea_transactions WHERE `+where,
		args...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	// list (LIMIT / OFFSET のプレースホルダ番号は現在の args 長から続ける)
	limitPos := len(args) + 1
	offsetPos := len(args) + 2
	listArgs := append(append([]any{}, args...), limit, offset)

	query := fmt.Sprintf(`
		SELECT %s
		  FROM flea_transactions
		 WHERE %s
		 ORDER BY created_at DESC
		 LIMIT $%d OFFSET $%d
	`, txRowColumns, where, limitPos, offsetPos)

	rows, err := db.DB.QueryContext(ctx, query, listArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []utils.FleaTransactionRow
	for rows.Next() {
		it, err := scanTxRow(rows)
		if err != nil {
			return nil, 0, err
		}
		list = append(list, it)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return list, total, nil
}

// ListFleaTransactionsByBuyer: 購入者側の取引一覧（status 絞り込み可、totalも返す）
func (db *Database) ListFleaTransactionsByBuyer(
	ctx context.Context,
	buyerID string,
	status *string,
	limit, offset int,
) ([]utils.FleaTransactionRow, int, error) {
	return db.listTransactionsByField(ctx, "buyer_id", buyerID, status, limit, offset)
}

// ListFleaTransactionsBySeller: 出品者側の取引一覧（売れたものリスト）
// ※ 以前は Scan ループが未実装で常に空を返していたため、共通処理で補完。
func (db *Database) ListFleaTransactionsBySeller(
	ctx context.Context,
	sellerID string,
	status *string,
	limit, offset int,
) ([]utils.FleaTransactionRow, int, error) {
	return db.listTransactionsByField(ctx, "seller_id", sellerID, status, limit, offset)
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
	var cancelReason, shippingCarrier, trackingNumber, paidAt sql.NullString

	err := db.DB.QueryRowContext(ctx, `
		SELECT id, purchase_request_id, item_id, buyer_id, seller_id, address_id,
		       shipping_method, shipping_fee_type, price_item, price_shipping,
		       payment_provider, payment_id, payment_status, status,
		       cancellation_reason, shipping_carrier, tracking_number,
		       use_point, point_rate, fee_amount, profit_amount,
		       paid_at, shipped_at, completed_at, created_at, updated_at
		  FROM flea_transactions
		 WHERE purchase_request_id = $1
		   AND (buyer_id = $2 OR seller_id = $3)
		 LIMIT 1
	`, reqID, userID, userID).Scan(
		&out.ID, &out.PurchaseRequestID, &out.ItemID, &out.BuyerID, &out.SellerID, &out.AddressID,
		&out.ShippingMethod, &out.ShippingFeeType, &out.PriceItem, &out.PriceShipping,
		&payProv, &payID, &out.PaymentStatus, &out.Status,
		&cancelReason, &shippingCarrier, &trackingNumber,
		&out.UsePoint, &out.PointRate, &out.FeeAmount, &out.ProfitAmount,
		&paidAt, &shipped, &completed, &created, &updated,
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
	if cancelReason.Valid {
		s := cancelReason.String
		out.CancellationReason = &s
	}
	if shippingCarrier.Valid {
		s := shippingCarrier.String
		out.ShippingCarrier = &s
	}
	if trackingNumber.Valid {
		s := trackingNumber.String
		out.TrackingNumber = &s
	}
	if paidAt.Valid {
		s := paidAt.String
		out.PaidAt = &s
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

// GetFleaTransactionByID: 取引詳細（購入者 or 出品者のみ閲覧可）
func (db *Database) GetFleaTransactionByID(ctx context.Context, userID string, txID uint64) (*utils.FleaTransactionRow, error) {
	out := new(utils.FleaTransactionRow)
	if db.DB == nil {
		return out, errors.New("db not ready")
	}
	userID = strings.TrimSpace(userID)
	if userID == "" || txID == 0 {
		return out, errors.New("bad input")
	}

	var shipped, completed sql.NullTime
	var created, updated time.Time
	var payProv, payID sql.NullString
	var cancelReason, shippingCarrier, trackingNumber, paidAt sql.NullString

	err := db.DB.QueryRowContext(ctx, `
		SELECT id, purchase_request_id, item_id, buyer_id, seller_id, address_id,
		       shipping_method, shipping_fee_type, price_item, price_shipping,
		       payment_provider, payment_id, payment_status, status,
		       cancellation_reason, shipping_carrier, tracking_number,
		       use_point, point_rate, fee_amount, profit_amount,
		       paid_at, shipped_at, completed_at, created_at, updated_at
		  FROM flea_transactions
		 WHERE id = $1
		   AND (buyer_id = $2 OR seller_id = $3)
		 LIMIT 1
	`, txID, userID, userID).Scan(
		&out.ID, &out.PurchaseRequestID, &out.ItemID, &out.BuyerID, &out.SellerID, &out.AddressID,
		&out.ShippingMethod, &out.ShippingFeeType, &out.PriceItem, &out.PriceShipping,
		&payProv, &payID, &out.PaymentStatus, &out.Status,
		&cancelReason, &shippingCarrier, &trackingNumber,
		&out.UsePoint, &out.PointRate, &out.FeeAmount, &out.ProfitAmount,
		&paidAt, &shipped, &completed, &created, &updated,
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
	if cancelReason.Valid {
		s := cancelReason.String
		out.CancellationReason = &s
	}
	if shippingCarrier.Valid {
		s := shippingCarrier.String
		out.ShippingCarrier = &s
	}
	if trackingNumber.Valid {
		s := trackingNumber.String
		out.TrackingNumber = &s
	}
	if paidAt.Valid {
		s := paidAt.String
		out.PaidAt = &s
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

// UpdateFleaTransactionPaidTx: 決済完了に伴いステータスと冪等性キーを更新する
func (d *Database) UpdateFleaTransactionPaidTx(
	ctx context.Context,
	tx *sql.Tx,
	txID uint64,
	provider string,
	paymentID string,
	usePoint int64,
	pointRate int,
	idempotencyKey string,
) error {
	const q = `
        UPDATE flea_transactions
        SET
            payment_status = 'PAID',
            status = 'PAID',
            payment_provider = $1,
            payment_id = $2,
            use_point = $3,
            point_rate = $4,
            idempotency_key = $5,
            paid_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6 AND status != 'PAID'
    `

	res, err := tx.ExecContext(ctx, q, provider, paymentID, usePoint, pointRate, idempotencyKey, txID)
	if err != nil {
		return fmt.Errorf("transaction update failed: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("target transaction not found or already paid (id=%d)", txID)
	}

	return nil
}

// GetIdempotencyKey
func (d *Database) GetIdempotencyKey(ctx context.Context, txID uint64) (string, error) {
	var key sql.NullString
	err := d.DB.QueryRowContext(ctx, `
        SELECT idempotency_key
        FROM flea_transactions
        WHERE id = $1
    `, txID).Scan(&key)
	if err != nil {
		return "", err
	}
	if !key.Valid {
		return "", nil
	}
	return key.String, nil
}

// MarkFleaTransactionShipped: 発送完了
func (d *Database) MarkFleaTransactionShipped(tx *sql.Tx, txID uint64, shippingCarrier string, trackingNumber string) error {
	const q = `
		UPDATE flea_transactions
		SET
			status = 'SHIPPED',
			shipping_carrier = $1,
			tracking_number = $2,
			shipped_at = CURRENT_TIMESTAMP,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND status = 'PAID'
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

// MarkFleaTransactionRatedByBuyer: 購入者が評価した状態にする
func (d *Database) MarkFleaTransactionRatedByBuyer(tx *sql.Tx, txID uint64) error {
	const q = `
        UPDATE flea_transactions
        SET
            status = 'RATED_BY_BUYER',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'SHIPPED'
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
            fee_amount = $1,
            profit_amount = $2,
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE
            id = $3
            AND status = 'RATED_BY_BUYER'
    `

	res, err := tx.Exec(q, feeAmount, profitAmount, txID)
	if err != nil {
		return fmt.Errorf("transaction update failed: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("target transaction not found or invalid state (id=%d)", txID)
	}

	// アイテムのステータスを売却済みに変更する
	const q2 = `
		UPDATE flea_items
		SET status = $1
		WHERE id = (
			SELECT item_id FROM flea_transactions WHERE id = $2
		) AND status = $3
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
	var pendingCount int
	err := db.DB.QueryRowContext(ctx, `
        SELECT COUNT(*)
        FROM flea_purchase_requests
        WHERE seller_id = $1 AND status = 'REQUESTED'
    `, userID).Scan(&pendingCount)
	if err != nil {
		return 0, 0, err
	}

	// 2. 進行中の取引件数
	var activeCount int
	err = db.DB.QueryRowContext(ctx, `
        SELECT COUNT(*)
        FROM flea_transactions
        WHERE (buyer_id = $1 OR seller_id = $2)
          AND status NOT IN ('COMPLETED', 'CANCELLED')
    `, userID, userID).Scan(&activeCount)
	if err != nil {
		return 0, 0, err
	}

	return pendingCount, activeCount, nil
}

// listActiveOrCompleted: 進行中 / 完了履歴 の共通取得処理。
// statusFilter には "NOT IN (...)" または "IN (...)" の SQL 断片を渡す。
func (db *Database) listActiveOrCompleted(
	ctx context.Context,
	userID string,
	statusFilter string,
	limit, offset int,
) ([]utils.ActiveTransactionResponse, error) {

	where := `(t.buyer_id = $1 OR t.seller_id = $2) AND t.status ` + statusFilter
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
        LIMIT $3 OFFSET $4
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

		it.IsSeller = (sellerID == userID)
		it.UpdatedAt = updated.UTC().Format(time.RFC3339)
		list = append(list, it)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return list, nil
}

// ListActiveFleaTransactions: 進行中の取引一覧（商品情報付き）
func (db *Database) ListActiveFleaTransactions(
	ctx context.Context,
	userID string,
	limit, offset int,
) ([]utils.ActiveTransactionResponse, error) {
	return db.listActiveOrCompleted(ctx, userID, `NOT IN ('COMPLETED', 'CANCELLED')`, limit, offset)
}

// ListCompletedFleaTransactions: 完了・キャンセル済みの取引一覧（履歴用）
func (db *Database) ListCompletedFleaTransactions(
	ctx context.Context,
	userID string,
	limit, offset int,
) ([]utils.ActiveTransactionResponse, error) {
	return db.listActiveOrCompleted(ctx, userID, `IN ('COMPLETED', 'CANCELLED')`, limit, offset)
}

// CancelFleaTransaction: 取引をキャンセルし、理由を保存する
func (d *Database) CancelFleaTransaction(txID uint64, userID, reason string) error {
	tx, err := d.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. 取引ステータス更新 & キャンセル理由保存
	res, err := tx.Exec(`
        UPDATE flea_transactions
        SET
            status = 'CANCELLED',
            cancellation_reason = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND status NOT IN ('COMPLETED', 'CANCELLED')
    `, reason, txID)
	if err != nil {
		return fmt.Errorf("failed to cancel transaction: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("transaction not found or cannot be cancelled")
	}

	// 2. アイテムID と 購入申請ID を取得
	var itemID uint64
	var requestID uint64
	err = tx.QueryRow("SELECT item_id, purchase_request_id FROM flea_transactions WHERE id = $1", txID).Scan(&itemID, &requestID)
	if err != nil {
		return fmt.Errorf("failed to get transaction details: %w", err)
	}

	// 3. アイテムを「下書き(非公開)」に戻す
	_, err = tx.Exec(`UPDATE flea_items SET status = $1 WHERE id = $2`, config.FleaItemStatusDraft, itemID)
	if err != nil {
		return fmt.Errorf("failed to revert item status: %w", err)
	}

	// 4. システムメッセージとしてチャットに「キャンセルされました」を残す
	chatMsg := fmt.Sprintf("取引がキャンセルされました。\n理由: %s", reason)
	_, err = tx.Exec(`
        INSERT INTO flea_transaction_messages (purchase_request_id, user_id, message, is_system, created_at)
        VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
    `, requestID, userID, chatMsg)
	if err != nil {
		return fmt.Errorf("failed to insert system message: %w", err)
	}

	return tx.Commit()
}