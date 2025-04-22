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
		log.Fatalf("Error creating card: %v", err)
		return "", err
	}

	return *response.Card.ID, nil
}

func ChargeCard(customerID, cardID string, amount int64) error {
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
            SourceID: cardID,
            Autocomplete: square.Bool(
                true,
            ),
            CustomerID: square.String(
                customerID,
            ),
        },
    )
	if err != nil {
		return fmt.Errorf("支払い失敗: %v", err)
	}
	if err != nil {
		return fmt.Errorf("支払い失敗: %v", err)
	}

	log.Printf("支払い成功！取引ID: %s", resp.Payment.ID)
	return nil
}
