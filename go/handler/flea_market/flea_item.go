package handler

import (
	"animaloop/config"
	"animaloop/function"
	"animaloop/utils"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

func (h *FleaMarketHandler) GetFleaMarketItem(w http.ResponseWriter, r *http.Request) {
	// クエリパラメータから item_id を取得
	itemIDStr := mux.Vars(r)["id"]
	log.Println("Fetching flea market item with ID:", itemIDStr)
	itemID, err := strconv.ParseUint(itemIDStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid item_id"+err.Error(), http.StatusBadRequest)
		return
	}

	item, err := h.db.GetFleaMarketItemByID(itemID)
	if err != nil {
		log.Println("failed to fetch flea item:", err)
		http.Error(w, "failed to fetch item", http.StatusInternalServerError)
		return
	}
	log.Println("Fetched flea market item:", item)

	detail, err := h.db.GetFleaMarketItemDetail(item.ID, item.Type)
	if err != nil {
		log.Println("failed to fetch flea item detail:", err)
		http.Error(w, "failed to fetch item detail", http.StatusInternalServerError)
		return
	}

	//　画像のURLリストも取得
	images, err := h.db.GetFleaMarketItemImages(itemID)
	if err != nil {
		log.Println("failed to fetch flea item images:", err)
		http.Error(w, "failed to fetch item images", http.StatusInternalServerError)
		return
	}

	resp := map[string]any{"item": item, "images": images, "details": detail}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// GET /flea-market/list?limit=20&offset=0 でもOK（POSTならBodyから取得）
func (h *FleaMarketHandler) ListFleaMarket(w http.ResponseWriter, r *http.Request) {
	limit, offset := 20, 0

	items, err := h.db.ListFleaMarketItemsLite(limit, offset)
	if err != nil {
		log.Println("failed to fetch flea items:", err)
		http.Error(w, "failed to fetch items", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(items)
}

// POST /flea-market/add/item  (React から FormData で送られてくる前提)
// fields:
//   - name, description, price, quantity
//   - is_multi_purchasable (0/1 or "true"/"false")
//   - type ("ANIMAL" / "SUPPLY")
//   - shipping_fee_type, ship_from_id, ships_within_days (任意), main_index
//   - images[] (複数)
func (h *FleaMarketHandler) CreateFleaItem(w http.ResponseWriter, r *http.Request) {
	// 認証チェック
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil || userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

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

	price := utils.ParseInt(r.FormValue("price"), 0)

	// ★ 変更：seller_plus_pct（0..N）
	sellerPlusPct := utils.ParseInt(r.FormValue("seller_plus_pct"), 0)

	// サーバー側設定（信用できるのはサーバー）
	cfg := config.GetFleaConfig()

	// 1.02 -> 10200 のような bp（basis points *100 のノリ）
	baseBP := cfg.BaseRate
	maxBP := cfg.MaxRate
	baseCR := cfg.CommissionRate

	// maxPlusPct は設定から逆算（base/max を変えても安全）
	maxPlusPct := int((maxBP - baseBP) / cfg.RateDen)
	// 範囲ガード（丸めるより弾くのが誠実）
	if sellerPlusPct < 0 || sellerPlusPct > maxPlusPct {
		http.Error(w, "invalid seller_plus_pct", http.StatusBadRequest)
		return
	}

	// 保存値（bp）
	sellerRateBP := baseBP + int64(sellerPlusPct)*int64(cfg.RateDen)
	commissionRateBP := baseCR + int64(sellerPlusPct)*int64(cfg.RateDen)

	quantity := utils.ParseInt(r.FormValue("quantity"), 1)
	isMulti := utils.ParseBool(r.FormValue("is_multi_purchasable"))
	shipFeeType := utils.ParseInt(r.FormValue("shipping_fee_type"), 0)

	shipFrom := utils.ParseInt(r.FormValue("ship_from_id"), 0)
	shipsWithin := utils.ParseOptInt(r.FormValue("ships_within_days"))
	mainIndex := utils.ParseInt(r.FormValue("main_index"), 0)
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
			publicURL := "/static/flea/" + filename
			imageURLs = append(imageURLs, publicURL)
		}()
	}

	// main_image_url
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
		Price:              int64(price),
		Quantity:           quantity,
		IsMultiPurchasable: isMulti,
		Type:               type_,
		Description:        description,
		MainImageURL:       mainURL,
		ImageURLs:          imageURLs,
		ShippingFeeType:    shipFeeType,
		ShipFrom:           &shipFrom,
		ShipsWithinDays:    shipsWithin,
		SellerRateBP:       int64(sellerRateBP),
		CommissionRateBP:   int64(commissionRateBP),
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
		"message": "item created",
		"itemId":  itemID,

		// UIが必要なら返す（なくてもOK）
		"seller_plus_pct": sellerPlusPct,

		"imageUrls": imageURLs,
	}
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(resp)
}
