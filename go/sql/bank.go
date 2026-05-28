package sql

import (
	"animaloop/utils"

	"github.com/jmoiron/sqlx"
)

func (d *Database) GetUserBankAccount(userID string) (*utils.UserBankAccountResponse, error) {
	var response utils.UserBankAccountResponse

	// ★修正: ドライバ名を "mysql" -> "postgres" に。
	//   sqlx は driverName を見て Rebind の挙動(?→$n)を決めるため、ここが mysql だと
	//   NamedExec での :name 展開後のプレースホルダが正しく $n にならない。
	dbx := sqlx.NewDb(d.DB.DB, "postgres")

	// SELECT * で全カラム取得し、db タグ名で自動マッピング
	query := `SELECT * FROM user_bank_accounts WHERE user_id = $1`

	err := dbx.Get(&response, query, userID)
	if err != nil {
		return nil, err
	}

	return &response, nil
}

// UpsertUserBankAccount: sqlx.NamedExec を使って構造体をそのまま保存
func (d *Database) UpsertUserBankAccount(b *utils.UserBankAccountResponse) error {
	// ★修正: "mysql" -> "postgres"
	dbx := sqlx.NewDb(d.DB.DB, "postgres")

	// ★修正:
	//   - UTC_TIMESTAMP() -> CURRENT_TIMESTAMP
	//   - ON DUPLICATE KEY UPDATE ... VALUES(col) -> ON CONFLICT (user_id) DO UPDATE SET ... = EXCLUDED.col
	//   ※ user_bank_accounts.user_id が UNIQUE である前提。
	query := `
        INSERT INTO user_bank_accounts
        (
            user_id, bank_name, bank_code, branch_name, branch_code,
            account_type, account_number, account_holder_name, created_at, updated_at
        )
        VALUES
        (
            :user_id, :bank_name, :bank_code, :branch_name, :branch_code,
            :account_type, :account_number, :account_holder_name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id) DO UPDATE SET
            bank_name           = EXCLUDED.bank_name,
            bank_code           = EXCLUDED.bank_code,
            branch_name         = EXCLUDED.branch_name,
            branch_code         = EXCLUDED.branch_code,
            account_type        = EXCLUDED.account_type,
            account_number      = EXCLUDED.account_number,
            account_holder_name = EXCLUDED.account_holder_name,
            updated_at          = CURRENT_TIMESTAMP
    `

	_, err := dbx.NamedExec(query, b)
	return err
}