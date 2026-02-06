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
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

func (h *FleaMarketHandler) GetFleaMarketItem(w http.ResponseWriter, r *http.Request) {
	// 認証チェック（未ログインでも閲覧可能）
	userID, _ := function.CheckUser(h.db, w, r)

	// クエリパラメータから item_id を取得
	itemIDStr := mux.Vars(r)["id"]
	log.Println("Fetching flea market item with ID:", itemIDStr)
	itemID, err := strconv.ParseUint(itemIDStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid item_id"+err.Error(), http.StatusBadRequest)
		return
	}

	item, err := h.db.GetFleaMarketItemByID(userID, itemID)
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
	userID, _ := function.CheckUser(h.db, w, r)

	limit, offset := 20, 0

	// クエリパラメータからページング取得
	q := r.URL.Query()
	limit = utils.ParseInt(q.Get("limit"), 20)
	offset = utils.ParseInt(q.Get("offset"), 0)

	items, err := h.db.ListFleaMarketItemsLite(r.Context(), userID, limit, offset)
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

	// 20MB まで
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
	baseBP := cfg.BaseRate // 10200 (1.02%)
	maxBP := cfg.MaxRate   // 11000 (1.10%)
	baseCR := cfg.CommissionRate

	// 【修正3】 計算ロジックの修正
	// 例: RateDen=10000 (100%) の場合、1% は 100 BP
	bpPerPct := cfg.RateDen / 100

	// 最大何%上乗せできるか (例: (11000-10200)/100 = 8%)
	maxPlusPct := int((maxBP - baseBP) / bpPerPct)

	if sellerPlusPct < 0 || sellerPlusPct > maxPlusPct {
		http.Error(w, "invalid seller_plus_pct", http.StatusBadRequest)
		return
	}

	// 上乗せ分を加算 (例: 5%上乗せ -> 10200 + 5*100 = 10700)
	sellerRateBP := baseBP + int64(sellerPlusPct)*int64(bpPerPct)
	commissionRateBP := baseCR + int64(sellerPlusPct)*int64(bpPerPct)

	quantity := utils.ParseInt(r.FormValue("quantity"), 1)
	isMulti := utils.ParseBool(r.FormValue("is_multi_purchasable"))
	shipFeeType := utils.ParseInt(r.FormValue("shipping_fee_type"), 0)
	shipFrom := utils.ParseInt(r.FormValue("ship_from_id"), 0)
	shipsWithin := utils.ParseOptInt(r.FormValue("ships_within_days"))
	mainIndex := utils.ParseInt(r.FormValue("main_index"), 0)
	type_ := r.FormValue("type")

	// ---- 新規画像の保存 ----
	files := r.MultipartForm.File["images"]
	imageURLs := make([]string, 0, len(files))

	existingImageIDs := r.Form["image_ids"]
	if len(files) == 0 && len(existingImageIDs) == 0 {
		http.Error(w, "image required", http.StatusBadRequest)
		return
	}

	// 【修正1】 保存先パスの修正 (ドットを追加)
	saveDir := "./static/flea"
	urlPrefix := "/static/flea/"

	if err := os.MkdirAll(saveDir, 0755); err != nil {
		http.Error(w, "failed to create upload dir", http.StatusInternalServerError)
		return
	}

	// 【修正2】 拡張子制限の追加
	allowedExts := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true, ".gif": true,
	}

	for i, fh := range files {
		f, err := fh.Open()
		if err != nil {
			continue
		}

		// 即時実行関数をやめて、フラットに書く方がエラーハンドリングしやすいです
		// もし function.SaveImage を使うなら置き換えてもOKです
		func() {
			defer f.Close()

			ext := strings.ToLower(filepath.Ext(fh.Filename))
			if !allowedExts[ext] {
				// 許可されていない拡張子はスキップ (ログ推奨)
				log.Printf("Unsupported file type: %s", ext)
				return
			}

			filename := fmt.Sprintf("%s_%d%s", uuid.New().String(), i, ext)
			dstPath := filepath.Join(saveDir, filename) // 保存用パス

			dst, err := os.Create(dstPath)
			if err != nil {
				log.Printf("File create error: %v", err)
				return
			}
			defer dst.Close()

			if _, err = io.Copy(dst, f); err != nil {
				return
			}

			publicURL := urlPrefix + filename // URL用パス
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

	listings, err := h.db.GetUserListings(ctx, userID, true, limit, offset)
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

// ToggleLikeHandler: POST /flea-market/items/{id}/like
func (h *FleaMarketHandler) ToggleLike(w http.ResponseWriter, r *http.Request) {
	// 1. ユーザー認証
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. パスパラメータから itemID 取得
	vars := mux.Vars(r)
	itemIDStr := vars["id"]
	itemID, err := strconv.ParseInt(itemIDStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid item id", http.StatusBadRequest)
		return
	}

	// 3. トグル実行
	isLiked, err := h.db.ToggleFleaLike(r.Context(), userID, itemID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// 4. 結果を返す
	json.NewEncoder(w).Encode(map[string]bool{"liked": isLiked})
}

// ListLikesHandler: いいね一覧
func (h *FleaMarketHandler) ListLikes(w http.ResponseWriter, r *http.Request) {
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	q := r.URL.Query()
	limit := utils.ParseInt(q.Get("limit"), 20)
	offset := utils.ParseInt(q.Get("offset"), 0)

	items, err := h.db.ListLikedFleaItems(r.Context(), userID, limit, offset)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	if items == nil {
		items = []utils.FleaMarketListLite{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}

type ImageSortItem struct {
	Type  string `json:"type"`  // "existing" or "new"
	ID    uint64 `json:"id"`    // existingの場合のID
	Index int    `json:"index"` // newの場合のファイル配列インデックス
}

// UpdateFleaItem: 商品情報の更新
func (h *FleaMarketHandler) UpdateFleaItem(w http.ResponseWriter, r *http.Request) {
	// 1. ユーザー認証
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		return
	}

	// 2. パスパラメータ取得
	vars := mux.Vars(r)
	itemID, _ := strconv.ParseUint(vars["id"], 10, 64)

	// 3. 所有者チェック & ステータスチェック
	item, err := h.db.GetFleaMarketItemByID(userID, itemID)
	if err != nil {
		http.Error(w, "item not found", http.StatusNotFound)
		return
	}
	if item.UserID != userID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	// 取引中や売却済みの場合は編集できないようにするのが一般的
	canUpdate := item.Status == config.FleaItemStatusActive || item.Status == config.FleaItemStatusDraft
	if !canUpdate {
		http.Error(w, "cannot edit sold item", http.StatusBadRequest)
		return
	}

	// 4. マルチパートフォーム解析 (最大20MB)
	if err := r.ParseMultipartForm(20 << 20); err != nil {
		http.Error(w, "failed to parse form", http.StatusBadRequest)
		return
	}

	// 5. テキストデータの取得
	name := r.FormValue("name")
	desc := r.FormValue("description")
	price, _ := strconv.Atoi(r.FormValue("price"))
	shippingMethod := r.FormValue("shipping_method")
	shippingFeeType := r.FormValue("shipping_fee_type")
	shipFrom, _ := strconv.Atoi(r.FormValue("ship_from"))
	daysToShip, _ := strconv.Atoi(r.FormValue("days_to_ship"))
	status, _ := strconv.Atoi(r.FormValue("status"))

	// 6. 画像の更新処理
	// 6-A. 不要な画像の削除 (kept_image_ids を使う既存ロジックはそのまま利用)
	keptIDsJSON := r.FormValue("kept_image_ids")
	var keptImageIDs []uint64
	if keptIDsJSON != "" {
		json.Unmarshal([]byte(keptIDsJSON), &keptImageIDs)
	}
	if err := h.db.SyncFleaItemImages(itemID, keptImageIDs); err != nil {
		log.Println("Failed to sync images:", err)
	}

	// 6-B. 並び順情報のパース
	sortOrderJSON := r.FormValue("sort_order")
	var sortList []ImageSortItem
	if sortOrderJSON != "" {
		json.Unmarshal([]byte(sortOrderJSON), &sortList)
	}

	// 6-C. 新規ファイル群の取得
	newFiles := r.MultipartForm.File["new_images"] // []*multipart.FileHeader

	// 6-D. 並び順に従って処理 (sort_numを更新・登録)
	for i, item := range sortList {
		sortNum := i + 1 // 1始まりの番号

		switch item.Type {
		case "existing":
			// 既存画像: DBの sort_num を更新
			if err := h.db.UpdateFleaImageSortNum(item.ID, sortNum); err != nil {
				log.Println("Failed to update sort num:", err)
			}
		case "new":
			// 新規画像: アップロードして保存
			if item.Index < len(newFiles) {
				fileHeader := newFiles[item.Index]
				file, err := fileHeader.Open()
				if err == nil {
					// 保存処理 (function.SaveImageは前回作ったもの)
					imageURL, err := function.SaveImage(file, fileHeader.Filename)
					file.Close()
					if err == nil {
						// DBに追加 (sort_num 指定付き)
						h.db.AddFleaItemImageWithSort(itemID, imageURL, sortNum)
					}
				}
			}
		}
	}

	// 6-E. メイン画像の更新 (sort_num=1 の画像をmainにする)
	if err := h.db.UpdateFleaMainImage(itemID); err != nil {
		log.Println("Failed to update main image:", err)
	}

	// 7. アイテム情報の更新
	if err := h.db.UpdateFleaItem(itemID, name, desc, price, shippingMethod, shippingFeeType, shipFrom, daysToShip, status); err != nil {
		log.Println("Failed to update flea item:", err)
		http.Error(w, "failed to update item", http.StatusInternalServerError)
		return
	}

	// type は item 変数（GetFleaItemByIDの結果）から判定します
	switch item.Type {
	case "ANIMAL":
		locality := r.FormValue("locality")
		hatchDate := r.FormValue("hatch_date")
		size := r.FormValue("size")
		generation := r.FormValue("generation")
		sex := r.FormValue("sex")

		if err := h.db.UpdateAnimalDetails(itemID, locality, hatchDate, size, generation, sex); err != nil {
			log.Printf("Failed to update animal details: %v", err)
		}

	case "SUPPLY":
		brand := r.FormValue("brand")
		sku := r.FormValue("sku")
		netWeight, _ := strconv.Atoi(r.FormValue("net_weight"))

		if err := h.db.UpdateSupplyDetails(itemID, brand, sku, netWeight); err != nil {
			log.Printf("Failed to update supply details: %v", err)
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
