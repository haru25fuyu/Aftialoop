package function

import (
	"animaloop/config"
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

// Initialize DB connection
func init() {
    var err error
	user := "app-user"
	password := `q+b4(F}{bH"LzSQm`
	database := "Animaloop"

	encodedPassword := url.QueryEscape(password)

    dsn := fmt.Sprintf("%s:%s@tcp(localhost:3306)/%s", user, encodedPassword, database)

	config.DB, err = sqlx.Open("mysql", dsn)
	if err != nil {
		log.Fatal("MySQL connection error:", err)
	}
}

func EmailCheck(email string) (bool, error) {
	var count int
	err := config.DB.Get(&count, "SELECT COUNT(*) FROM users WHERE email = ?", email)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func SetRegistrationToken(user User) (string, error) {
	token,err := GenerateToken(user)
	_, err = config.DB.Exec("INSERT INTO user_registration_tokens (email, password, token, expires_at) VALUES (?, ?, ?, ?)", user.Email, user.Password, token, time.Now().Add(24*time.Hour))
	return token, err
}

func GetUserFromRegistrationToken(token string) (map[string]interface{}, error) {
	query := "SELECT email, password FROM user_registration_tokens WHERE token = ? AND expires_at > ?"

	var resurlt map[string]interface{}
	err := config.DB.Get(&resurlt, query, token, time.Now())

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("invalid token")
		}
		return nil, err
	}
	return resurlt, nil
}

func DeleteRegistrationToken(token string) error {
	_, err := config.DB.Exec("DELETE FROM user_registration_tokens WHERE token = ?", token)
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
	
	_, err := config.DB.Exec(query, values...)
	return err
}

func GetUserData(where []string, values []interface{}) (map[string]interface{}, error) {
    query := "SELECT * FROM users"
    if len(where) > 0 {
        query += " WHERE " + join(where, " AND ")
    }
    var user map[string]interface{}
    err := config.DB.Get(&user, query, values...)
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, fmt.Errorf("user not found")
        }
        return nil, err
    }
    return user, nil
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
    _, err := config.DB.Exec(query, values...)
    return err
}

func SaveProfile(id string, profile map[string]interface{}) error {
    // Generate columns and values
    columns := []string{"user_id"}
    values := []interface{}{id}
    for key, value := range profile {
        columns = append(columns, key)
        values = append(values, value)
    }

    // SQL query
    placeholders := "?"
    for i := 1; i < len(columns); i++ {
        placeholders += ", ?"
    }
    query := fmt.Sprintf("INSERT INTO profile (%s) VALUES (%s)", join(columns, ","), placeholders)

    _, err := config.DB.Exec(query, values...)
    return err
}

func GetProfile(id string) (map[string]interface{}, error) {
    query := "SELECT * FROM profile WHERE user_id = ?"
    var profile map[string]interface{}
    err := config.DB.Get(&profile, query, id)
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, fmt.Errorf("profile not found")
        }
        return nil, err
    }
    return profile, nil
}

func UpdateProfile(id string, profile map[string]interface) error {
    setClauses := []string{}
    values := []interface{}{}
    for key, value := range profile {
        setClauses = append(setClauses, fmt.Sprintf("%s = ?", key))
        values = append(values, value)
    }

    query := fmt.Sprintf("UPDATE profile SET %s WHERE user_id = ?", join(setClauses, ","))
    values = append(values, id)
    _, err := config.DB.Exec(query, values...)
    return  err
}


func GetUserDataAndProfile(where []string, values []interface{}) (map[string]interface{}, error) {
    query := "SELECT u.*, p.* FROM users u LEFT JOIN profile p ON u.id = p.user_id"
    if len(where) > 0 {
        query += " WHERE " + join(where, " AND ")
    }

    var user map[string]interface{}
    err := config.DB.Get(&user, query, values...)
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, fmt.Errorf("user not found")
        }
        return nil, err
    }
    return user, nil
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
