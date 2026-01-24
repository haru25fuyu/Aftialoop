package sql

import (
	"database/sql"
	"fmt"
)

// -----------------------------------------------------------
// 売上金関係
// -----------------------------------------------------------
// AddUserSalesBalance: ユーザーの売上金を加算し、履歴を残す
func (d *Database) AddUserSalesBalance(tx *sql.Tx, userID string, amount int, txID uint64, note string) error {
	// 1. 現在の残高を取得してロックする (FOR UPDATE)
	// これにより、同時に処理が走っても計算が狂わないようにする
	var currentBalance int64
	err := tx.QueryRow("SELECT sales_balance FROM users WHERE id = ? FOR UPDATE", userID).Scan(&currentBalance)
	if err != nil {
		return fmt.Errorf("failed to lock user balance: %w", err)
	}

	// 2. 新しい残高を計算
	newBalance := currentBalance + int64(amount)

	// 3. 残高を更新
	_, err = tx.Exec("UPDATE users SET sales_balance = ? WHERE id = ?", newBalance, userID)
	if err != nil {
		return fmt.Errorf("failed to update user balance: %w", err)
	}

	// 4. 履歴テーブルに記録
	_, err = tx.Exec(`
        INSERT INTO sales_histories (user_id, transaction_id, type, amount, balance_snapshot, note)
        VALUES (?, ?, 'SALE', ?, ?, ?)
    `, userID, txID, amount, newBalance, note)

	if err != nil {
		return fmt.Errorf("failed to insert sales history: %w", err)
	}

	return nil
}
