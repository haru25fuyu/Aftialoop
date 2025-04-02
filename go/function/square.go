package function

import (
	"animaloop/config"
	"context"
	"fmt"
	"log"

	square "github.com/square/square-go-sdk"
	client "github.com/square/square-go-sdk/client"
	option "github.com/square/square-go-sdk/option"
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
			config.SQUARE_ACCESS_TOKEN,
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
