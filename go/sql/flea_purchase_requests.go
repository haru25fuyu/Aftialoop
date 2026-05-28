package sql

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"animaloop/config"
	"animaloop/utils"
)

// ------------------------------
// Flea Purchase Request
// ------------------------------

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

	// 出品者取得
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

	// ★修正: LastInsertId は PostgreSQL では使えないので RETURNING id + QueryRow で受け取る。
	var lastID uint64
	err = db.DB.QueryRowContext(ctx, `
		INSERT INTO flea_purchase_requests
			(item_id, buyer_id, seller_id, address_id, shipping_method_pref, shipping_fee_pref, note, status)
		VALUES
			($1, $2, $3, $4, $5, $6, $7, 'REQUESTED')
		RETURNING id
	`, itemID, buyerID, sellerID, addressID, shippingMethodPref, shippingFeePref, noteVal).Scan(&lastID)
	if err != nil {
		return 0, err
	}

	// アイテムのステータスを変更する
	_, err = db.DB.ExecContext(ctx, `
		UPDATE flea_items
		   SET status = $1
		 WHERE id = $2 AND status = 0 AND deleted_at IS NULL
	`, config.FleaItemStatusTrading, itemID)
	if err != nil {
		return 0, err
	}

	return lastID, nil
}

// ListFleaPurchaseRequestsBySeller: 販売者側の申請一覧（status 絞り込み可、totalも返す）
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

	// where 句と引数を $n で組み立てる
	where := "pr.seller_id = $1"
	args := []any{sellerID}
	if status != nil && strings.TrimSpace(*status) != "" {
		st := utils.NormalizeEnum(*status)
		where += " AND pr.status = $2"
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
	limitPos := len(args) + 1
	offsetPos := len(args) + 2
	args2 := append(append([]any{}, args...), limit, offset)

	query := fmt.Sprintf(`
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
		WHERE %s
		ORDER BY pr.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, limitPos, offsetPos)

	rows, err := db.DB.QueryContext(ctx, query, args2...)
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

// ListPendingFleaPurchaseRequests: 自分宛ての「承認待ち」申請一覧を取得（購入者名付き）
func (db *Database) ListPendingFleaPurchaseRequests(ctx context.Context, sellerID string) ([]utils.PurchaseRequestResponse, error) {
	if db.DB == nil {
		return nil, errors.New("db not ready")
	}

	query := `
        SELECT
            pr.id,
            pr.item_id,
            COALESCE(fi.name, '') AS item_name,
            COALESCE(fi.main_image_url, '') AS item_image_url,
            pr.buyer_id,
            COALESCE(u.name, '退会済みユーザー') AS buyer_name,
            pr.created_at,
            pr.status
        FROM flea_purchase_requests pr
        JOIN flea_items fi ON fi.id = pr.item_id
        LEFT JOIN users u ON u.id = pr.buyer_id
        WHERE pr.seller_id = $1
          AND pr.status = 'REQUESTED'
        ORDER BY pr.created_at DESC
    `

	rows, err := db.DB.QueryContext(ctx, query, sellerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []utils.PurchaseRequestResponse
	for rows.Next() {
		var it utils.PurchaseRequestResponse
		var created time.Time

		if err := rows.Scan(
			&it.ID,
			&it.ItemID,
			&it.ItemName,
			&it.ItemMainImageURL,
			&it.BuyerID,
			&it.BuyerName,
			&created,
			&it.Status,
		); err != nil {
			return nil, err
		}

		it.CreatedAt = created.UTC().Format(time.RFC3339)
		list = append(list, it)
	}

	return list, rows.Err()
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
	var note, rejReason, withReason sql.NullString

	err := db.DB.QueryRowContext(ctx, `
        SELECT id, item_id, buyer_id, seller_id, address_id,
               shipping_method_pref, shipping_fee_pref, note, status,
               rejection_reason, withdrawal_reason,
               created_at, updated_at
          FROM flea_purchase_requests
         WHERE id = $1
           AND (buyer_id = $2 OR seller_id = $3)
         LIMIT 1
    `, reqID, userID, userID).Scan(
		&out.ID, &out.ItemID, &out.BuyerID, &out.SellerID, &out.AddressID,
		&out.ShippingMethodPref, &out.ShippingFeePref, &note, &out.Status,
		&rejReason, &withReason,
		&created, &updated,
	)
	if err != nil {
		return out, err
	}

	if note.Valid {
		s := note.String
		out.Note = &s
	}
	if rejReason.Valid {
		s := rejReason.String
		out.RejectionReason = &s
	}
	if withReason.Valid {
		s := withReason.String
		out.WithdrawalReason = &s
	}

	out.CreatedAt = created.UTC().Format(time.RFC3339)
	out.UpdatedAt = updated.UTC().Format(time.RFC3339)
	return out, nil
}

// ------------------------------
// Flea Transaction (申請の承諾)
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
		 WHERE id = $1
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
		 WHERE id = $1 AND status = 'REQUESTED'
	`, reqID)
	if err != nil {
		return 0, err
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		return 0, errors.New("invalid state")
	}

	// transaction 作成（purchase_request_id UNIQUE で二重作成防止）
	// ★修正: LastInsertId -> RETURNING id
	var lastID uint64
	err = tx.QueryRowContext(ctx, `
		INSERT INTO flea_transactions
			(purchase_request_id, item_id, buyer_id, seller_id, address_id,
			 shipping_method, shipping_fee_type, price_item, price_shipping,
			 payment_status, status)
		VALUES
			($1, $2, $3, $4, $5, $6, $7, $8, $9, 'NONE', 'ACCEPTED')
		RETURNING id
	`, reqID, itemID, buyerID, prSellerID, addressID,
		shippingMethod, shippingFeeType, priceItem, priceShipping).Scan(&lastID)
	if err != nil {
		if utils.IsDuplicateErr(err) {
			return 0, errors.New("transaction already exists")
		}
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	committed = true

	return lastID, nil
}

// RejectFleaPurchaseRequest: 購入申請を却下し、理由をチャットに残す
func (d *Database) RejectFleaPurchaseRequest(reqID uint64, userID, reason string) error {
	tx, err := d.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. ステータスを REJECTED に更新
	res, err := tx.Exec(`
        UPDATE flea_purchase_requests
        SET
            status = 'REJECTED',
            rejection_reason = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND status = 'REQUESTED'
    `, reason, reqID)
	if err != nil {
		return err
	}

	if n, _ := res.RowsAffected(); n == 0 {
		return fmt.Errorf("request not found or not in requested status")
	}

	// 2. チャットに理由をシステムメッセージとして保存
	msg := fmt.Sprintf("購入申請が却下されました。\n理由: %s", reason)
	_, err = tx.Exec(`
        INSERT INTO flea_transaction_messages (purchase_request_id, user_id, message, is_system, created_at)
        VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
    `, reqID, userID, msg)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// WithdrawFleaPurchaseRequest: 購入申請を取り下げ、理由をチャットに残す
func (d *Database) WithdrawFleaPurchaseRequest(reqID uint64, userID, reason string) error {
	tx, err := d.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. ステータスを WITHDRAWN に更新
	res, err := tx.Exec(`
        UPDATE flea_purchase_requests
        SET
            status = 'WITHDRAWN',
            withdrawal_reason = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND status = 'REQUESTED'
    `, reason, reqID)
	if err != nil {
		return err
	}

	if n, _ := res.RowsAffected(); n == 0 {
		return fmt.Errorf("request not found or not in requested status")
	}

	// 2. チャットに理由をシステムメッセージとして保存
	msg := fmt.Sprintf("購入申請が取り下げられました。\n理由: %s", reason)
	_, err = tx.Exec(`
        INSERT INTO flea_transaction_messages (purchase_request_id, user_id, message, is_system, created_at)
        VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
    `, reqID, userID, msg)
	if err != nil {
		return err
	}

	return tx.Commit()
}