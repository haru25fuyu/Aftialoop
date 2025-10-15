package page

import (
	"animaloop/function"
	"animaloop/utils"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// flea market Handler は /flea-market 系のエンドポイントをまとめたハンドラです
type FleaMarketHandler struct {
	db *function.Database
}

// NewFleaMarketHandler はハンドラのコンストラクタ
func NewFleaMarketHandler(db *function.Database) *FleaMarketHandler {
	return &FleaMarketHandler{
		db: db,
	}
}

// RegisterRoutes がルーティングの登録を行います
func (h *FleaMarketHandler) RegisterRoutes(r *mux.Router) {
	// POST /flea-market
	r.HandleFunc("/flea-market/list", h.ListFleaMarket).Methods("POST")
	r.HandleFunc("/flea-market/add/item", h.CreateFleaItem).Methods("POST")
}

// GET /flea-market/list?limit=20&offset=0 でもOK（POSTならBodyから取得）
func (h *FleaMarketHandler) ListFleaMarket(w http.ResponseWriter, r *http.Request) {
	limit, offset := 20, 0

	items, err := h.db.ListFleaMarketItems(limit, offset)
	if err != nil {
		log.Println("failed to fetch flea items:", err)
		http.Error(w, "failed to fetch items", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(items)
}

// POST /flea/items  (React から FormData で送られてくる前提)
// fields:
//   - name, description, price, quantity
//   - is_multi_purchasable (0/1 or "true"/"false")
//   - item_state, category_id (任意), shipping_fee_type, ship_from, ships_within_days (任意), main_index
//   - images[] (複数)
func (h *FleaMarketHandler) CreateFleaItem(w http.ResponseWriter, r *http.Request) {
	token, erro := function.CheckUser(h.db, w, r)

	if erro != "" || token == "" {
		log.Println("トークンが無効です:", erro)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// トークンからユーザー情報を取得
	claims, err := function.GetUserFromToken(token)
	if err != nil {
		log.Println("トークンの解析に失敗:", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}
	userID := claims.ID

	// 20MB まで（必要に応じて調整）
	if err := r.ParseMultipartForm(20 << 20); err != nil {
		http.Error(w, "invalid form", http.StatusBadRequest)
		return
	}

	// ---- フィールド取り出し・型変換 ----
	name := r.FormValue("name")
	desc := r.FormValue("description")
	var description *string
	if desc != "" {
		description = &desc
	}

	price := function.ParseFloat(r.FormValue("price"), 0)
	quantity := function.ParseInt(r.FormValue("quantity"), 1)
	isMulti := function.ParseBool(r.FormValue("is_multi_purchasable"))
	shipFeeType := function.ParseInt(r.FormValue("shipping_fee_type"), 0)
	shipFrom := function.ParseInt(r.FormValue("ship_from"), 0)
	shipsWithin := function.ParseOptInt(r.FormValue("ships_within_days"))
	mainIndex := function.ParseInt(r.FormValue("main_index"), 0)
	type_ := r.FormValue("type")

	// ---- 画像を保存して URL 配列を作る ----
	files := r.MultipartForm.File["images"]
	imageURLs := make([]string, 0, len(files))

	uploadDir := "./static/flea" // 環境に合わせて
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		http.Error(w, "failed to create upload dir", http.StatusInternalServerError)
		return
	}

	for i, fh := range files {
		f, err := fh.Open()
		if err != nil {
			continue
		}
		func() {
			defer f.Close()
			ext := filepath.Ext(fh.Filename)
			if ext == "" {
				ext = ".jpg"
			}
			filename := fmt.Sprintf("%s_%d%s", uuid.New().String(), i, ext)
			dstPath := filepath.Join(uploadDir, filename)

			dst, err := os.Create(dstPath)
			if err != nil {
				return
			}
			defer dst.Close()
			if _, err = io.Copy(dst, f); err != nil {
				return
			}
			// 公開URLにマッピング（Nginx等で /static -> ./uploads を公開するなど）
			publicURL := "/static/flea/" + filename
			imageURLs = append(imageURLs, publicURL)
		}()
	}

	// main_image_url の決定（フロントから main_index が来る想定）
	var mainURL string
	if len(imageURLs) > 0 {
		if mainIndex < 0 || mainIndex >= len(imageURLs) {
			mainIndex = 0
		}
		mainURL = imageURLs[mainIndex]
	}

	// ---- DB Create 用の入力を組み立て ----
	in := utils.CreateFleaMarketItemInput{
		Name:               name,
		Price:              price,
		Quantity:           quantity,
		IsMultiPurchasable: isMulti,
		Type:               type_,
		Description:        description,
		MainImageURL:       mainURL,
		ImageURLs:          imageURLs,
		ShippingFeeType:    shipFeeType,
		ShipFrom:           &shipFrom,
		ShipsWithinDays:    shipsWithin,
	}

	itemID, err := h.db.CreateFleaMarketItem(userID, in)
	if err != nil {
		http.Error(w, "failed to create item", http.StatusInternalServerError)
		log.Println("failed to create flea item:", err)
		return
	}

	// ---- レスポンス ----
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	resp := map[string]any{
		"message":   "item created",
		"itemId":    itemID,
		"imageUrls": imageURLs,
	}
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(resp)
}
