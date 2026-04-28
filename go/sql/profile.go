package sql

import (
	"animaloop/utils"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
)

// ============================================================
// プロフィール興味関係
// ============================================================
func (d *Database) SaveProfile(id string, profile map[string]interface{}) error {
	columns := []string{"user_id"}
	values := []interface{}{id}

	for key, value := range profile {
		columns = append(columns, key)
		values = append(values, value)
	}

	placeholders := make([]string, len(columns))
	for i := range placeholders {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}

	query := fmt.Sprintf("INSERT INTO profile (%s) VALUES (%s)", strings.Join(columns, ","), strings.Join(placeholders, ","))

	_, err := d.DB.Exec(query, values...)
	return err
}

func (d *Database) GetProfile(id string) (utils.Profile, error) {
	query := "SELECT date_of_birth, gender, phone_number, bio FROM profile WHERE user_id = $1"
	var profile utils.Profile

	err := d.DB.Get(&profile, query, id)
	if err == sql.ErrNoRows {
		saveErr := d.SaveProfile(id, map[string]interface{}{})
		if saveErr != nil {
			return profile, fmt.Errorf("プロフィール作成に失敗しました: %v", saveErr)
		}
		err = d.DB.Get(&profile, query, id)
		if err != nil {
			return profile, fmt.Errorf("プロフィール取得に失敗しました: %v", err)
		}
	}
	return profile, err
}

func (d *Database) UpdateProfile(userID string, profile utils.Profile) error {
	// 1. クエリの部品（"name = ?" など）と、値を入れるスライスを用意
	var setClauses []string
	var args []interface{}

	// 2. 各フィールドをチェックして、値があればリストに追加

	// 誕生日
	if profile.DateOfBirth != nil && *profile.DateOfBirth != "" {
		setClauses = append(setClauses, "date_of_birth = $"+strconv.Itoa(len(args)+1))
		args = append(args, *profile.DateOfBirth)
	}

	// 性別
	if profile.Gender != nil && *profile.Gender != "" {
		setClauses = append(setClauses, "gender = $"+strconv.Itoa(len(args)+1))
		args = append(args, *profile.Gender)
	}

	// 電話番号
	if profile.PhoneNumber != nil && *profile.PhoneNumber != "" {
		setClauses = append(setClauses, "phone_number = $"+strconv.Itoa(len(args)+1))
		args = append(args, *profile.PhoneNumber)
	}

	// 自己紹介
	// ※Bioは空文字で「消去」したい場合もあると思うので、nilチェックだけにしています
	if profile.Bio != nil {
		setClauses = append(setClauses, "bio = $"+strconv.Itoa(len(args)+1))
		args = append(args, *profile.Bio)
	}

	// 3. 更新する項目が一つもなければ何もしない
	if len(setClauses) == 0 {
		return nil
	}


	query := fmt.Sprintf("UPDATE profile SET %s WHERE user_id = $%d", strings.Join(setClauses, ", "), len(args)+1)


	// 5. 最後に WHERE句用の user_id を引数リストに追加
	args = append(args, userID)

	// 6. クエリを PostgreSQL 用に変換してから実行
	query = d.DB.Rebind(query)

	// 6. 実行 (args... でスライスを展開して渡す)
	_, err := d.DB.Exec(query, args...)
	return err
}

func (d *Database) GetPhoneNumber(userID string) (string, error) {
	var phoneNumber string
	err := d.DB.Get(&phoneNumber, "SELECT phone_number FROM profile WHERE user_id = $1", userID)
	return phoneNumber, err
}

// 　電話番号の重複チェック
func (d *Database) IsPhoneNumberDuplicate(phoneNumber string) (bool, error) {
	var existingID string
	err := d.DB.Get(&existingID, "SELECT user_id FROM profile WHERE phone_number = $1 LIMIT 1", phoneNumber)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (d *Database) UpdatePhoneNumber(userID string, phoneNumber string) error {
	_, err := d.DB.Exec("UPDATE profile SET phone_number = $1 WHERE user_id = $2", phoneNumber, userID)
	return err
}

// ============================================================
// ユーザーのお気に入り・履歴関係
// ============================================================

func (d *Database) GetFavoriteItems(userID string, limit int) ([]map[string]interface{}, error) {
	var queryLimit string
	if limit != 0 {
		queryLimit = "LIMIT " + strconv.Itoa(limit)
	}
	query := "SELECT * FROM favorites INNER JOIN items ON favorites.item_id = items.id WHERE favorites.user_id = $1 " + queryLimit

	var results []map[string]interface{}
	err := d.DB.Select(&results, query, userID)
	return results, err
}

func (d *Database) AddFavorite(userID string, itemID string) error {
	_, err := d.DB.Exec("INSERT INTO favorites (user_id, item_id) VALUES ($1, $2)", userID, itemID)
	return err
}

func (d *Database) DeleteFavorite(userID string, itemID string) error {
	_, err := d.DB.Exec("DELETE FROM favorites WHERE user_id = $1 AND item_id = $2", userID, itemID)
	return err
}

func (d *Database) GetHistory(userID string, limit int) ([]map[string]interface{}, error) {
	var queryLimit string
	if limit != 0 {
		queryLimit = "LIMIT " + strconv.Itoa(limit)
	}
	query := "SELECT * FROM histories INNER JOIN items ON histories.item_id = items.id WHERE histories.user_id = $1 " + queryLimit

	var results []map[string]interface{}
	err := d.DB.Select(&results, query, userID)
	return results, err
}

func (d *Database) AddHistory(userID string, itemID string) error {
	_, err := d.DB.Exec("INSERT INTO histories (user_id, item_id) VALUES ($1, $2)", userID, itemID)
	return err
}

func (d *Database) DeleteHistory(userID string, itemID string) error {
	_, err := d.DB.Exec("DELETE FROM histories WHERE user_id = $1 AND item_id = $2", userID, itemID)
	return err
}
