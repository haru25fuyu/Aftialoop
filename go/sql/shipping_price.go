package sql

import (
	"animaloop/config"
	"animaloop/utils"

	"context"
	"database/sql"
	"errors"
	"fmt"
)

// -----------------------------------------------------------
// 配送料金関係
// -----------------------------------------------------------
func (db *Database) EstimateShippingPrice(ctx context.Context, carrier string, temp string, size int, fromPref int, toPref int) (int, error) {
	if db.DB == nil {
		return 0, errors.New("db not ready")
	}

	var row *utils.ShippingRateRow
	var err error

	// ---------------------------------------------------
	// 1. 特例ルールのチェック（日本郵便 かつ 同一県内）
	// ---------------------------------------------------
	if fromPref == toPref {
		row, err = db.getLocalRateRow(ctx, carrier, temp, fromPref)
		if err != nil {
			row = nil
		}
	}

	// ---------------------------------------------------
	// 2. 通常のエリア検索ロジック（県内ルールで取れなかった場合）
	// ---------------------------------------------------
	if row == nil {
		row, err = db.getRateByPrefLookup(ctx, carrier, temp, fromPref, toPref)
		if err != nil {
			return 0, err
		}
	}

	// ---------------------------------------------------
	// 3. 取得した行からサイズに対応する価格を抽出
	// ---------------------------------------------------
	return ExtractPriceFromRow(row, size)
}

// -----------------------------------------------------------
// 内部メソッド: クエリ実行系
// -----------------------------------------------------------

// getRateByPrefLookup : 【通常時】配送先の「県コード」からJOINしてエリアを特定し、料金を取得する
func (db *Database) getRateByPrefLookup(ctx context.Context, carrier string, temp string, fromPref int, toPref int) (*utils.ShippingRateRow, error) {
	var out utils.ShippingRateRow

	query := `
		SELECT
			sr.carrier, sr.temp, sr.sender_pref_code, sr.receiver_area_id,
			sr.price_60, sr.price_80, sr.price_100, sr.price_120, sr.price_140,
			sr.source_version, sr.updated_at
		FROM shipping_rates sr
		/* 中間テーブルとエリアテーブルをJOINして、toPref (県) から area_id を特定 */
		INNER JOIN shipping_area_prefectures sap ON sr.receiver_area_id = sap.shipping_area_id
		INNER JOIN shipping_areas sa ON sap.shipping_area_id = sa.id
		WHERE sr.carrier = ? 
		  AND sr.temp = ? 
		  AND sr.sender_pref_code = ? 
		  AND sap.pref_code = ?       -- 配送先都道府県
		  AND sa.carrier = ?          -- エリア定義のキャリア整合性
		LIMIT 1
	`

	// carrierを2回渡す点に注意
	err := db.DB.QueryRowContext(ctx, query, carrier, temp, fromPref, toPref, carrier).Scan(
		&out.Carrier, &out.Temp, &out.SenderPrefCode, &out.ReceiverAreaID,
		&out.Price60, &out.Price80, &out.Price100, &out.Price120, &out.Price140,
		&out.SourceVersion, &out.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("shipping rate not found (std lookup): %w", err)
		}
		return nil, err
	}

	return &out, nil
}

// getLocalRateRow : 【県内時】「県内」エリアIDを解決して、直接そのIDで料金を取得する
func (db *Database) getLocalRateRow(ctx context.Context, carrier string, temp string, fromPref int) (*utils.ShippingRateRow, error) {
	// 1. エリアIDの解決 ("県内" という名前のエリアIDを探す)
	// ※ 頻繁に呼ばれるならキャッシュ推奨
	areaID, err := db.getAreaIDByName(ctx, carrier, config.AreaNameSamePref)
	if err != nil {
		return nil, err
	}

	// 2. 解決したエリアIDを使って料金を直接引く
	return db.getRateByDirectArea(ctx, carrier, temp, fromPref, areaID)
}

// getRateByDirectArea : エリアIDがわかっている場合に直接料金テーブルを引く
func (db *Database) getRateByDirectArea(ctx context.Context, carrier string, temp string, fromPref int, areaID int64) (*utils.ShippingRateRow, error) {
	var out utils.ShippingRateRow

	query := `
		SELECT
			carrier, temp, sender_pref_code, receiver_area_id,
			price_60, price_80, price_100, price_120, price_140,
			source_version, updated_at
		FROM shipping_rates
		WHERE carrier = ? 
		  AND temp = ? 
		  AND sender_pref_code = ? 
		  AND receiver_area_id = ?
		LIMIT 1
	`

	err := db.DB.QueryRowContext(ctx, query, carrier, temp, fromPref, areaID).Scan(
		&out.Carrier, &out.Temp, &out.SenderPrefCode, &out.ReceiverAreaID,
		&out.Price60, &out.Price80, &out.Price100, &out.Price120, &out.Price140,
		&out.SourceVersion, &out.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}
	return &out, nil
}

// getAreaIDByName : エリア名からIDを取得するヘルパー
func (db *Database) getAreaIDByName(ctx context.Context, carrier string, name string) (int64, error) {
	var id int64
	query := "SELECT id FROM shipping_areas WHERE carrier = ? AND name = ? LIMIT 1"
	err := db.DB.QueryRowContext(ctx, query, carrier, name).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

// -----------------------------------------------------------
// ヘルパーメソッド: データ抽出
// -----------------------------------------------------------

func ExtractPriceFromRow(row *utils.ShippingRateRow, size int) (int, error) {
	var v sql.NullInt64
	switch size {
	case 60:
		v = row.Price60
	case 80:
		v = row.Price80
	case 100:
		v = row.Price100
	case 120:
		v = row.Price120
	case 140:
		v = row.Price140
	default:
		return 0, fmt.Errorf("unsupported size: %d", size)
	}

	if !v.Valid {
		return 0, errors.New("price not set for this size")
	}

	return int(v.Int64), nil
}
