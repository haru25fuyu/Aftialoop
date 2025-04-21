package function

import (
	"animaloop/config"
	"context"
	"fmt"
	"log"

	square "github.com/square/square-go-sdk"
	client "github.com/square/square-go-sdk/client"
	option "github.com/square/square-go-sdk/option"
	"github.com/google/uuid"
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
	client := client.NewClient(
		option.WithBaseURL(
			square.Environments.Sandbox,
		),
		option.WithToken(
			SQUARE_SANDBOX_TOKEN,
		),
	)
	response, err := client.Customers.Search(
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
	client := client.NewClient(
		option.WithBaseURL(
			square.Environments.Sandbox,
		),
		option.WithToken(
			SQUARE_SANDBOX_TOKEN,
		),
	)
	
	response, err :=client.Cards.Create(
		context.TODO(),
		&square.CreateCardRequest{
			IdempotencyKey:  uuid.New().String(),
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
