package sql

import (
	"animaloop/utils"
)

// ============================================================
// SNS: フォロー・フォロワー関係
// ============================================================

// フォローする
func (d *Database) FollowUser(followerID, followingID string) error {
	tx, err := d.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. user_relationships に追加 (IGNOREで重複エラー回避)
	_, err = tx.Exec(`
        INSERT IGNORE INTO user_relationships (follower_id, following_id) 
        VALUES (?, ?)
    `, followerID, followingID)
	if err != nil {
		return err
	}

	// 2. カウント更新 (自分: following +1)
	_, err = tx.Exec(`UPDATE users SET following_count = following_count + 1 WHERE id = ?`, followerID)
	if err != nil {
		return err
	}

	// 3. カウント更新 (相手: followers +1)
	_, err = tx.Exec(`UPDATE users SET followers_count = followers_count + 1 WHERE id = ?`, followingID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// フォロー解除
func (d *Database) UnfollowUser(followerID, followingID string) error {
	tx, err := d.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 削除実行
	res, err := tx.Exec(`DELETE FROM user_relationships WHERE follower_id = ? AND following_id = ?`, followerID, followingID)
	if err != nil {
		return err
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return nil // そもそもフォローしてなかった
	}

	// カウント減少 (0未満にならないように GREATEST を使うのが安全)
	_, err = tx.Exec(`UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = ?`, followerID)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = ?`, followingID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// フォロー状態確認
func (d *Database) IsFollowing(followerID, followingID string) (bool, error) {
	var count int
	err := d.DB.Get(&count, "SELECT COUNT(*) FROM user_relationships WHERE follower_id = ? AND following_id = ?", followerID, followingID)
	return count > 0, err
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
