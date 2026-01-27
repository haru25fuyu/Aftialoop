package handler

import (
	"animaloop/config"
	"animaloop/function"
	"animaloop/utils"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

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

	fcg := config.GetFleaConfig()

	resp := map[string]any{"item": item, "images": images, "details": detail, "rate_den": fcg.RateDen}

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
	fcg := config.GetFleaConfig()

	resp := map[string]any{"items": items, "rate_den": fcg.RateDen}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
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
	sellerPlusPct := utils.ParseInt(r.FormValue("seller_plus_pct"), 0)

	// サーバー側設定
	cfg := config.GetFleaConfig()
	baseBP := cfg.BaseRate
	maxBP := cfg.MaxRate
	baseCR := cfg.CommissionRate
	maxPlusPct := int((maxBP - baseBP) / cfg.RateDen)

	if sellerPlusPct < 0 || sellerPlusPct > maxPlusPct {
		http.Error(w, "invalid seller_plus_pct", http.StatusBadRequest)
		return
	}

	sellerRateBP := baseBP + int64(sellerPlusPct)*int64(cfg.RateDen)
	commissionRateBP := baseCR + int64(sellerPlusPct)*int64(cfg.RateDen)

	quantity := utils.ParseInt(r.FormValue("quantity"), 1)
	isMulti := utils.ParseBool(r.FormValue("is_multi_purchasable"))
	shipFeeType := utils.ParseInt(r.FormValue("shipping_fee_type"), 0)
	shipFrom := utils.ParseInt(r.FormValue("ship_from_id"), 0)
	shipsWithin := utils.ParseOptInt(r.FormValue("ships_within_days"))
	mainIndex := utils.ParseInt(r.FormValue("main_index"), 0)
	type_ := r.FormValue("type")

	// ---- 新規画像の保存 ----
	files := r.MultipartForm.File["images"]
	imageURLs := make([]string, 0, len(files)) // 新規分のURLリスト

	// ★重要: 「新規ファイルなし」かつ「既存画像IDなし」ならエラー
	existingImageIDs := r.Form["image_ids"]
	if len(files) == 0 && len(existingImageIDs) == 0 {
		http.Error(w, "image required", http.StatusBadRequest)
		return
	}

	uploadDir := "./static/flea"
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

	// ---------------------------------------------------------
	// ★ 全画像のURLリストを作成（ここが重要）
	// ---------------------------------------------------------
	var finalImageURLs []string

	// A. 下書き画像 (ID -> URL変換)
	for _, idStr := range existingImageIDs {
		id, _ := strconv.ParseInt(idStr, 10, 64)
		if url, err := h.db.GetImageURLByID(id); err == nil && url != "" {
			finalImageURLs = append(finalImageURLs, url)
		}
	}

	// B. 新規アップロード画像
	finalImageURLs = append(finalImageURLs, imageURLs...)

	// C. メイン画像の決定
	var mainURL string
	if len(finalImageURLs) > 0 {
		if mainIndex >= 0 && mainIndex < len(finalImageURLs) {
			mainURL = finalImageURLs[mainIndex]
		} else {
			mainURL = finalImageURLs[0]
		}
	}

	// ---------------------------------------------------------
	// DB登録用データの作成
	// ---------------------------------------------------------
	in := utils.CreateFleaMarketItemInput{
		Name:               name,
		Price:              int64(price),
		Quantity:           quantity,
		IsMultiPurchasable: isMulti,
		Type:               type_,
		Description:        description,

		MainImageURL: mainURL,
		ImageURLs:    finalImageURLs, // ★全URLを渡す

		ShippingFeeType:  shipFeeType,
		ShipFrom:         &shipFrom,
		ShipsWithinDays:  shipsWithin,
		SellerRateBP:     int64(sellerRateBP),
		CommissionRateBP: int64(commissionRateBP),
	}

	// ★ここで「item作成」と「image紐付け」が一気に行われる
	itemID, err := h.db.CreateFleaMarketItem(userID, in)
	if err != nil {
		http.Error(w, "failed to create item", http.StatusInternalServerError)
		log.Println("failed to create flea item:", err)
		return
	}

	// 下書きを削除
	draftIDStr := r.FormValue("draft_id")

	if draftIDStr != "" {
		if draftID, err := strconv.ParseUint(draftIDStr, 10, 64); err == nil {
			if err := h.db.ArchiveDraft(r.Context(), userID, draftID); err != nil {
				// ここでエラーが出ているかも確認
				log.Println("failed to archive draft after item creation:", err)
			} else {
				log.Println("Draft archived successfully")
			}
		}
	}

	// ---- レスポンス ----
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	resp := map[string]any{
		"message":         "item created",
		"itemId":          itemID,
		"seller_plus_pct": sellerPlusPct,
		"imageUrls":       finalImageURLs, // レスポンスには全URLを返すと親切
	}
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(resp)
}

// ---------------------------------------------------------
// ハンドラ: 出品した商品一覧取得
// GET /mypage/listings/selling
// ---------------------------------------------------------
func (h *FleaMarketHandler) GetMyListings(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// クエリパラメータからページング取得
	q := r.URL.Query()
	limit := utils.ParseInt(q.Get("limit"), 20)
	offset := utils.ParseInt(q.Get("offset"), 0)

	// 出品中・売却済みなどの商品を取得
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	listings, err := h.db.GetUserListings(ctx, userID, limit, offset)
	if err != nil {
		log.Println("Error fetching listings:", err)
		http.Error(w, "failed to fetch listings", http.StatusInternalServerError)
		return
	}

	// 空の場合は空配列で返す
	if listings == nil {
		listings = []utils.FleaMarketItemResponse{}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"items": listings})
}
