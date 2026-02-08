package handler

import (
	SQL "animaloop/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

type CategoryHandler struct {
	db *SQL.Database
}

func NewCategoryHandler(db *SQL.Database) *CategoryHandler {
	return &CategoryHandler{db: db}
}

// ルーティング登録
func (h *CategoryHandler) RegisterRoutes(r *mux.Router) {
	// 生物カテゴリー系
	r.HandleFunc("/api/categories/children", h.GetChildren).Methods("GET") // 階層用
	r.HandleFunc("/api/categories/search", h.Search).Methods("GET")        // 検索用

	// 用品系
	r.HandleFunc("/api/supply-types", h.GetSupplyTypes).Methods("GET")
}

// 1. 子供カテゴリー取得 (GET /api/categories/children?parent_id=1)
func (h *CategoryHandler) GetChildren(w http.ResponseWriter, r *http.Request) {
	parentIDStr := r.URL.Query().Get("parent_id")
	var parentID *uint64

	if parentIDStr != "" {
		pid, err := strconv.ParseUint(parentIDStr, 10, 64)
		if err != nil {
			http.Error(w, "invalid parent_id", http.StatusBadRequest)
			return
		}
		parentID = &pid
	}

	categories, err := h.db.GetCategoriesByParentID(parentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

// 2. カテゴリー検索 (GET /api/categories/search?keyword=ケイスケ)
func (h *CategoryHandler) Search(w http.ResponseWriter, r *http.Request) {
	keyword := r.URL.Query().Get("keyword")
	if keyword == "" {
		// 空検索なら空配列を返す
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("[]"))
		return
	}

	categories, err := h.db.SearchCategories(keyword)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

// 3. 用品種別一覧 (GET /api/supply-types)
func (h *CategoryHandler) GetSupplyTypes(w http.ResponseWriter, r *http.Request) {
	types, err := h.db.GetSupplyTypes()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(types)
}
