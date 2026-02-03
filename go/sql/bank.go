package sql

import (
	"animaloop/utils"

	"github.com/jmoiron/sqlx"
)

func (d *Database) GetUserBankAccount(userID string) (*utils.UserBankAccountResponse, error) {
	var response utils.UserBankAccountResponse

	// 1. 既存の d.DB (*sql.DB) を sqlx でラップする
	// (アプリの初期化時に d.DB 自体を *sqlx.DB にしてしまうのがベストですが、ここでは局所的に使います)
	dbx := sqlx.NewDb(d.DB.DB, "mysql")

	// 2. Getメソッドを使うと、dbタグを見て自動でマッピングしてくれます！
	// Scan(&...) を大量に書く必要はもうありません。
	// SELECT * で全カラム取ってくれば、タグ名と一致する場所に自動で入ります。
	query := `SELECT * FROM user_bank_accounts WHERE user_id = ?`

	err := dbx.Get(&response, query, userID)

	if err != nil {
		// sqlx もデータがない場合は sql.ErrNoRows を返します
		return nil, err
	}

	return &response, nil
}

// UpsertUserBankAccount: sqlx.NamedExec を使って構造体をそのまま保存
func (d *Database) UpsertUserBankAccount(b *utils.UserBankAccountResponse) error {
	dbx := sqlx.NewDb(d.DB.DB, "mysql")

	// コロン (:カラム名) を使うと、構造体の db:"カラム名" の値が自動で入ります
	// VALUES の中身を ? から :name 形式に変えるだけでOKです
	query := `
        INSERT INTO user_bank_accounts 
        (
            user_id, bank_name, bank_code, branch_name, branch_code, 
            account_type, account_number, account_holder_name, created_at, updated_at
        )
        VALUES 
        (
            :user_id, :bank_name, :bank_code, :branch_name, :branch_code, 
            :account_type, :account_number, :account_holder_name, UTC_TIMESTAMP(), UTC_TIMESTAMP()
        )
        ON DUPLICATE KEY UPDATE
            bank_name           = VALUES(bank_name),
            bank_code           = VALUES(bank_code),
            branch_name         = VALUES(branch_name),
            branch_code         = VALUES(branch_code),
            account_type        = VALUES(account_type),
            account_number      = VALUES(account_number),
            account_holder_name = VALUES(account_holder_name),
            updated_at          = UTC_TIMESTAMP()
    `

	// 構造体 b をそのまま渡すだけ！
	_, err := dbx.NamedExec(query, b)

	return err
}
