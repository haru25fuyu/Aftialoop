package sql

import (
	"animaloop/utils"
	"context"
)

// ============================================================
// SNS: フォロー・フォロワー関係
// ============================================================

// フォローする
// FollowUser: フォロー登録 (トランザクション + カウンターキャッシュ)
func (d *Database) FollowUser(ctx context.Context, followerID, followingID string) error {
	tx, err := d.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. follows に追加 (IGNOREで重複エラー回避)
	// IGNOREを使うと、既に存在する場合は何もしない
	res, err := tx.ExecContext(ctx, `
        INSERT IGNORE INTO follows (follower_id, followee_id) 
        VALUES (?, ?)
    `, followerID, followingID)
	if err != nil {
		return err
	}

	// ★重要: 実際に挿入されたか確認
	// 既にフォロー済みだった場合(rows==0)は、カウントを増やさずに終了
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return nil
	}

	// 2. カウント更新 (自分: following +1)
	_, err = tx.ExecContext(ctx, `UPDATE users SET following_count = following_count + 1 WHERE id = ?`, followerID)
	if err != nil {
		return err
	}

	// 3. カウント更新 (相手: followers +1)
	_, err = tx.ExecContext(ctx, `UPDATE users SET followers_count = followers_count + 1 WHERE id = ?`, followingID)
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

	// 削除実行
	res, err := tx.ExecContext(ctx, `DELETE FROM follows WHERE follower_id = ? AND followee_id = ?`, followerID, followingID)
	if err != nil {
		return err
	}

	// ★重要: 実際に削除されたか確認
	rows, _ := res.RowsAffected()
	if rows == 0 {
		return nil // そもそもフォローしてなかった
	}

	// カウント減少 (0未満にならないように GREATEST を使うのが安全)
	_, err = tx.ExecContext(ctx, `UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = ?`, followerID)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = ?`, followingID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// IsFollowing: フォロー状態確認
// (前のステップで実装したものと同じですが、テーブル名を合わせます)
func (d *Database) IsFollowing(ctx context.Context, followerID, followingID string) (bool, error) {
	var count int
	// GetContext を使うのがベター
	err := d.DB.QueryRowContext(ctx, `
        SELECT COUNT(*) FROM follows WHERE follower_id = ? AND followee_id = ?
    `, followerID, followingID).Scan(&count)

	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// ============================================================
// SNS: 投稿 (つぶやき)
// ============================================================

// 投稿を作成
func (d *Database) CreatePost(post utils.UserPost) error {
	// ImageURLs ([]string) は JSON文字列に変換して保存する必要がありますが、
	// いったんシンプルに body と user_id だけ保存する例
	_, err := d.DB.Exec(`
        INSERT INTO user_posts (user_id, body, created_at) VALUES (?, ?, NOW())
    `, post.UserID, post.Body)
	return err
}

// ============================================================
// SNS: 通報・ブロック
// ============================================================

// GetBlockedUsers: ブロックしているユーザーの一覧を取得
func (d *Database) GetBlockedUsers(ctx context.Context, userID string) ([]utils.User, error) {
	// user_blocks と users を結合して、ブロック相手の情報を取得
	query := `
		SELECT u.id, u.name, u.icon_url 
		FROM user_blocks b
		JOIN users u ON b.blocked_id = u.id
		WHERE b.blocker_id = ?
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
        VALUES (?, ?, ?, ?)
    `, reporterID, reportedID, reason, details)
	return err
}

// BlockUser: ユーザーをブロック
// ※本来はブロック時に「相互フォロー解除」も行うのが一般的ですが、
//
//	まずはシンプルにブロックテーブルへの追加のみ実装します。
func (d *Database) BlockUser(ctx context.Context, blockerID, blockedID string) error {
	_, err := d.DB.ExecContext(ctx, `
        INSERT IGNORE INTO user_blocks (blocker_id, blocked_id) 
        VALUES (?, ?)
    `, blockerID, blockedID)
	return err
}

// UnblockUser: ブロック解除
func (d *Database) UnblockUser(ctx context.Context, blockerID, blockedID string) error {
	_, err := d.DB.ExecContext(ctx, `
		DELETE FROM user_blocks 
		WHERE blocker_id = ? AND blocked_id = ?
	`, blockerID, blockedID)
	return err
}

// IsBlocked: ブロック状態確認
func (d *Database) IsBlocked(ctx context.Context, blockerID, blockedID string) (bool, error) {
	var count int
	err := d.DB.QueryRowContext(ctx, `
        SELECT COUNT(*) FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?
    `, blockerID, blockedID).Scan(&count)

	if err != nil {
		return false, err
	}
	return count > 0, nil
}
