package sql

import (
	"context"
	"errors"
	"fmt"
	"time"
)

func (d *Database) CreatePayoutRequest(ctx context.Context, userID string, amount int, fee int) error {
	tx, err := d.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. 残高チェック & ロック
	var currentBalance int
	err = tx.QueryRowContext(ctx, "SELECT sales_balance FROM users WHERE id = ? FOR UPDATE", userID).Scan(&currentBalance)
	if err != nil {
		return err
	}

	if currentBalance < amount {
		return errors.New("insufficient balance")
	}

	// 2. 口座情報の取得 (ロック内でやる)
	b, err := d.GetUserBankAccount(userID)
	if err != nil {
		return err
	}

	// 3. ユーザー残高を減らす
	// ----------------------------------------------------
	newBalance := currentBalance - amount // 計算しておく
	if _, err := tx.ExecContext(ctx, "UPDATE users SET sales_balance = ? WHERE id = ?", newBalance, userID); err != nil {
		return err
	}

	// 4. 振込申請テーブル (user_payouts) に保存
	// ----------------------------------------------------
	transferAmount := amount - fee
	res, err := tx.ExecContext(ctx, `
        INSERT INTO user_payouts (
            user_id, amount, fee, transfer_amount, status,
            bank_name, bank_code, branch_name, branch_code,
            account_type, account_number, account_holder_name,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
		userID, amount, fee, transferAmount,
		b.BankName, b.BankCode, b.BranchName, b.BranchCode,
		b.AccountType, b.AccountNumber, b.AccountHolderName,
		time.Now(), time.Now(),
	)
	if err != nil {
		return err
	}

	// ★ ここで、今作った申請IDを取得する (transaction_idに入れるため)
	payoutID, err := res.LastInsertId()
	if err != nil {
		return err
	}

	// 5. 売上履歴 (sales_histories) に記録 ★ここを修正
	// ----------------------------------------------------
	// 画像のテーブル定義に合わせます
	// type: 'WITHDRAWAL'
	// transaction_id: payoutID (これで紐付く！)
	// balance_snapshot: newBalance (計算済みの残高)
	// amount: -amount (マイナスで記録)

	note := fmt.Sprintf("振込申請 (手数料%d円込)", fee)

	_, err = tx.ExecContext(ctx, `
        INSERT INTO sales_histories (
            user_id, 
            transaction_id, 
            type, 
            amount, 
            balance_snapshot, 
            note, 
            created_at
        ) VALUES (?, ?, 'WITHDRAWAL', ?, ?, ?, ?)
    `,
		userID,
		payoutID,   // transaction_id に申請IDを入れる
		-amount,    // 金額はマイナス
		newBalance, // 変動後の残高スナップショット
		note,
		time.Now(),
	)

	if err != nil {
		return err
	}

	return tx.Commit()
}
