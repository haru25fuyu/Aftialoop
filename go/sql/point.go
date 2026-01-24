package sql

import (
	"animaloop/utils"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
)

// ============================================================
// ポイント関係
// ============================================================

func (d *Database) ChargePoint(userID string, amount int64) error {
	var user utils.SqlUser
	err := d.DB.Get(&user, "SELECT id, point FROM users WHERE id = ?", userID)
	if err != nil {
		return fmt.Errorf("ユーザーの取得に失敗: %w", err)
	}

	if int64(user.Point) < amount {
		return fmt.Errorf("ポイントが不足しています")
	}

	newPoint := int64(user.Point) - amount
	_, err = d.DB.Exec("UPDATE users SET point = ? WHERE id = ?", newPoint, userID)
	if err != nil {
		return fmt.Errorf("ポイントの更新に失敗: %w", err)
	}

	log.Printf("ポイント決済成功: UserID=%s, Amount=%d", userID, amount)
	return nil
}

func (d *Database) ChargePointTx(ctx context.Context, tx *sql.Tx, userID string, amount int64) error {
	// 1. 残高チェック (FOR UPDATE でロックを掛けるのがベスト)
	var currentPoint int64
	// ※ sqlx ではなく標準の sql.Tx を使う想定なので QueryRowContext を使用
	err := tx.QueryRowContext(ctx, "SELECT point FROM users WHERE id = ? FOR UPDATE", userID).Scan(&currentPoint)
	if err != nil {
		return fmt.Errorf("ユーザー取得失敗: %w", err)
	}

	// 2. 足りているか
	if currentPoint < amount {
		return fmt.Errorf("ポイント不足 (残高:%d, 必要:%d)", currentPoint, amount)
	}

	// 3. 減算
	_, err = tx.ExecContext(ctx, "UPDATE users SET point = point - ? WHERE id = ?", amount, userID)
	if err != nil {
		return fmt.Errorf("ポイント更新失敗: %w", err)
	}

	return nil
}

func (d *Database) AddPoint(userID string, amount int64) error {
	var user utils.SqlUser
	err := d.DB.Get(&user, "SELECT id, point FROM users WHERE id = ?", userID)
	if err != nil {
		return fmt.Errorf("ユーザーの取得に失敗: %w", err)
	}

	newPoint := int64(user.Point) + amount
	_, err = d.DB.Exec("UPDATE users SET point = ? WHERE id = ?", newPoint, userID)
	if err != nil {
		return fmt.Errorf("ポイントの更新に失敗: %w", err)
	}

	log.Printf("ポイント追加成功: UserID=%s, Amount=%d", userID, amount)
	return nil
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
	err = tx.GetContext(ctx, &currentSales, "SELECT sales_balance FROM users WHERE id = ? FOR UPDATE", userID)
	if err != nil {
		return fmt.Errorf("failed to lock user: %w", err)
	}

	// 2. 残高不足チェック
	if currentSales < int64(amount) {
		return errors.New("insufficient sales balance")
	}

	// 3. ユーザー情報の更新 (売上を減らし、ポイントを増やす)
	// ※レートは等価交換(1円=1pt)とします
	_, err = tx.ExecContext(ctx, `
		UPDATE users 
		SET sales_balance = sales_balance - ?, 
			point = point + ? 
		WHERE id = ?
	`, amount, amount, userID)
	if err != nil {
		return fmt.Errorf("failed to update balance: %w", err)
	}

	// 4. 売上履歴に記録 (出金扱い)
	_, err = tx.ExecContext(ctx, `
		INSERT INTO sales_histories (user_id, type, amount, balance_snapshot, note, created_at)
		VALUES (?, 'EXCHANGE', ?, ?, 'ポイントへ交換', UTC_TIMESTAMP())
	`, userID, -amount, currentSales-int64(amount))
	if err != nil {
		return fmt.Errorf("failed to log sales history: %w", err)
	}

	// 5. ポイント履歴に記録 (入金扱い)
	// ※ point_histories テーブルがある前提。なければこのブロックはスキップでも可
	_, err = tx.ExecContext(ctx, `
		INSERT INTO point_histories (user_id, type, amount, note, created_at)
		VALUES (?, 'ACQUIRED', ?, '売上金から交換', UTC_TIMESTAMP())
	`, userID, amount)
	if err != nil {
		// テーブルがない等のエラーは無視するか、ログに出して続行するなど調整
		// return fmt.Errorf("failed to log point history: %w", err)
	}

	return tx.Commit()
}
