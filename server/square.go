package square

import (
	"context"
	"fmt"
	"log"
	"animaloop/config"

	client "github.com/square/square-go-sdk/client"
	option "github.com/square/square-go-sdk/option"
	square "github.com/square/square-go-sdk"
)

func CreateCustomer(user map[string]interface{}) {
	client := client.NewClient(
        option.WithBaseURL(
            square.Environments.Sandbox,
        ),
        option.WithToken(
			config.SQUARE_ACCESS_TOKEN,
        ),
    )
    response, err := client.Customers.Create(
        context.TODO(),
        &square.CreateCustomerRequest{
            EmailAddress: square.String(
                user["email"].(string),
            ),
            Nickname: square.String(
                user["name"].(string),
            ),
        },
    )
	if err != nil {
		log.Fatalf("Error creating customer: %v", err)
		return //nil
	}
	
	log.Printf(response.Customer)

	return //response.Customer
}

func CheckSquareEmail(email string) bool{
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
		for _, customer := range *response.Customers {
			fmt.Printf("Customer ID: %s, Email: %s\n", customer.Id, *customer.EmailAddress)
			return true
		}
	} else {
		fmt.Println("No customers found.")
		return false
	}
}