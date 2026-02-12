package handler

import (
	SQL "animaloop/sql"
	"database/sql"
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
	// slug からカテゴリー情報を取得するエンドポイント
	r.HandleFunc("/api/category/lookup", h.LookupCategory).Methods("GET")

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

// ★フロントエンドに返すための統合された型 (DTO)
type SuggestionDTO struct {
	ID           uint64 `json:"id"`
	Name         string `json:"name"`
	FullPathName string `json:"full_path_name,omitempty"`

	Type string `json:"type"`

	IsSupply    bool   `json:"is_supply"`
	BuiltInType string `json:"built_in_type,omitempty"`

	ParentID       *uint64 `json:"parent_id,omitempty"`
	ParentName     string  `json:"parent_name,omitempty"`
	SupplyTypeID   *uint64 `json:"supply_type_id,omitempty"`
	SupplyTypeName string  `json:"supply_type_name,omitempty"`
	Slug           string  `json:"slug,omitempty"`
	FullSlugPath   string  `json:"full_slug_path,omitempty"`
}

// 2. カテゴリー検索 (GET /api/categories/search?keyword=...&type=SUPPLY)
func (h *CategoryHandler) Search(w http.ResponseWriter, r *http.Request) {
	keyword := r.URL.Query().Get("keyword")
	searchType := r.URL.Query().Get("type") // "ANIMAL" or "SUPPLY"

	if keyword == "" {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("[]"))
		return
	}

	var suggestions []SuggestionDTO

	// -----------------------------------------------------------
	// パターンA: 用品タブ (searchType=SUPPLY)
	// -----------------------------------------------------------
	if searchType == "SUPPLY" {
		results, err := h.db.SearchSupplies(keyword)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		for i, res := range results {
			// 用品のSlug決定
			supplySlug := res.SupplyTypeSlug
			if supplySlug == "" {
				supplySlug = "supply-" + strconv.FormatUint(res.SupplyTypeID, 10)
			}
			// 生体のSlug決定
			categorySlug := res.CategorySlug
			if categorySlug == "" {
				categorySlug = strconv.FormatUint(res.CategoryID, 10)
			}
			// 合体！ -> "dog/food"
			fullSlugPath := categorySlug + "/" + supplySlug

			dto := SuggestionDTO{
				// ★修正1: 100000+i ではなく、本当の用品IDを使う
				ID: res.SupplyTypeID,
				// ★修正2: フロントのバッジ表示のために明示的にセット
				Type: "supply",

				Name:         res.CategoryName + " > " + res.SupplyTypeName,
				FullPathName: "ペット用品 > " + res.CategoryName + " > " + res.SupplyTypeName,
				IsSupply:     true,
				BuiltInType:  "SUPPLY",

				ParentID:       &res.CategoryID,
				ParentName:     res.CategoryName,
				SupplyTypeID:   &res.SupplyTypeID,
				SupplyTypeName: res.SupplyTypeName,

				Slug:         supplySlug,
				FullSlugPath: fullSlugPath,
			}
			// Key重複回避のためのユニークID計算が必要ならフロント側でやるか、
			// ここではあくまで「データとしてのID」を返すのが正解。

			suggestions = append(suggestions, dto)
			_ = i // 未使用エラー回避
		}

	} else {
		// -----------------------------------------------------------
		// パターンB: グローバル検索バー (混合検索)
		// -----------------------------------------------------------
		results, err := h.db.SearchSuggestions(keyword)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		for _, item := range results {
			dto := SuggestionDTO{
				ID:           item.ID,
				Name:         item.Name,
				FullPathName: item.FullPathName,
				Slug:         item.Slug,
				FullSlugPath: item.FullSlugPath,
				// Type は下で判定して入れる
			}

			// ★ここ完璧です！
			if item.Type == "combination" {
				// フロントでは「用品(supply)」として振る舞わせる
				dto.Type = "supply"
				dto.IsSupply = true
				dto.BuiltInType = "SUPPLY"

				// URL生成に必要な情報は FullSlugPath に入っているが、
				// データとしてもIDを持たせておく
				dto.ParentID = &item.ID          // カテゴリーID (犬)
				dto.SupplyTypeID = item.SupplyID // 用品ID (フード)

			} else if item.Type == "supply" {
				dto.Type = "supply"
				dto.IsSupply = true
				dto.BuiltInType = "SUPPLY"
				dto.SupplyTypeID = item.SupplyID

			} else {
				// 通常の生体
				dto.Type = "category"
				dto.IsSupply = false
				if item.BuiltInType != nil {
					dto.BuiltInType = *item.BuiltInType
				}
			}

			suggestions = append(suggestions, dto)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(suggestions)
}

func (h *CategoryHandler) LookupCategory(w http.ResponseWriter, r *http.Request) {
	// 1. URLパラメータから slug を取得
	slug := r.URL.Query().Get("slug")
	if slug == "" {
		http.Error(w, `{"error": "slug is required"}`, http.StatusBadRequest)
		return
	}

	// 2. DB関数を呼び出す
	result, err := h.db.GetCategoryBySlug(slug)

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error": "category or supply not found"}`)) // エラー文言も少し修正
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			// JSONを手書きするときはエスケープに注意が必要ですが、簡易的にはこれでもOK
			// 本番なら json.NewEncoder でエラー構造体を返すと安全です
			w.Write([]byte(`{"error": "` + err.Error() + `"}`))
		}
		return
	}

	// 3. JSONで返す
	// ここで Type: "SUPPLY" などが含まれた JSON が返れば完璧！
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
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
