package sql

import (
	"context"
	"database/sql"
	"errors"
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

// ListPendingFleaPurchaseRequests: 自分宛ての「承認待ち」申請一覧を取得（購入者名付き）
func (db *Database) ListPendingFleaPurchaseRequests(ctx context.Context, sellerID string) ([]utils.PurchaseRequestResponse, error) {
	if db.DB == nil {
		return nil, errors.New("db not ready")
	}

	// ユーザー(u)を結合して名前を取る
	// ステータスは 'REQUESTED' (承認待ち) に限定
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
        LEFT JOIN users u ON u.id = pr.buyer_id -- 退会済みでも取得できるようにLEFT JOIN
        WHERE pr.seller_id = ? 
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

	return list, nil
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
