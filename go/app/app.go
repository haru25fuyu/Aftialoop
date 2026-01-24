// app/app.go
package app

import (
	"context"
	"net/http"

	SQL "animaloop/sql"
)

type App struct {
	Cache *SlugCache
	Mux   *http.ServeMux
	db    *SQL.Database
}

func New(ctx context.Context, db *SQL.Database) (*App, error) {
	cache := NewSlugCache()
	if err := cache.Reload(ctx); err != nil {
		return nil, err
	}
	a := &App{
		Cache: cache,
		Mux:   http.NewServeMux(),
		db:    db,
	}
	a.routes()
	return a, nil
}

func (a *App) routes() {
	a.Mux.HandleFunc("/api/v1/items/search", a.ListItemsHandler)
	// 管理API（任意）: a.Mux.HandleFunc("/admin/cache/reload", a.ReloadCacheHandler)
}
