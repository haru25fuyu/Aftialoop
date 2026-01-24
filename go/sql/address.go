package sql

import (
	"animaloop/utils"
	"database/sql"
	"fmt"
	"strings"
)

// ============================================================
// 住所関係
// ============================================================

func (d *Database) UpdateAddress(
	userID string,
	id string,
	p *utils.Address,
) error {

	set := []string{}
	vals := []any{}

	if p.Name != nil && *p.Name != "" {
		set = append(set, "name = ?")
		vals = append(vals, *p.Name)
	}
	if p.Phone != nil && *p.Phone != "" {
		set = append(set, "phone = ?")
		vals = append(vals, *p.Phone)
	}
	if p.PostCode != nil && *p.PostCode != "" {
		set = append(set, "post_code = ?")
		vals = append(vals, *p.PostCode)
	}
	if p.Pref != nil && *p.Pref != "" {
		set = append(set, "pref = ?")
		vals = append(vals, *p.Pref)
	}
	if p.Address1 != nil && *p.Address1 != "" {
		set = append(set, "address1 = ?")
		vals = append(vals, *p.Address1)
	}
	if p.Address2 != nil && *p.Address2 != "" {
		set = append(set, "address2 = ?")
		vals = append(vals, *p.Address2)
	}
	if p.Address3 != nil && *p.Address3 != "" {
		set = append(set, "address3 = ?")
		vals = append(vals, *p.Address3)
	}

	if len(set) == 0 {
		return nil
	}

	q := fmt.Sprintf(
		"UPDATE addresses SET %s WHERE id = ? AND user_id = ?",
		strings.Join(set, ", "),
	)
	vals = append(vals, id, userID)

	_, err := d.DB.Exec(q, vals...)
	return err
}

func (d *Database) AddAddress(a *utils.Address) error {
	_, err := d.DB.NamedExec(`
		INSERT INTO addresses
		(user_id, name, phone, post_code, pref, pref_code, address1, address2, address3)
		VALUES
		(:user_id, :name, :phone, :post_code, :pref, :pref_code, :address1, :address2, :address3)
	`, a)
	return err
}

func (d *Database) GetAddress(id uint64, userID string) (utils.Address, error) {
	query := `
		SELECT id, name, phone, user_id, post_code, pref, pref_code, address1, address2, address3, status
		FROM addresses
		WHERE id = ? AND user_id = ?
		LIMIT 1
	`
	var address utils.Address
	err := d.DB.Get(&address, query, id, userID)
	if err == sql.ErrNoRows {
		return address, fmt.Errorf("address not found")
	}
	return address, err
}

func (d *Database) DeleteAddress(id string) error {
	// 元コードは WHERE user_id = ? に id を渡してたので明確にバグ。
	// ここは「id を渡す」想定で直す（意図に沿う）。
	_, err := d.DB.Exec("UPDATE addresses SET status = ? WHERE id = ?", 3, id)
	return err
}

func (d *Database) SetStatusAddress(userID, addressID string) error {
	_, err := d.DB.Exec("UPDATE addresses SET status = ? WHERE user_id = ? AND status = 1", 0, userID)
	if err != nil {
		return err
	}
	_, err = d.DB.Exec("UPDATE addresses SET status = ? WHERE id = ?", 1, addressID)
	return err
}

func (d *Database) GetAddressList(userID string) ([]utils.Address, error) {
	query := `
		SELECT id, name, phone, user_id, post_code, pref, pref_code, address1, address2, address3, status
		FROM addresses
		WHERE user_id = ? AND status != 3
		ORDER BY status DESC
	`
	var addresses []utils.Address
	err := d.DB.Select(&addresses, query, userID)
	return addresses, err
}

func (d *Database) GetDefaultAddress(userID string) (*utils.Address, error) {
	query := `
		SELECT id, name, phone, user_id, post_code, pref, pref_code, address1, address2, address3, status
		FROM addresses
		WHERE user_id = ? AND status = 1
		LIMIT 1
	`
	var address utils.Address
	err := d.DB.Get(&address, query, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // ← ここが超重要（正常）
		}
		return nil, err
	}
	return &address, nil
}
