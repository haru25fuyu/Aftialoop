package function

import (
	"animaloop/utils"
	"fmt"
	"log"
	"math"
	"os"

	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/customer"
	"github.com/stripe/stripe-go/v76/paymentintent"
	"github.com/stripe/stripe-go/v76/paymentmethod"
	"github.com/stripe/stripe-go/v76/setupintent"
)

func init() {
	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")
}

// ── 顧客管理 ──────────────────────────────────────────────

// CreateCustomer は新規ユーザー登録時に Stripe 顧客を作成する
func CreateCustomer(user utils.SqlUser) (string, error) {
	params := &stripe.CustomerParams{
		Email: stripe.String(user.Email),
		Name:  stripe.String(user.Name),
	}
	c, err := customer.New(params)
	if err != nil {
		log.Printf("Error creating Stripe customer: %v", err)
		return "", err
	}
	log.Printf("Created Stripe customer: %s", c.ID)
	return c.ID, nil
}

// DeleteCustomer は Stripe 顧客を削除する
func DeleteCustomer(customerID string) error {
	_, err := customer.Del(customerID, nil)
	if err != nil {
		log.Printf("Error deleting Stripe customer: %v", err)
	}
	return err
}

// ── カード管理 ────────────────────────────────────────────

// CreateSetupIntent はカード保存用の SetupIntent を作成し client_secret を返す
func CreateSetupIntent(customerID string) (string, error) {
	params := &stripe.SetupIntentParams{
		Customer: stripe.String(customerID),
		PaymentMethodTypes: []*string{
			stripe.String("card"),
		},
	}
	si, err := setupintent.New(params)
	if err != nil {
		return "", fmt.Errorf("failed to create setup intent: %w", err)
	}
	return si.ClientSecret, nil
}

// AttachPaymentMethod は PaymentMethod を顧客に紐付ける
func AttachPaymentMethod(paymentMethodID, customerID string) error {
	params := &stripe.PaymentMethodAttachParams{
		Customer: stripe.String(customerID),
	}
	_, err := paymentmethod.Attach(paymentMethodID, params)
	if err != nil {
		return fmt.Errorf("failed to attach payment method: %w", err)
	}
	return nil
}

// DetachPaymentMethod は顧客からカードを削除する
func DetachPaymentMethod(paymentMethodID string) error {
	_, err := paymentmethod.Detach(paymentMethodID, nil)
	if err != nil {
		return fmt.Errorf("failed to detach payment method: %w", err)
	}
	return nil
}

// GetPaymentMethodList は顧客のカード一覧を返す
func GetCardList(customerID string) ([]utils.CardSummary, error) {
	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(customerID),
		Type:     stripe.String("card"),
	}
	i := paymentmethod.List(params)

	var summaries []utils.CardSummary
	for i.Next() {
		pm := i.PaymentMethod()
		if pm.Card == nil {
			continue
		}
		summaries = append(summaries, utils.CardSummary{
			ID:       pm.ID,
			Brand:    string(pm.Card.Brand),
			Last4:    pm.Card.Last4,
			ExpMonth: int(pm.Card.ExpMonth),
			ExpYear:  int(pm.Card.ExpYear),
			Disabled: false,
		})
	}
	if err := i.Err(); err != nil {
		return nil, fmt.Errorf("failed to list payment methods: %w", err)
	}
	if summaries == nil {
		summaries = []utils.CardSummary{}
	}
	return summaries, nil
}

// DeleteCard は PaymentMethod を detach して削除する
func DeleteCard(paymentMethodID string) error {
	return DetachPaymentMethod(paymentMethodID)
}

// SetDefaultPaymentMethod は顧客のデフォルト支払い方法を設定する
func SetDefaultPaymentMethod(customerID, paymentMethodID string) error {
	params := &stripe.CustomerParams{
		InvoiceSettings: &stripe.CustomerInvoiceSettingsParams{
			DefaultPaymentMethod: stripe.String(paymentMethodID),
		},
	}
	_, err := customer.Update(customerID, params)
	if err != nil {
		return fmt.Errorf("failed to set default payment method: %w", err)
	}
	return nil
}

// ── 決済 ──────────────────────────────────────────────────

// ChargeCard は PaymentIntent を作成して即時確定する（JPY は小数なし）
func ChargeCard(customerID, paymentMethodID, idempotencyKey string, amount float64) (string, error) {
	amountJPY := int64(math.Round(amount))
	log.Printf("Stripe charge: customer=%s, pm=%s, amount=%d JPY", customerID, paymentMethodID, amountJPY)

	params := &stripe.PaymentIntentParams{
		Amount:        stripe.Int64(amountJPY),
		Currency:      stripe.String("jpy"),
		Customer:      stripe.String(customerID),
		PaymentMethod: stripe.String(paymentMethodID),
		Confirm:       stripe.Bool(true),
		OffSession:    stripe.Bool(true),
	}
	params.SetIdempotencyKey(idempotencyKey)

	pi, err := paymentintent.New(params)
	if err != nil {
		return "", fmt.Errorf("payment failed: %w", err)
	}
	log.Printf("Payment succeeded: PaymentIntent=%s", pi.ID)
	return pi.ID, nil
}
