package handler

import (
	SQL "animaloop/sql"
	"database/sql"
	"encoding/json"
	"log"
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

	// === 生物カテゴリー系 ===
	// 階層取得: /api/categories/children?parent_id=1
	r.HandleFunc("/api/categories/children", h.GetChildren).Methods("GET")
	// ルート取得: /api/categories/roots (GetChildrenのparent_id無し版として処理させても良いが明示的に分けるなら)
	r.HandleFunc("/api/categories/roots", h.GetChildren).Methods("GET")
	// 検索用
	r.HandleFunc("/api/categories/search", h.Search).Methods("GET")

	// === 用品系 ===
	// 1. 用品の種類一覧 (例: フード、ケージ)
	r.HandleFunc("/api/supply-types", h.GetSupplyTypes).Methods("GET")

	// 2. 用品選択後のカテゴリーツリー取得用
	// フロントエンドのモーダル実装に合わせてエンドポイントを追加
	// 例: /api/supply-categories?supply_type_id=1 (ルート)
	// 例: /api/supply-categories/123/children?supply_type_id=1 (子階層)
	r.HandleFunc("/api/supply-categories", h.GetSupplyCategoryChildren).Methods("GET")
	r.HandleFunc("/api/supply-categories/{id}/children", h.GetSupplyCategoryChildren).Methods("GET")
}

// 1. 子供カテゴリー取得 (GET /api/categories/children?parent_id=1)
func (h *CategoryHandler) GetChildren(w http.ResponseWriter, r *http.Request) {
	parentIDStr := r.URL.Query().Get("parent_id")
	var parentID *uint64

	if parentIDStr != "" {
		pid, err := strconv.ParseUint(parentIDStr, 10, 64)
		if err != nil {
			log.Printf("[get children] invalid parent_id: %v", err)
			http.Error(w, "invalid parent_id", http.StatusBadRequest)
			return
		}
		parentID = &pid
	}

	categories, err := h.db.GetCategoriesByParentID(parentID)
	if err != nil {
		log.Printf("[get children] db error: %v", err)
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
			log.Printf("[search supplies] error: %v", err)
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
				ID: res.SupplyTypeID,
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
			log.Printf("[search suggestions] error: %v", err)
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
		log.Printf("[lookup category] missing slug parameter")
		http.Error(w, `{"error": "slug is required"}`, http.StatusBadRequest)
		return
	}

	// 2. DB関数を呼び出す
	result, err := h.db.GetCategoryBySlug(slug)

	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		if err == sql.ErrNoRows {
			w.WriteHeader(http.StatusNotFound)
			//エラーをログに
			log.Printf("[lookup category] not found for slug: %s", slug)
			w.Write([]byte(`{"error": "category or supply not found"}`)) // エラー文言も少し修正
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			// JSONを手書きするときはエスケープに注意が必要ですが、簡易的にはこれでもOK
			// 本番なら json.NewEncoder でエラー構造体を返すと安全です
			log.Printf("[lookup category] db error: %v", err)
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

// ---------------------------------------------------
//
//	用品フロー用のカテゴリー取得ハンドラ
//
// ---------------------------------------------------
func (h *CategoryHandler) GetSupplyCategoryChildren(w http.ResponseWriter, r *http.Request) {
	// パスパラメータからIDを取得 ( /children の場合)
	vars := mux.Vars(r)
	parentIDStr := vars["id"]

	// クエリパラメータからIDを取得 ( /supply-categories?supply_type_id=... のような場合への対応も兼ねるなら)
	// 現在のフロント実装では、第2階層(ルート)呼び出し時はパラメータなしか query で判定しているので
	// ここでは mux.Vars を優先しつつ、なければ nil (ルート) とする。

	var parentID *uint64
	if parentIDStr != "" {
		pid, err := strconv.ParseUint(parentIDStr, 10, 64)
		if err != nil {
			http.Error(w, "invalid category id", http.StatusBadRequest)
			return
		}
		parentID = &pid
	}

	// supply_type_id も受け取れるようにしておく（将来的に「この用品はこの動物にはない」等のフィルタをする場合に備えて）
	// 現状はフィルタせず、純粋なカテゴリーツリーを返す
	_ = r.URL.Query().Get("supply_type_id")

	// DBからカテゴリー取得 (既存のロジックを再利用)
	categories, err := h.db.GetCategoriesByParentID(parentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// フロントエンドのモーダルは `has_children` プロパティを期待しているため、
	// Goの構造体(Category)がJSONになるときにそのフィールドが含まれるか確認が必要です。
	// SQL側の定義を見ると `Path` や `Rank` はありますが `has_children` はDBカラムにはない計算プロパティかもしれません。
	// もしDB側で計算していないなら、ここで付与するか、フロント側で「子がいればさらにAPIを叩く」形式にする必要があります。
	// (一般的にはAPI側で `has_children` フラグを返すのが親切です)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}
