package sql

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"os"
	"database/sql"
)

type Database struct {
	DB *sqlx.DB
}

// ============================================================
// DB 初期化
// ============================================================

func NewDatabase() (*Database, error) {
	dsn := os.Getenv("DB_SOURCE")
	if dsn == "" {
		// 万が一空だった時の予備
		dsn = "postgresql://test_user:fP4!7zzYWfTW@db:5432/test_db?sslmode=disable"
	}

	// 第1引数を "postgres" に変更！
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("PostgreSQL connection error: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("PostgreSQL ping failed: %w", err)
	}

	return &Database{DB: sqlx.NewDb(db, "postgres")}, nil
}
