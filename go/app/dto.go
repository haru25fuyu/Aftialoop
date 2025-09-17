// app/dto.go
package app

import (
	"animaloop/utils"
	"fmt"
)

const (
	SortByPrice  = "price"
	SortByNewest = "newest"
	SortAsc      = "asc"
	SortDesc     = "desc"
)

type ListItemsRequest struct {
	Category    *string  `json:"category"`
	SubCategory *string  `json:"subCategory"`
	SearchQuery *string  `json:"searchQuery"`
	MinPrice    *float64 `json:"minPrice"`
	MaxPrice    *float64 `json:"maxPrice"`
	SortBy      *string  `json:"sortBy"`    // "price" / "newest"
	SortOrder   *string  `json:"sortOrder"` // "asc" / "desc"
	Page        *int     `json:"page"`
	PageSize    *int     `json:"pageSize"`
}

func (r *ListItemsRequest) Resolve(cache *SlugCache) (utils.ListItemsRequest, error) {
	var p utils.ListItemsRequest

	// デフォルト
	p.SortBy, p.SortOrder = SortByNewest, SortDesc
	p.Page, p.PageSize = 1, 20

	// オプション上書き
	if r.SearchQuery != nil {
		p.SearchQuery = r.SearchQuery
	}
	if r.MinPrice != nil {
		p.MinPrice = r.MinPrice
	}
	if r.MaxPrice != nil {
		p.MaxPrice = r.MaxPrice
	}
	if r.SortBy != nil && (*r.SortBy == SortByPrice || *r.SortBy == SortByNewest) {
		p.SortBy = *r.SortBy
	}
	if r.SortOrder != nil && (*r.SortOrder == SortAsc || *r.SortOrder == SortDesc) {
		p.SortOrder = *r.SortOrder
	}
	if r.Page != nil && *r.Page > 0 {
		p.Page = *r.Page
	}
	if r.PageSize != nil && *r.PageSize > 0 && *r.PageSize <= 100 {
		p.PageSize = *r.PageSize
	}

	// slug → ID（※DBには行かない）
	if r.Category != nil && *r.Category != "" {
		if id, ok := cache.AnimalID(*r.Category); ok {
			p.CategoryID = &id
		} else {
			return p, fmt.Errorf("category slug not found: %s", *r.Category) // ハンドラで404
		}
	}
	if r.SubCategory != nil && *r.SubCategory != "" {
		if id, ok := cache.SubCategoryID(*r.SubCategory); ok {
			p.SubCategoryID = &id
		} else {
			return p, fmt.Errorf("subCategory slug not found: %s", *r.SubCategory)
		}
	}
	return p, nil
}
