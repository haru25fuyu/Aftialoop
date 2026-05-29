package handler

import (
	"animaloop/utils"
	"encoding/json"
	"strconv"
	"strings"
)

// ============================================================
// 詳細JSONのパース（過渡期の橋渡し）
//
// フロントは現状、カテゴリごとに異なるキー名で details JSON を送ってくる:
//   爬虫類: morph / birth_date / lineage
//   植物:   origin / acquisition_date / propagation
//   魚:     origin / arrival_date / generation
//   哺乳類: origin / birth_date / lineage
//   昆虫:   locality / hatch_date / generation
// さらに size は "12.5cm" のような連結文字列、または size_value/size_unit。
//
// ここで共通キー（locality / hatch_date / generation / size_value / size_unit / sex）に
// 正規化して utils.AnimalDetails / SupplyDetails に詰める。
// フロントを共通キー送信に整理したら、この吸収ロジックは単純化できる。
// ============================================================

// rawDetails は details JSON を緩く受けるための入れ物。
// 同義キーを全部 optional で持ち、後段で最初に見つかった値を採用する。
type rawDetails struct {
	Kind string `json:"kind"`

	// locality 系
	Locality string `json:"locality"`
	Morph    string `json:"morph"`
	Origin   string `json:"origin"`

	// hatch_date 系
	HatchDate       string `json:"hatch_date"`
	BirthDate       string `json:"birth_date"`
	AcquisitionDate string `json:"acquisition_date"`
	ArrivalDate     string `json:"arrival_date"`

	// generation 系
	Generation  string `json:"generation"`
	Lineage     string `json:"lineage"`
	Propagation string `json:"propagation"`

	// size: 新形式（数値+単位）と旧形式（連結文字列）の両対応
	SizeValue *float64 `json:"size_value"`
	SizeUnit  string   `json:"size_unit"`
	Size      string   `json:"size"` // 旧: "12.5cm" 等

	Sex string `json:"sex"`

	// 用品
	Brand      string `json:"brand"`
	SKU        string `json:"sku"`
	NetWeightG *int   `json:"net_weight_g"`
}

// firstNonEmpty は引数のうち最初の非空文字列を返す。
func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

// strPtr は空文字なら nil、それ以外はそのポインタを返す。
func strPtr(s string) *string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return &s
}

// parseSize は size_value/size_unit を決定する。
// 新形式（SizeValue/SizeUnit）があればそれを優先。なければ旧形式 "12.5cm" を分解する。
func parseSize(r rawDetails) (*float64, *string) {
	if r.SizeValue != nil {
		var unit *string
		if r.SizeUnit != "" {
			u := r.SizeUnit
			unit = &u
		}
		return r.SizeValue, unit
	}
	// 旧形式 "12.5cm" → 数値部と単位部に分解
	s := strings.TrimSpace(r.Size)
	if s == "" {
		return nil, nil
	}
	i := 0
	for i < len(s) && (s[i] == '.' || s[i] == '-' || (s[i] >= '0' && s[i] <= '9')) {
		i++
	}
	numPart := s[:i]
	unitPart := strings.TrimSpace(s[i:])
	if numPart == "" {
		return nil, strPtr(unitPart)
	}
	v, err := strconv.ParseFloat(numPart, 64)
	if err != nil {
		return nil, strPtr(unitPart)
	}
	return &v, strPtr(unitPart)
}

// parseAnimalDetails は details JSON（生体）を AnimalDetails に正規化する。
// 何も中身が無ければ nil を返す（保存スキップ）。
func parseAnimalDetails(detailsJSON string) *utils.AnimalDetails {
	if strings.TrimSpace(detailsJSON) == "" {
		return nil
	}
	var r rawDetails
	if err := json.Unmarshal([]byte(detailsJSON), &r); err != nil {
		return nil
	}

	locality := firstNonEmpty(r.Locality, r.Morph, r.Origin)
	hatchDate := firstNonEmpty(r.HatchDate, r.BirthDate, r.AcquisitionDate, r.ArrivalDate)
	generation := firstNonEmpty(r.Generation, r.Lineage, r.Propagation)
	sizeValue, sizeUnit := parseSize(r)

	ad := &utils.AnimalDetails{
		Locality:   strPtr(locality),
		HatchDate:  strPtr(hatchDate),
		Generation: strPtr(generation),
		SizeValue:  sizeValue,
		SizeUnit:   sizeUnit,
		Sex:        strPtr(r.Sex),
	}

	// 全部空なら nil（保存しない）
	if ad.Locality == nil && ad.HatchDate == nil && ad.Generation == nil &&
		ad.SizeValue == nil && ad.SizeUnit == nil && ad.Sex == nil {
		return nil
	}
	return ad
}

// parseSupplyDetails は details JSON（用品）を SupplyDetails に正規化する。
func parseSupplyDetails(detailsJSON string) *utils.SupplyDetails {
	if strings.TrimSpace(detailsJSON) == "" {
		return nil
	}
	var r rawDetails
	if err := json.Unmarshal([]byte(detailsJSON), &r); err != nil {
		return nil
	}

	sd := &utils.SupplyDetails{
		Brand:      strPtr(r.Brand),
		SKU:        strPtr(r.SKU),
		NetWeightG: r.NetWeightG,
	}

	if sd.Brand == nil && sd.SKU == nil && sd.NetWeightG == nil {
		return nil
	}
	return sd
}