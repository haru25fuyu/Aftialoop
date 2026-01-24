package sql

import (
	"animaloop/config"
	"context"
	"errors"
	"fmt"
	"log"
	"strconv"
	"time"
)

// ============================================================
// Flea config (system_settings)
// ============================================================

func (d *Database) LoadFleaConfig() (*config.FleaConfig, error) {
	rows, err := d.DB.Query(`
		SELECT ` + "`key`, `value`, `updated_at`" + `
		FROM system_settings
		WHERE ` + "`key`" + ` IN ('flea.base_rate', 'flea.max_rate','flea.rate_den','flea.commission_rate')
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cfg := &config.FleaConfig{}
	var updatedAt time.Time
	var rateDenominator int64 = 10000 // デフォルト値を設定

	for rows.Next() {
		var k, v string
		var ua time.Time
		if err := rows.Scan(&k, &v, &ua); err != nil {
			return nil, err
		}

		switch k {
		case "flea.base_rate":
			f, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("invalid base_rate: %w", err)
			}
			cfg.BaseRate = f
			updatedAt = ua

		case "flea.max_rate":
			f, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("invalid max_rate: %w", err)
			}
			cfg.MaxRate = f
			updatedAt = ua
		case "flea.rate_den":
			rateDenominator, err = strconv.ParseInt(v, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("invalid rate_den: %w", err)
			}
			cfg.RateDen = rateDenominator
			updatedAt = ua
		case "flea.commission_rate":
			f, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return nil, fmt.Errorf("invalid commission_rate: %w", err)
			}
			cfg.CommissionRate = f
			updatedAt = ua
		default:
			log.Println("Unknown flea config key:", k)
		}
	}

	if cfg.BaseRate <= 0 || cfg.MaxRate <= 0 || cfg.CommissionRate <= 0 {
		return nil, errors.New("flea config is incomplete")
	}
	if cfg.BaseRate > cfg.MaxRate {
		return nil, errors.New("base_rate > max_rate")
	}
	if rateDenominator <= 0 {
		return nil, errors.New("rate_den must be > 0")
	}

	cfg.UpdatedAt = updatedAt
	return cfg, nil
}

func (d *Database) SaveFleaConfig(ctx context.Context, cfg config.FleaConfig) error {
	if cfg.BaseRate <= 0 {
		return errors.New("base_rate must be > 0")
	}
	if cfg.MaxRate <= 0 {
		return errors.New("max_rate must be > 0")
	}
	if cfg.BaseRate > cfg.MaxRate {
		return errors.New("base_rate > max_rate")
	}

	tx, err := d.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	upsert := `
		INSERT INTO system_settings (` + "`key`, `value`" + `)
		VALUES (?, ?)
		ON DUPLICATE KEY UPDATE
			value = VALUES(value),
			updated_at = CURRENT_TIMESTAMP
	`

	if _, err := tx.ExecContext(ctx, upsert,
		"flea.base_rate",
		strconv.FormatInt(cfg.BaseRate, 10),
	); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, upsert,
		"flea.max_rate",
		strconv.FormatInt(cfg.MaxRate, 10),
	); err != nil {
		return err
	}

	return tx.Commit()
}
