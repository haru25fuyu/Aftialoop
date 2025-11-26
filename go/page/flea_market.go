package page

import (
	"animaloop/function"
	"animaloop/utils"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
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

func (h *FleaMarketHandler) RegisterRoutes(r *mux.Router) {
	//商品取得

	// 一覧・新規出品
	r.HandleFunc("/flea-market/list", h.ListFleaMarket).Methods("POST")
	r.HandleFunc("/flea-market/add/item", h.CreateFleaItem).Methods("POST")

	// ドラフト関連
	r.HandleFunc("/flea-market/draft/save", h.SaveFleaDraft).Methods("POST")
	r.HandleFunc("/flea-market/draft/{id}", h.GetFleaDraftByID).Methods("GET")
	r.HandleFunc("/flea-market/draft/list", h.ListFleaDrafts).Methods("GET")
	r.HandleFunc("/flea-market/draft/{id}", h.DeleteFleaDraft).Methods("DELETE")

	// 生体詳細
	r.HandleFunc("/flea-market/item/{id:[0-9]+}/animal-details",
		h.UpsertAnimalDetails,
	).Methods("POST")

	// 用品詳細
	r.HandleFunc("/flea-market/item/{id:[0-9]+}/supply-details",
		h.UpsertSupplyDetails,
	).Methods("POST")
}

// JWT からユーザーID（string）を取り出す共通ヘルパ
func (h *FleaMarketHandler) currentUserIDFromRequest(w http.ResponseWriter, r *http.Request) (string, error) {
	token, erro := function.CheckUser(h.db, w, r)
	if erro != "" || token == "" {
		return "", errors.New("unauthorized")
	}
	claims, err := function.GetUserFromToken(token)
	if err != nil {
		return "", errors.New("unauthorized")
	}
	return claims.ID, nil
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
	userID, err := h.currentUserIDFromRequest(w, r)
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

	price := function.ParseFloat(r.FormValue("price"), 0)
	quantity := function.ParseInt(r.FormValue("quantity"), 1)
	isMulti := function.ParseBool(r.FormValue("is_multi_purchasable"))
	shipFeeType := function.ParseInt(r.FormValue("shipping_fee_type"), 0)

	// ★ フロントの FormData キー名に合わせる
	//    fd.append("ship_from_id", String(shipFromId))
	shipFrom := function.ParseInt(r.FormValue("ship_from_id"), 0)

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
			// 公開URLにマッピング（Nginx等で /static -> ./static を公開するなど）
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
		ShipFrom:           &shipFrom,   // 0 の扱いは DB 側で調整してOK
		ShipsWithinDays:    shipsWithin, // nil なら未設定
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

// ---- ドラフト関連 ----

// 保存（新規 or 更新）
func (h *FleaMarketHandler) SaveFleaDraft(w http.ResponseWriter, r *http.Request) {
	uid, err := h.currentUserIDFromRequest(w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req utils.SaveDraftRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var draftID uint64
	var savedAt time.Time
	if req.DraftID == nil || *req.DraftID == 0 {
		draftID, savedAt, err = h.db.CreateDraft(ctx, uid, req.Payload)
		if err != nil {
			id, savedAt, err := h.db.CreateDraft(ctx, uid, req.Payload)
			if err != nil {
				log.Printf("[draft.save] create failed: %v", err)
				http.Error(w, "create failed", 500)
				return
			}
			json.NewEncoder(w).Encode(utils.SaveDraftResponse{DraftID: id, SavedAt: savedAt.UTC().Format(time.RFC3339)})
			return
		}
	} else {
		savedAt, err = h.db.UpdateDraftByID(ctx, uid, *req.DraftID, req.Payload)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				id, savedAt2, err2 := h.db.CreateDraft(ctx, uid, req.Payload)
				if err2 != nil {
					log.Printf("[draft.save] fallback create failed: %v", err2)
					http.Error(w, "create failed", 500)
					return
				}
				json.NewEncoder(w).Encode(utils.SaveDraftResponse{DraftID: id, SavedAt: savedAt2.UTC().Format(time.RFC3339)})
				return
			}
			http.Error(w, "update failed", http.StatusInternalServerError)
			return
		}
		draftID = *req.DraftID
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(utils.SaveDraftResponse{
		DraftID: draftID,
		SavedAt: savedAt.UTC().Format(time.RFC3339),
	})
}

// 1件取得
func (h *FleaMarketHandler) GetFleaDraftByID(w http.ResponseWriter, r *http.Request) {
	uid, err := h.currentUserIDFromRequest(w, r)
	if err != nil {
		http.Error(w, "unauthorized", 401)
		return
	}
	idStr := mux.Vars(r)["id"]
	did, convErr := utils.ParseUint(idStr)
	if convErr != nil {
		http.Error(w, "bad id", 400)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	resp, err := h.db.GetDraftByID(ctx, uid, did)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "not found", 404)
			return
		}
		http.Error(w, "db error", 500)
		return
	}
	_ = json.NewEncoder(w).Encode(resp)
}

// 一覧
func (h *FleaMarketHandler) ListFleaDrafts(w http.ResponseWriter, r *http.Request) {
	uid, err := h.currentUserIDFromRequest(w, r)
	if err != nil {
		http.Error(w, "unauthorized", 401)
		return
	}
	q := r.URL.Query()
	limit := function.ParseInt(q.Get("limit"), 20)
	offset := function.ParseInt(q.Get("offset"), 0)

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	resp, err := h.db.ListDraftsByUser(ctx, uid, limit, offset)
	if err != nil {
		http.Error(w, "db error", 500)
		return
	}
	_ = json.NewEncoder(w).Encode(resp)
}

// アーカイブ（削除扱い）
func (h *FleaMarketHandler) DeleteFleaDraft(w http.ResponseWriter, r *http.Request) {
	uid, err := h.currentUserIDFromRequest(w, r)
	if err != nil {
		http.Error(w, "unauthorized", 401)
		return
	}
	idStr := mux.Vars(r)["id"]
	did, convErr := utils.ParseUint(idStr)
	if convErr != nil {
		http.Error(w, "bad id", 400)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	if err := h.db.ArchiveDraft(ctx, uid, did); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "not found", 404)
			return
		}
		http.Error(w, "delete failed", 500)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---- 詳細保存 ----

type AnimalDetailsRequest struct {
	Animal *utils.AnimalDetails `json:"animal"`
}

func (h *FleaMarketHandler) UpsertAnimalDetails(w http.ResponseWriter, r *http.Request) {
	uid, err := h.currentUserIDFromRequest(w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	itemIDStr := vars["id"]
	itemID, err := strconv.ParseUint(itemIDStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid item id", http.StatusBadRequest)
		return
	}

	log.Printf("[animal_details] uid=%s itemID=%d", uid, itemID)

	// 出品者チェック（他人の出品は触らせない）
	ownerID, err := h.db.FindFleaItemOwnerID(r.Context(), itemID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("[animal_details] item not found: id=%d", itemID)
			http.Error(w, "not found", http.StatusNotFound)
		} else {
			log.Printf("[animal_details] FindFleaItemOwnerID error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
		return
	}

	if ownerID != uid {
		log.Printf("[animal_details] forbidden: uid=%s ownerID=%s itemID=%d", uid, ownerID, itemID)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var req AnimalDetailsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := h.db.UpsertAnimalDetails(ctx, itemID, req.Animal); err != nil {
		log.Printf("[animal_details.upsert] item=%d err=%v", itemID, err)
		http.Error(w, "failed to save details", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type SupplyDetailsRequest struct {
	Supply *utils.SupplyDetails `json:"supply"`
}

func (h *FleaMarketHandler) UpsertSupplyDetails(w http.ResponseWriter, r *http.Request) {
	uid, err := h.currentUserIDFromRequest(w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	itemIDStr := vars["id"]
	itemID, err := strconv.ParseUint(itemIDStr, 10, 64)
	if err != nil {
		http.Error(w, "invalid item id", http.StatusBadRequest)
		return
	}

	log.Printf("[supply_details] uid=%s itemID=%d", uid, itemID)

	// 出品者チェック
	ownerID, err := h.db.FindFleaItemOwnerID(r.Context(), itemID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("[supply_details] item not found: id=%d", itemID)
			http.Error(w, "not found", http.StatusNotFound)
		} else {
			log.Printf("[supply_details] FindFleaItemOwnerID error: %v", err)
			http.Error(w, "internal error", http.StatusInternalServerError)
		}
		return
	}
	if ownerID != uid {
		log.Printf("[supply_details] forbidden: uid=%s ownerID=%s itemID=%d", uid, ownerID, itemID)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var req SupplyDetailsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := h.db.UpsertSupplyDetails(ctx, itemID, req.Supply); err != nil {
		log.Printf("[supply_details.upsert] item=%d err=%v", itemID, err)
		http.Error(w, "failed to save details", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
