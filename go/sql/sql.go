package sql

import (
	"animaloop/config"
	"fmt"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

type Database struct {
	DB *sqlx.DB
}

// ============================================================
// DB 初期化
// ============================================================

func NewDatabase() (*Database, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=%s&parseTime=true",
		config.DB_user,
		config.DB_password,
		config.DB_host,
		config.DB_port,
		config.DB_name,
		config.DB_charset,
	)

	db, err := sqlx.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("MySQL connection error: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("MySQL ping failed: %w", err)
	}

	return &Database{DB: db}, nil
}
