package function

import (
	"animaloop/config"
	"context"
	"fmt"
	"log"

	"github.com/google/uuid"
	square "github.com/square/square-go-sdk"
)

func CreateCustomer(user SqlUser) (string, error) {
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

func CreateCard(card RequestCard) (string, error) {
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

func ChargeCard(customerID, cardID string, amount int64) (string, error) {
	fmt.Println("SourceID:", customerID)
	resp, err := config.SquareClient.Payments.Create(
		context.TODO(),
		&square.CreatePaymentRequest{
			AmountMoney: &square.Money{
				Amount: square.Int64(
					amount,
				),
				Currency: square.CurrencyJpy.Ptr(),
			},
			IdempotencyKey: uuid.New().String(),
			SourceID:       cardID,
			Autocomplete: square.Bool(
				true,
			),
			CustomerID: square.String(
				customerID,
			),
		},
	)

	return *resp.Payment.ReceiptURL, err
}

func GetCardList(customerID string) ([]CardSummary, error) {
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
	summaries := []CardSummary{}

	iter := response.Iterator()

	for iter.Next(context.TODO()) {
		card := iter.Current()
		summaries = append(summaries, CardSummary{
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

func GetCardByID(cardID string) (*square.GetCardResponse , error) {
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