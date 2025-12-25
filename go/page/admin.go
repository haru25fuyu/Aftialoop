package page

import (
	"animaloop/config"
	"animaloop/function"
	"encoding/json"

	"net/http"

	"github.com/gorilla/mux"
)

// adminHandler は /admin 系のエンドポイントをまとめたハンドラです
type adminHandler struct {
	// ここに DB やサービスを注入しても OK
	db *function.Database
}

// NewAdminHandler はハンドラのコンストラクタ
func NewAdminHandler(db *function.Database) *adminHandler {
	return &adminHandler{
		db: db,
	}
}

// RegisterRoutes がルーティングの登録を行います
func (h *adminHandler) RegisterRoutes(r *mux.Router) {

}

func (h *adminHandler) UpdateFleaConfig(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BaseRate float64 `json:"base_rate"`
		MaxRate  float64 `json:"max_rate"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad json", 400)
		return
	}

	err := function.UpdateFleaConfig(r.Context(), h.db, config.FleaConfig{
		BaseRate: req.BaseRate,
		MaxRate:  req.MaxRate,
	})
	if err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
