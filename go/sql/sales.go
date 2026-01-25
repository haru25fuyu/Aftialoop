package sql

import (
	"animaloop/utils"
	"database/sql"
	"fmt"
)

// -----------------------------------------------------------
// 売上金関係
// -----------------------------------------------------------
// AddUserSalesBalance: ユーザーの売上金を加算し、履歴を残す
func (d *Database) AddUserSalesBalance(tx *sql.Tx, userID string, amount int, txID uint64, note string) error {
	// 1. 現在の残高を取得してロック
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
	// ★修正: created_at カラムを追加し、VALUESに UTC_TIMESTAMP() を追加
	_, err = tx.Exec(`
        INSERT INTO sales_histories (user_id, transaction_id, type, amount, balance_snapshot, note, created_at)
        VALUES (?, ?, 'SALE', ?, ?, ?, UTC_TIMESTAMP())
    `, userID, txID, amount, newBalance, note)

	if err != nil {
		return fmt.Errorf("failed to insert sales history: %w", err)
	}

	return nil
}

// GetUserSalesBalance: ユーザーの現在の売上金残高を取得
func (d *Database) GetUserSalesBalance(userID string) (int64, error) {
	var balance int64
	err := d.DB.QueryRow("SELECT sales_balance FROM users WHERE id = ?", userID).Scan(&balance)
	if err != nil {
		return 0, fmt.Errorf("failed to get user sales balance: %w", err)
	}
	return balance, nil
}

// 履歴取得
func (d *Database) GetUserSalesHistories(userID string, limit, offset int) ([]utils.SalesHistoryItem, error) {

	query := `
		SELECT id, type, amount, balance_snapshot, note, created_at
		FROM sales_histories
		WHERE user_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`
	var histories []utils.SalesHistoryItem
	err := d.DB.Select(&histories, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get sales histories: %w", err)
	}
	return histories, nil
}
