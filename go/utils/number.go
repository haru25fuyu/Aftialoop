package utils

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

func ParseUint(s string) (uint64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, fmt.Errorf("empty string")
	}
	u, err := strconv.ParseUint(s, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid uint64: %w", err)
	}
	return u, nil
}

func ParseInt(s string, def int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return n
}
func ParseOptInt(s string) *int {
	if s == "" {
		return nil
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return nil
	}
	return &n
}
func ParseOptInt64(s string) *int64 {
	if s == "" {
		return nil
	}
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return nil
	}
	return &n
}
func ParseFloat(s string, def float64) float64 {
	if s == "" {
		return def
	}
	n, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return def
	}
	return n
}
func ParseBool(s string) bool {
	switch s {
	case "1", "true", "TRUE", "True", "on", "yes":
		return true
	default:
		return false
	}
}

func NormalizeEnum(s string) string {
	return strings.ToUpper(strings.TrimSpace(s))
}

func IsOneOf(v string, allowed ...string) bool {
	v = NormalizeEnum(v)
	for _, a := range allowed {
		if v == a {
			return true
		}
	}
	return false
}

func IsDuplicateErr(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "Duplicate entry") || strings.Contains(msg, "Error 1062")
}

// string/float64/int/json.Number なんでも受けて int64 にする
func ToInt64(v any) (int64, error) {
	switch t := v.(type) {
	case nil:
		return 0, errors.New("nil")
	case float64:
		return int64(t), nil
	case float32:
		return int64(t), nil
	case int:
		return int64(t), nil
	case int64:
		return t, nil
	case json.Number:
		return t.Int64()
	case string:
		s := strings.TrimSpace(t)
		if s == "" {
			return 0, errors.New("empty")
		}
		// 数字文字列のみ想定
		n, err := strconv.ParseInt(s, 10, 64) // utils に無ければ strconv.ParseInt(s,10,64) に変えて
		if err != nil {
			return 0, err
		}
		return n, nil
	default:
		return 0, errors.New("unsupported type")
	}
}
