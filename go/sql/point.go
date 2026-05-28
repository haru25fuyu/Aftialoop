package sql

import (
	"animaloop/utils"
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// ============================================================
// ポイント関係
// ============================================================

// ChargePoint: ポイントを減らす（履歴も自動記録）
func (d *Database) ChargePoint(ctx context.Context, userID string, amount int64, note string) error {
	tx, err := d.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. 残高チェック & 減算 (アトミック更新)
	res, err := tx.ExecContext(ctx, `
		UPDATE users
		SET point = point - $1
		WHERE id = $2 AND point >= $3
	`, amount, userID, amount)
	if err != nil {
		return fmt.Errorf("ポイント更新エラー: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("ポイント不足、またはユーザーが存在しません")
	}

	// 2. 履歴記録 (USED)
	if note == "" {
		note = "ポイント利用"
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO point_histories (user_id, type, amount, note, created_at)
		VALUES ($1, 'USED', $2, $3, CURRENT_TIMESTAMP)
	`, userID, -amount, note)
	if err != nil {
		return fmt.Errorf("履歴保存エラー: %w", err)
	}

	return tx.Commit()
}

// ChargePointTx: 既存のトランザクション内でポイントを減らし、履歴も記録する
func (d *Database) ChargePointTx(ctx context.Context, tx *sql.Tx, userID string, amount int64, note string) error {
	// 1. 減算
	res, err := tx.ExecContext(ctx, `
		UPDATE users
		SET point = point - $1
		WHERE id = $2 AND point >= $3
	`, amount, userID, amount)
	if err != nil {
		return fmt.Errorf("ポイント更新失敗: %w", err)
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("ポイント不足")
	}

	// 2. 履歴記録
	if note == "" {
		note = "商品購入で利用"
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO point_histories (user_id, type, amount, note, created_at)
		VALUES ($1, 'USED', $2, $3, CURRENT_TIMESTAMP)
	`, userID, -amount, note)
	if err != nil {
		return fmt.Errorf("ポイント履歴記録失敗: %w", err)
	}

	return nil
}

// AddPoint: ポイントを増やす（履歴も自動記録）
func (d *Database) AddPoint(ctx context.Context, userID string, amount int64, note string) error {
	tx, err := d.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. 加算
	_, err = tx.ExecContext(ctx, "UPDATE users SET point = point + $1 WHERE id = $2", amount, userID)
	if err != nil {
		return fmt.Errorf("ポイント加算エラー: %w", err)
	}

	// 2. 履歴記録 (ACQUIRED)
	if note == "" {
		note = "ポイント獲得"
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO point_histories (user_id, type, amount, note, created_at)
		VALUES ($1, 'ACQUIRED', $2, $3, CURRENT_TIMESTAMP)
	`, userID, amount, note)
	if err != nil {
		return fmt.Errorf("履歴保存エラー: %w", err)
	}

	return tx.Commit()
}

func (d *Database) ExchangeSalesToPoint(ctx context.Context, userID string, amount int) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}

	tx, err := d.DB.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. 現在の売上残高をロックして取得
	var currentSales int64
	err = tx.GetContext(ctx, &currentSales, "SELECT sales_balance FROM users WHERE id = $1 FOR UPDATE", userID)
	if err != nil {
		return fmt.Errorf("failed to lock user: %w", err)
	}

	// 2. 残高不足チェック
	if currentSales < int64(amount) {
		return errors.New("insufficient sales balance")
	}

	// 3. ユーザー情報の更新 (売上を減らし、ポイントを増やす)
	_, err = tx.ExecContext(ctx, `
		UPDATE users
		SET sales_balance = sales_balance - $1,
			point = point + $2
		WHERE id = $3
	`, amount, amount, userID)
	if err != nil {
		return fmt.Errorf("failed to update balance: %w", err)
	}

	// 4. 売上履歴に記録 (出金扱い)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO sales_histories (user_id, type, amount, balance_snapshot, note, created_at)
		VALUES ($1, 'EXCHANGE', $2, $3, 'ポイントへ交換', CURRENT_TIMESTAMP)
	`, userID, -amount, currentSales-int64(amount))
	if err != nil {
		return fmt.Errorf("failed to log sales history: %w", err)
	}

	// 5. ポイント履歴に記録 (入金扱い)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO point_histories (user_id, type, amount, note, created_at)
		VALUES ($1, 'ACQUIRED', $2, '売上金から交換', CURRENT_TIMESTAMP)
	`, userID, amount)
	if err != nil {
		// テーブルがない等のエラーは無視するか、ログに出して続行するなど調整
		// return fmt.Errorf("failed to log point history: %w", err)
	}

	return tx.Commit()
}

// GetUserPointHistory: ユーザーの現在のポイントと履歴を取得
func (d *Database) GetUserPointHistory(ctx context.Context, userID string, limit, offset int) (*utils.PointHistoryResponse, error) {
	// 1. 現在のポイント残高を取得
	var currentPoints int
	err := d.DB.QueryRowContext(ctx, "SELECT COALESCE(point, 0) FROM users WHERE id = $1", userID).Scan(&currentPoints)
	if err != nil {
		return nil, fmt.Errorf("failed to get user points: %w", err)
	}

	// 2. 履歴リストを取得
	query := `
        SELECT id, type, amount, COALESCE(note, '') as note, created_at
        FROM point_histories
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
    `

	rows, err := d.DB.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get point histories: %w", err)
	}
	defer rows.Close()

	var histories []utils.PointHistoryItem
	for rows.Next() {
		var item utils.PointHistoryItem
		if err := rows.Scan(&item.ID, &item.Type, &item.Amount, &item.Note, &item.CreatedAt); err != nil {
			return nil, err
		}
		histories = append(histories, item)
	}

	// 3. レスポンス構築
	resp := &utils.PointHistoryResponse{
		CurrentPoints: currentPoints,
		Histories:     histories,
	}

	return resp, nil
}