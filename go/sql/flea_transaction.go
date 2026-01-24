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

// CreateFleaPurchaseRequest: 購入申請を作成（契約前）
func (db *Database) CreateFleaPurchaseRequest(
	ctx context.Context,
	buyerID string,
	itemID int64,
	addressID int,
	shippingMethodPref string,
	shippingFeePref string,
	note *string,
) (uint64, error) {

	if db.DB == nil {
		return 0, errors.New("db not ready")
	}
	buyerID = strings.TrimSpace(buyerID)
	if buyerID == "" || itemID <= 0 || addressID <= 0 {
		return 0, errors.New("bad input")
	}

	shippingMethodPref = utils.NormalizeEnum(shippingMethodPref)
	shippingFeePref = utils.NormalizeEnum(shippingFeePref)

	if !utils.IsOneOf(shippingMethodPref, "SELLER_CHOICE", "ANONYMIZED", "MEETUP", "DELIVERY") {
		return 0, errors.New("invalid shipping method pref")
	}
	if !utils.IsOneOf(shippingFeePref, "OK_EITHER", "INCLUDED", "COD") {
		return 0, errors.New("invalid shipping fee pref")
	}

	// 出品者取得（flea_items のカラム名はあなたの環境の実名に合わせている：user_id）
	var sellerID string
	sellerIDPtr, err := db.GetFleaMarketSellerID(itemID)

	if err == nil && sellerIDPtr != nil {
		sellerID = *sellerIDPtr
	} else {
		return 0, errors.New("item not found")
	}

	if sellerID == buyerID {
		return 0, errors.New("forbidden")
	}

	var noteVal any = nil
	if note != nil {
		s := strings.TrimSpace(*note)
		if s != "" {
			if len([]rune(s)) > 500 {
				return 0, errors.New("note too long")
			}
			noteVal = s
		}
	}

	res, err := db.DB.ExecContext(ctx, `
		INSERT INTO flea_purchase_requests
			(item_id, buyer_id, seller_id, address_id, shipping_method_pref, shipping_fee_pref, note, status)
		VALUES
			(?, ?, ?, ?, ?, ?, ?, 'REQUESTED')
	`, itemID, buyerID, sellerID, addressID, shippingMethodPref, shippingFeePref, noteVal)
	if err != nil {
		return 0, err
	}

	lastID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	//　アイテムのステータスを変更する
	_, err = db.DB.ExecContext(ctx, `
		UPDATE flea_items
		   SET status = ?
		 WHERE id = ? AND status = 0 AND deleted_at IS NULL
	`, config.FleaItemStatusTrading, itemID)
	if err != nil {
		return 0, err
	}

	return uint64(lastID), nil
}

// GetFleaPurchaseRequestByID: 購入申請詳細（購入者 or 出品者のみ閲覧可）
func (db *Database) GetFleaPurchaseRequestByID(ctx context.Context, userID string, reqID uint64) (utils.FleaPurchaseRequestRow, error) {
	var out utils.FleaPurchaseRequestRow
	if db.DB == nil {
		return out, errors.New("db not ready")
	}
	userID = strings.TrimSpace(userID)
	if userID == "" || reqID == 0 {
		return out, errors.New("bad input")
	}

	var created, updated time.Time
	var note sql.NullString

	err := db.DB.QueryRowContext(ctx, `
		SELECT id, item_id, buyer_id, seller_id, address_id,
		       shipping_method_pref, shipping_fee_pref, note, status,
		       created_at, updated_at
		  FROM flea_purchase_requests
		 WHERE id = ?
		   AND (buyer_id = ? OR seller_id = ?)
		 LIMIT 1
	`, reqID, userID, userID).Scan(
		&out.ID, &out.ItemID, &out.BuyerID, &out.SellerID, &out.AddressID,
		&out.ShippingMethodPref, &out.ShippingFeePref, &note, &out.Status,
		&created, &updated,
	)
	if err != nil {
		return out, err
	}

	if note.Valid {
		s := note.String
		out.Note = &s
	}

	out.CreatedAt = created.UTC().Format(time.RFC3339)
	out.UpdatedAt = updated.UTC().Format(time.RFC3339)
	return out, nil
}

// CancelFleaPurchaseRequest: 購入者が REQUESTED の間だけキャンセル
func (db *Database) CancelFleaPurchaseRequest(ctx context.Context, buyerID string, reqID uint64) error {
	if db.DB == nil {
		return errors.New("db not ready")
	}
	buyerID = strings.TrimSpace(buyerID)
	if buyerID == "" || reqID == 0 {
		return errors.New("bad input")
	}

	res, err := db.DB.ExecContext(ctx, `
		UPDATE flea_purchase_requests
		   SET status = 'CANCELLED'
		 WHERE id = ? AND buyer_id = ? AND status = 'REQUESTED'
	`, reqID, buyerID)
	if err != nil {
		return err
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		return errors.New("invalid state")
	}
	return nil
}

// ------------------------------
// Flea Transaction
// ------------------------------

// AcceptFleaPurchaseRequest: 出品者が承諾して transaction を作成
func (db *Database) AcceptFleaPurchaseRequest(
	ctx context.Context,
	sellerID string,
	reqID uint64,
	shippingMethod string,
	shippingFeeType string,
	priceItem uint32,
	priceShipping uint32,
) (uint64, error) {

	if db.DB == nil {
		return 0, errors.New("db not ready")
	}
	sellerID = strings.TrimSpace(sellerID)
	if sellerID == "" || reqID == 0 || priceItem == 0 {
		return 0, errors.New("bad input")
	}

	shippingMethod = utils.NormalizeEnum(shippingMethod)
	shippingFeeType = utils.NormalizeEnum(shippingFeeType)

	if !utils.IsOneOf(shippingMethod, "DELIVERY", "ANONYMIZED", "MEETUP") {
		return 0, errors.New("invalid shipping method")
	}
	if !utils.IsOneOf(shippingFeeType, "INCLUDED", "COD") {
		return 0, errors.New("invalid shipping fee type")
	}

	tx, err := db.DB.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return 0, err
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	// 申請行ロック
	var prID uint64
	var itemID int64
	var buyerID string
	var prSellerID string
	var addressID int
	var status string

	err = tx.QueryRowContext(ctx, `
		SELECT id, item_id, buyer_id, seller_id, address_id, status
		  FROM flea_purchase_requests
		 WHERE id = ?
		 FOR UPDATE
	`, reqID).Scan(&prID, &itemID, &buyerID, &prSellerID, &addressID, &status)
	if err != nil {
		return 0, err
	}

	if prSellerID != sellerID {
		return 0, errors.New("forbidden")
	}
	if status != "REQUESTED" {
		return 0, errors.New("purchase request already handled")
	}

	// 申請をACCEPTEDへ
	res, err := tx.ExecContext(ctx, `
		UPDATE flea_purchase_requests
		   SET status = 'ACCEPTED'
		 WHERE id = ? AND status = 'REQUESTED'
	`, reqID)
	if err != nil {
		return 0, err
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		return 0, errors.New("invalid state")
	}

	// transaction 作成（purchase_request_id UNIQUEで二重作成防止）
	res, err = tx.ExecContext(ctx, `
		INSERT INTO flea_transactions
			(purchase_request_id, item_id, buyer_id, seller_id, address_id,
			 shipping_method, shipping_fee_type, price_item, price_shipping,
			 payment_status, status)
		VALUES
			(?, ?, ?, ?, ?, ?, ?, ?, ?, 'NONE', 'ACCEPTED')
	`, reqID, itemID, buyerID, prSellerID, addressID,
		shippingMethod, shippingFeeType, priceItem, priceShipping)
	if err != nil {
		if utils.IsDuplicateErr(err) {
			return 0, errors.New("transaction already exists")
		}
		return 0, err
	}

	lastID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	committed = true

	return uint64(lastID), nil
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

	err := db.DB.QueryRowContext(ctx, `
		SELECT id, purchase_request_id, item_id, buyer_id, seller_id, address_id,
		       shipping_method, shipping_fee_type, price_item, price_shipping,
		       payment_provider, payment_id, payment_status, status,
		       fee_amount, profit_amount,use_point,point_rate,
		       shipped_at, completed_at, created_at, updated_at
		  FROM flea_transactions
		 WHERE id = ?
		   AND (buyer_id = ? OR seller_id = ?)
		 LIMIT 1
	`, txID, userID, userID).Scan(
		&out.ID, &out.PurchaseRequestID, &out.ItemID, &out.BuyerID, &out.SellerID, &out.AddressID,
		&out.ShippingMethod, &out.ShippingFeeType, &out.PriceItem, &out.PriceShipping,
		&payProv, &payID, &out.PaymentStatus, &out.Status,
		&out.FeeAmount, &out.ProfitAmount, &out.UsePoint, &out.PointRate,
		&shipped, &completed, &created, &updated,
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

	return nil
}
