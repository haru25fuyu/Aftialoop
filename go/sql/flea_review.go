package sql

import (
	"animaloop/utils"
	"context"
	"database/sql"
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
	// UTC_TIMESTAMP() -> CURRENT_TIMESTAMP, ? -> $n
	const qReview = `
        INSERT INTO flea_reviews (transaction_id, reviewer_id, reviewee_id, item_id, rating, comment, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `
	// reviewee_id (評価される人) は出品者 (txData.SellerID)
	_, err = d.DB.Exec(qReview, txID, buyerID, SellerID, itemID, Rating, Comment)
	if err != nil {
		log.Println("Error saving review:", err)
		return err
	}

	return nil
}

// GetUserReviews: 指定したユーザー(reviewee)への評価を取得
func (db *Database) GetUserReviews(ctx context.Context, revieweeID string, limit, offset int) ([]utils.UserReviewResponse, error) {
	const q = `
        SELECT
            r.id,
            r.rating,
            r.comment,
            r.created_at,
            u.name AS reviewer_name,
            u.icon_url AS reviewer_icon_url,
            i.name AS item_name
        FROM flea_reviews AS r
        JOIN users AS u ON u.id = r.reviewer_id
        LEFT JOIN flea_items AS i ON i.id = r.item_id
        WHERE r.reviewee_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
    `

	rows, err := db.DB.QueryContext(ctx, q, revieweeID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []utils.UserReviewResponse
	for rows.Next() {
		var r utils.UserReviewResponse
		var comment sql.NullString
		var reviewerIcon sql.NullString
		var itemName sql.NullString

		if err := rows.Scan(
			&r.ID,
			&r.Rating,
			&comment,
			&r.CreatedAt,
			&r.ReviewerName,
			&reviewerIcon,
			&itemName,
		); err != nil {
			return nil, err
		}

		if comment.Valid {
			r.Comment = comment.String
		}
		if reviewerIcon.Valid {
			s := reviewerIcon.String
			r.ReviewerIconURL = &s
		}
		if itemName.Valid {
			s := itemName.String
			r.ItemName = &s
		}

		reviews = append(reviews, r)
	}

	return reviews, nil
}

// GetUserRatingStats: レビューの平均点と件数を取得
func (d *Database) GetUserRatingStats(userID string) (float64, int, error) {
	var stats struct {
		AvgRating float64 `db:"avg_rating"`
		Count     int     `db:"count"`
	}
	query := `
        SELECT
            COALESCE(AVG(rating), 0) as avg_rating,
            COUNT(*) as count
        FROM flea_reviews
        WHERE reviewee_id = $1
    `
	err := d.DB.Get(&stats, query, userID)
	return stats.AvgRating, stats.Count, err
}
