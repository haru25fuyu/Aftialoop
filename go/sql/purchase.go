package sql

import (
	"animaloop/config"
	"animaloop/utils"
	"fmt"
	"log"
)

// ============================================================
// 購入履歴関係
// ============================================================

func (d *Database) SavePurchaseHistory(userID, cardID string, amount int64, items []utils.Item, addressID string, url string) (int64, error) {
	query := `
		INSERT INTO purchase_history (user_id, payment_method, total_price, address_id, purchase_date, receipt_url)
		VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), ?)
	`
	result, err := d.DB.Exec(query, userID, cardID, amount, addressID, url)
	if err != nil {
		return 0, fmt.Errorf("購入履歴の保存に失敗: %w", err)
	}

	purchaseID, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("購入履歴のID取得に失敗: %w", err)
	}

	log.Printf("購入履歴を保存しました: ID=%d, UserID=%s, PaymentMethod=%s, TotalPrice=%d, AddressID=%s, ReceiptURL=%s",
		purchaseID, userID, cardID, amount, addressID, url)

	if err := d.SavePurchaseItems(purchaseID, items); err != nil {
		return 0, fmt.Errorf("%w", err)
	}

	return purchaseID, nil
}

func (d *Database) SaveReceiptURL(purchaseID int64, receiptURL string) error {
	query := "UPDATE purchase_history SET receipt_url = ?, status = ? WHERE id = ?"
	_, err := d.DB.Exec(query, receiptURL, config.OrderStatusPaid, purchaseID)
	if err != nil {
		return fmt.Errorf("領収書URLの保存に失敗: %w", err)
	}
	log.Printf("領収書URLを保存しました: PurchaseID=%d, URL=%s", purchaseID, receiptURL)
	return nil
}

func (d *Database) SavePurchaseItems(purchaseID int64, items []utils.Item) error {
	for _, item := range items {
		query := `
			INSERT INTO purchase_items (purchase_id, item_id, quantity)
			VALUES (?, ?, ?)
		`
		_, err := d.DB.Exec(query, purchaseID, item.ID, item.Quantity)
		if err != nil {
			return fmt.Errorf("購入履歴アイテムの保存に失敗: %w", err)
		}
	}
	return nil
}

func (d *Database) GetPurchaseHistory(userID string, limit int) ([]utils.PurchaseHistory, error) {
	query := `
		SELECT ph.id, ph.user_id, ph.payment_method, ph.total_price, ph.address_id, ph.purchase_date, ph.receipt_url, ph.status,
		       GROUP_CONCAT(pi.item_id SEPARATOR ',') AS item_ids,
		       GROUP_CONCAT(pi.quantity SEPARATOR ',') AS quantities
		FROM purchase_history ph
		INNER JOIN purchase_items pi ON ph.id = pi.purchase_id
		WHERE ph.user_id = ?
		GROUP BY ph.id
		ORDER BY ph.purchase_date DESC
	`
	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	var history []utils.PurchaseHistory
	err := d.DB.Select(&history, query, userID)
	if err != nil {
		return nil, fmt.Errorf("購入履歴の取得に失敗: %w", err)
	}
	return history, nil
}
