package function

import (
	"animaloop/config"
	"animaloop/utils"
	"context"
	"fmt"
	"log"
	"math"

	"github.com/google/uuid"
	square "github.com/square/square-go-sdk"
)

func CreateCustomer(user utils.SqlUser) (string, error) {
	response, err := config.SquareClient.Customers.Create(
		context.TODO(),
		&square.CreateCustomerRequest{
			EmailAddress: square.String(
				user.Email,
			),
			Nickname: square.String(
				user.Name,
			),
		},
	)
	if err != nil {
		log.Fatalf("Error creating customer: %v", err)
		return "", err
	}

	log.Printf("作成された顧客ID: %s\n", *response.Customer.ID)

	return *response.Customer.ID, nil
}

func DeleteCustomer(customerID string) error {
	response, err := config.SquareClient.Customers.Delete(
		context.TODO(),
		&square.DeleteCustomersRequest{
			CustomerID: customerID,
		},
	)
	if err != nil {
		log.Fatalf("Error deleting customer: %v", err)
		return err
	}

	log.Printf("削除された顧客ID: %s\n", response)

	return nil
}

func CheckSquareEmail(email string) bool {
	response, err := config.SquareClient.Customers.Search(
		context.TODO(),
		&square.SearchCustomersRequest{
			Query: &square.CustomerQuery{
				Filter: &square.CustomerFilter{
					EmailAddress: &square.CustomerTextFilter{
						Exact: square.String(
							email,
						),
					},
				},
			},
			Count: square.Bool(
				true,
			),
		},
	)

	if err != nil {
		log.Fatalf("Error searching customers: %v", err)
	}

	if response.Customers != nil {
		for _, customer := range response.Customers {
			fmt.Printf("Customer ID: %s, Email: %s\n", *customer.ID, *customer.EmailAddress)
			return true
		}
	} else {
		fmt.Println("No customers found.")
		return false
	}
	return false
}

func CreateCard(card utils.RequestCard) (string, error) {
	response, err := config.SquareClient.Cards.Create(
		context.TODO(),
		&square.CreateCardRequest{
			IdempotencyKey: uuid.New().String(),
			Card: &square.Card{
				CustomerID: square.String(
					card.CustomerID,
				),
				CardholderName: square.String(
					card.Name,
				),
			},
			SourceID: card.Token,
			VerificationToken: square.String(
				card.VerificationToken,
			),
		},
	)
	if err != nil {
		log.Printf("Error creating card: %v", err)
		return "", err
	}
	if response.Card == nil {
		return "", fmt.Errorf("card creation succeeded but response.Card is nil")
	}
	return *response.Card.ID, nil
}

func ChargeCard(customerID, cardID string, amount float64) (string, error) {
	// 1. 四捨五入 (例: 100.5 -> 101, 100.4 -> 100)
	roundedAmount := int64(math.Round(amount))

	log.Printf("Charging card: Cust=%s, Card=%s, Amount=%.2f -> %d", customerID, cardID, amount, roundedAmount)

	// 2. Square APIコール
	resp, err := config.SquareClient.Payments.Create(
		context.TODO(),
		&square.CreatePaymentRequest{
			AmountMoney: &square.Money{
				Amount:   square.Int64(roundedAmount), // 四捨五入した値を使う
				Currency: square.CurrencyJpy.Ptr(),
			},
			IdempotencyKey: uuid.New().String(),
			SourceID:       cardID,
			Autocomplete:   square.Bool(true),
			CustomerID:     square.String(customerID),
		},
	)

	// 1. まずエラーチェック！
	if err != nil {
		return "", err // エラーなら即リターン
	}

	// 2. 中身が空じゃないかチェック！
	if resp.Payment == nil || resp.Payment.ReceiptURL == nil {
		// 成功したけどURLがない場合など
		return "", nil
	}

	// 3. ここまできて初めて * をつける
	return *resp.Payment.ReceiptURL, nil
}

func GetCardList(customerID string) ([]utils.CardSummary, error) {
	response, err := config.SquareClient.Cards.List(
		context.TODO(),
		&square.ListCardsRequest{
			CustomerID: square.String(customerID),
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list cards: %w", err)
	}
	fmt.Printf("RESPONSE TYPE: %T\n", response)
	summaries := []utils.CardSummary{}

	iter := response.Iterator()

	for iter.Next(context.TODO()) {
		card := iter.Current()
		summaries = append(summaries, utils.CardSummary{
			ID:        *card.ID,
			Brand:     string(*card.CardBrand),
			Last4:     *card.Last4,
			ExpMonth:  int(*card.ExpMonth),
			ExpYear:   int(*card.ExpYear),
			Disabled:  card.Enabled != nil && !*card.Enabled,
			IsDefault: false,
		})
	}
	return summaries, nil
}

func DeleteCard(cardID string) error {
	response, err := config.SquareClient.Cards.Disable(
		context.TODO(),
		&square.DisableCardsRequest{
			CardID: cardID,
		},
	)
	if err != nil {
		log.Fatalf("Error disabling card: %v", err)
	}
	if response.Card != nil {
		log.Printf("Card disabled: %s\n", *response.Card.ID)
	} else {
		log.Println("Card not found or already disabled.")
	}
	// カードが無効化された場合は、nilを返す
	// それ以外の場合はエラーを返す
	return err
}

func GetCardByID(cardID string) (*square.GetCardResponse, error) {
	response, err := config.SquareClient.Cards.Get(
		context.TODO(),
		&square.GetCardsRequest{
			CardID: cardID,
		},
	)
	if err != nil {
		log.Printf("Error retrieving card: %v", err)
		return nil, err
	}
	if response.Card == nil {
		return nil, fmt.Errorf("card not found")
	}

	return response, nil
}
