package sql

import (
	"animaloop/utils"
	"fmt"
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

// 指定ユーザー(出品者)へのレビューを取得
func (d *Database) GetUserReviews(sellerID string, limit int) ([]utils.UserReviewResponse, error) {
	// flea_reviews テーブルを使用
	// usersテーブルを結合してレビュアーの名前とアイコンを取得
	// flea_itemsテーブルを結合して商品名を取得
	query := `
        SELECT 
            r.id, 
            r.rating, 
            r.comment, 
            r.created_at,
            u.name AS reviewer_name,
            u.icon_url AS reviewer_icon_url,
            COALESCE(i.name, '削除された商品') AS item_name
        FROM flea_reviews r
        JOIN users u ON r.reviewer_id = u.id
        LEFT JOIN flea_items i ON r.item_id = i.id
        WHERE r.reviewee_id = ? 
        ORDER BY r.created_at DESC
    `
	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	var reviews []utils.UserReviewResponse
	err := d.DB.Select(&reviews, query, sellerID)
	return reviews, err
}

// レビューの平均点と件数を取得
func (d *Database) GetUserRatingStats(userID string) (float64, int, error) {
	var stats struct {
		AvgRating float64 `db:"avg_rating"`
		Count     int     `db:"count"`
	}
	// flea_reviews テーブルから集計
	query := `
        SELECT 
            COALESCE(AVG(rating), 0) as avg_rating, 
            COUNT(*) as count 
        FROM flea_reviews 
        WHERE reviewee_id = ?
    `
	err := d.DB.Get(&stats, query, userID)
	return stats.AvgRating, stats.Count, err
}
