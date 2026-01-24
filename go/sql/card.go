package sql

import (
	"animaloop/utils"
	"database/sql"
	"fmt"
	"log"
)

// ============================================================
// カード関係
// ============================================================

func (d *Database) SaveOrUpdateCardAddress(userID, cardID string, addressID string) error {
	var count int
	checkQuery := "SELECT COUNT(*) FROM user_payment_methods WHERE card_id = ?"
	err := d.DB.Get(&count, checkQuery, cardID)
	if err != nil {
		return fmt.Errorf("DBチェック失敗: %w", err)
	}

	if count > 0 {
		updateQuery := `
			UPDATE user_payment_methods
			SET address_id = ?, updated_at = UTC_TIMESTAMP()
			WHERE card_id = ? AND user_id = ?
		`
		_, err := d.DB.Exec(updateQuery, addressID, cardID, userID)
		if err != nil {
			return fmt.Errorf("更新失敗: %w", err)
		}
		log.Printf("カード情報を更新しました %s", cardID)
	} else {
		insertQuery := `
			INSERT INTO user_payment_methods (user_id, card_id, address_id, created_at, updated_at)
			VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
		`
		_, err := d.DB.Exec(insertQuery, userID, cardID, addressID)
		if err != nil {
			return fmt.Errorf("挿入失敗: %w", err)
		}
		log.Println("カード情報を新規保存しました")
	}

	return nil
}

func (d *Database) GetCardAddress(userID, cardID string) (utils.Address, error) {
	query := `
		SELECT a.id, a.name, a.phone, a.user_id, a.post_code, a.pref, a.pref_code, a.address1, a.address2, a.address3, a.status
		FROM user_payment_methods upm
		INNER JOIN addresses a ON upm.address_id = a.id
		WHERE upm.user_id = ? AND upm.card_id = ?
	`
	var address utils.Address
	err := d.DB.Get(&address, query, userID, cardID)
	if err != nil {
		if err == sql.ErrNoRows {
			return address, fmt.Errorf("address not found")
		}
		return address, err
	}
	return address, nil
}

func (d *Database) DeleteCardAddress(userID, cardID string) error {
	_, err := d.DB.Exec("DELETE FROM user_payment_methods WHERE user_id = ? AND card_id = ?", userID, cardID)
	return err
}

func (d *Database) GetCardAddressByID(cardID string) (utils.CardSummary, error) {
	query := "SELECT id FROM cards WHERE id = ?"
	var card utils.CardSummary
	err := d.DB.Get(&card, query, cardID)
	if err == sql.ErrNoRows {
		return card, fmt.Errorf("card not found")
	}
	return card, nil
}
