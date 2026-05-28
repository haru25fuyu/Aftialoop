package sql

import (
	"animaloop/utils"
	"context"
)

// ============================================================
// SNS: フォロー・フォロワー関係
// ============================================================

// FollowUser: フォロー登録 (トランザクション + カウンターキャッシュ)
func (d *Database) FollowUser(ctx context.Context, followerID, followingID string) error {
	tx, err := d.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. follows に追加
	//   PostgreSQL: INSERT IGNORE は無いので ON CONFLICT DO NOTHING を使う。
	//   (follower_id, followee_id) が複合主キーである前提。
	res, err := tx.ExecContext(ctx, `
        INSERT INTO follows (follower_id, followee_id)
        VALUES ($1, $2)
        ON CONFLICT (follower_id, followee_id) DO NOTHING
    `, followerID, followingID)
	if err != nil {
		return err
	}

	// 既にフォロー済みだった場合(rows==0)は、カウントを増やさずに終了
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return nil
	}

	// 2. カウント更新 (自分: following +1)
	_, err = tx.ExecContext(ctx, `UPDATE users SET following_count = following_count + 1 WHERE id = $1`, followerID)
	if err != nil {
		return err
	}

	// 3. カウント更新 (相手: followers +1)
	_, err = tx.ExecContext(ctx, `UPDATE users SET followers_count = followers_count + 1 WHERE id = $1`, followingID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// UnfollowUser: フォロー解除
func (d *Database) UnfollowUser(ctx context.Context, followerID, followingID string) error {
	tx, err := d.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.ExecContext(ctx, `DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2`, followerID, followingID)
	if err != nil {
		return err
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return nil // そもそもフォローしてなかった
	}

	// カウント減少 (0未満にならないように GREATEST を使う。GREATEST は PostgreSQL にも存在)
	_, err = tx.ExecContext(ctx, `UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = $1`, followerID)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = $1`, followingID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// IsFollowing: フォロー状態確認
func (d *Database) IsFollowing(ctx context.Context, followerID, followingID string) (bool, error) {
	var count int
	err := d.DB.QueryRowContext(ctx, `
        SELECT COUNT(*) FROM follows WHERE follower_id = $1 AND followee_id = $2
    `, followerID, followingID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// ============================================================
// SNS: 投稿 (つぶやき)
// ============================================================

// CreatePost: 投稿を作成
func (d *Database) CreatePost(post utils.UserPost) error {
	// NOW() -> CURRENT_TIMESTAMP, ? -> $n
	_, err := d.DB.Exec(`
        INSERT INTO user_posts (user_id, body, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
    `, post.UserID, post.Body)
	return err
}

// ============================================================
// SNS: 通報・ブロック
// ============================================================

// GetBlockedUsers: ブロックしているユーザーの一覧を取得
func (d *Database) GetBlockedUsers(ctx context.Context, userID string) ([]utils.User, error) {
	query := `
		SELECT u.id, u.name, u.icon_url
		FROM user_blocks b
		JOIN users u ON b.blocked_id = u.id
		WHERE b.blocker_id = $1
		ORDER BY b.created_at DESC
	`
	rows, err := d.DB.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []utils.User
	for rows.Next() {
		var u utils.User
		var iconURL *string
		if err := rows.Scan(&u.ID, &u.Name, &iconURL); err != nil {
			return nil, err
		}
		u.IconURL = iconURL
		users = append(users, u)
	}
	return users, nil
}

// ReportUser: ユーザーを通報
func (d *Database) ReportUser(ctx context.Context, reporterID, reportedID, reason, details string) error {
	_, err := d.DB.ExecContext(ctx, `
        INSERT INTO user_reports (reporter_id, reported_id, reason, details)
        VALUES ($1, $2, $3, $4)
    `, reporterID, reportedID, reason, details)
	return err
}

// BlockUser: ユーザーをブロック
func (d *Database) BlockUser(ctx context.Context, blockerID, blockedID string) error {
	// INSERT IGNORE -> ON CONFLICT DO NOTHING
	// (blocker_id, blocked_id) が複合主キーである前提。
	_, err := d.DB.ExecContext(ctx, `
        INSERT INTO user_blocks (blocker_id, blocked_id)
        VALUES ($1, $2)
        ON CONFLICT (blocker_id, blocked_id) DO NOTHING
    `, blockerID, blockedID)
	return err
}

// UnblockUser: ブロック解除
func (d *Database) UnblockUser(ctx context.Context, blockerID, blockedID string) error {
	_, err := d.DB.ExecContext(ctx, `
		DELETE FROM user_blocks
		WHERE blocker_id = $1 AND blocked_id = $2
	`, blockerID, blockedID)
	return err
}

// IsBlocked: ブロック状態確認
func (d *Database) IsBlocked(ctx context.Context, blockerID, blockedID string) (bool, error) {
	var count int
	err := d.DB.QueryRowContext(ctx, `
        SELECT COUNT(*) FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2
    `, blockerID, blockedID).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
