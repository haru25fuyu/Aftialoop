package app

import (
	"encoding/json"
	"net/http"
)

func (a *App) ListItemsHandler(w http.ResponseWriter, r *http.Request) {
	var req ListItemsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	params, err := req.Resolve(a.Cache)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	// DB はアプリ層で解決した検索パラメータを受け取る
	items, total, err := a.db.ListItems(params)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]any{
		"items": items, "total": total,
		"page": params.Page, "pageSize": params.PageSize,
	})
}
