package sql

import (
	"database/sql"
	"fmt"
	"log"
	"time"
	"animaloop/utils"
	"animaloop/config"

	_ "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"github.com/dgrijalva/jwt-go"
)

var db *sql.DB

type User struct {
	ID    string
	Email string
	Name  string
	Password string
	Limit string
}

// Initialize DB connection
func init() {
	var err error
	dsn := "user:password@tcp(localhost:3306)/yourdatabase"
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
}

func EmailCheck(email string) (bool, error) {
	query := "SELECT COUNT(*) > 0 FROM users WHERE email = ?"
		row := config.DB.QueryRow(query, user.Email)
		var exists bool
		err = row.Scan(&exists)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return false, err
		}
	return exists, nil
}

func SetRegistrationToken(user User) (string, error) {
	token := GenerateToken(user)
	expiresAt := time.Now().Add(user.Limit * time.Hour)

	//同じemailのトークンがあれば削除
	_, err := db.Exec("DELETE FROM user_registration_tokens WHERE email = ?", user.Email)
	if err != nil {
		return "", err
	}

	_, err := db.Exec("INSERT INTO user_registration_tokens (id, email, password, token, expires_at) VALUES (?, ?, ?, ?, ?)", user.Id, user.Email, user.Password, token, expiresAt)
	if err != nil {
		return "", err
	}
	return token, nil
}

func GetUserFromRegistrationToken(token string ) (map[string]interface{}, error) {
	var userId, email, password, registrationToken string
	var expiresAt time.Time
	err := db.QueryRow("SELECT id, email, password, token, expires_at FROM user_registration_tokens WHERE token = ?", token).Scan(&userId, &email, &password, &registrationToken, &expiresAt)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"id":           userId,
		"email":        email,
		"password":     password,
		"token":        registrationToken,
		"expires_at":   expiresAt,
	}, nil
}

func DeleteRegistrationToken(token string) error {
	_, err := db.Exec("DELETE FROM user_registration_tokens WHERE token = ?", token)
	return err
}

func SaveUser(user map[string]interface{}) error {
	// Generate columns and values
	columns := []string{}
	values := []interface{}{}
	for key, value := range user {
		columns = append(columns, key)
		values = append(values, value)
	}

	// SQL query
	placeholders := "?"
	for i := 1; i < len(columns); i++ {
		placeholders += ", ?"
	}
	query := fmt.Sprintf("INSERT INTO users (%s) VALUES (%s)", join(columns, ","), placeholders)

	_, err := db.Exec(query, values...)
	return err
}

func GetUserData(where []string, values []interface{}) (map[string]interface{}, error) {
	query := "SELECT * FROM users"
	if len(where) > 0 {
		query += " WHERE " + join(where, " AND ")
	}

	row := db.QueryRow(query, values...)
	var userId, email, password string
	err := row.Scan(&userId, &email, &password)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, err
	}
	return map[string]interface{}{
		"id":       userId,
		"email":    email,
		"password": password,
	}, nil
}

func UpdateUser(id string, user map[string]interface{}) error {
	setClauses := []string{}
	values := []interface{}{}
	for key, value := range user {
		setClauses = append(setClauses, fmt.Sprintf("%s = ?", key))
		values = append(values, value)
	}

	query := fmt.Sprintf("UPDATE users SET %s WHERE id = ?", join(setClauses, ","))
	values = append(values, id)
	_, err := db.Exec(query, values...)
	return err
}

func join(arr []string, separator string) string {
	result := ""
	for i, val := range arr {
		if i != 0 {
			result += separator
		}
		result += val
	}
	return result
}