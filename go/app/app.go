<<<<<<< HEAD
// app/app.go
package app

import (
	"animaloop/function"
	"context"
	"net/http"
)

type App struct {
	Cache *SlugCache
	Mux   *http.ServeMux
	db    *function.Database
}

func New(ctx context.Context, db *function.Database) (*App, error) {
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
=======
// app/app.go
package app

import (
	"animaloop/function"
	"context"
	"net/http"
)

type App struct {
	Cache *SlugCache
	Mux   *http.ServeMux
	db    *function.Database
}

func New(ctx context.Context, db *function.Database) (*App, error) {
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
>>>>>>> 7e5800f5 (Refactor user data handler to use dependency injection for database access and improve error handling)
