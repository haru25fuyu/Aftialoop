package sql

import (
	"log"
)

// ============================================================
// フリマ取引レビュー関係
// ============================================================

// SaveFleaTransactionReview: 取引レビューを保存する
func (d *Database) SaveFleaTransactionReview(
	txID uint64,
	itemID uint64,
	buyerID string,
	SellerID string,
	Rating int,
	Comment string) (err error) {
	const qReview = `
        INSERT INTO flea_reviews (transaction_id, reviewer_id, reviewee_id, item_id, rating, comment, created_at)
        VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
    `
	// reviewee_id (評価される人) は出品者 (txData.SellerID)
	_, err = d.DB.Exec(qReview, txID, buyerID, SellerID, itemID, Rating, Comment)
	if err != nil {
		log.Println("Error saving review:", err)
		return err
	}

	return nil
}
