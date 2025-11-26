package utils

import (
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
