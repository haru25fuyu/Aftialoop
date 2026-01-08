package handler

import (
	"animaloop/function"
	"animaloop/utils"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

// cartHandler は /cart 系のエンドポイントをまとめたハンドラです
type cartHandler struct {
	// ここに DB やサービスを注入しても OK
	db *function.Database
}

// NewCartHandler はハンドラのコンストラクタ
func NewCartHandler(db *function.Database) *cartHandler {
	return &cartHandler{
		db: db,
	}
}

// RegisterRoutes がルーティングの登録を行います
func (h *cartHandler) RegisterRoutes(r *mux.Router) {
	// POST /cart/add
	r.HandleFunc("/cart/add", h.AddCart).Methods("POST")
	// GET /cart
	r.HandleFunc("/cart", h.GetCart).Methods("POST")
	// DELETE /cart
	r.HandleFunc("/cart/delete", h.DeleteCart).Methods("POST")
	// GET /cart/edit
	r.HandleFunc("/cart/edit", h.EditCart).Methods("POST")
}

func (h *cartHandler) AddCart(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)

	if err != nil || user_id == "" {
		log.Println("トークンが無効です:", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// リクエストボディから商品情報を取得(複数の商品情報を受け取った場合も想定する)
	var items []utils.Item
	err = json.NewDecoder(r.Body).Decode(&items)
	if err != nil {
		log.Println("リクエストボディの解析に失敗:", err)
		http.Error(w, "Invalid request body "+err.Error(), http.StatusBadRequest)
		return
	}

	// カートに商品を追加する処理を実装
	for _, item := range items {
		if item.ID == "" || item.Quantity <= 0 {
			log.Println("無効な商品情報:", item)
			http.Error(w, "Invalid item data", http.StatusBadRequest)
			return
		}
		err = h.db.AddToCart(user_id, item)
		if err != nil {
			log.Println("カートへの追加に失敗:", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"err_message": "カートへの追加に失敗しました"})
			return
		}
	}
	log.Println("商品がカートに追加されました:", items)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "商品がカートに追加されました"})
}

func (h *cartHandler) GetCart(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)

	if err != nil || user_id == "" {
		log.Println("トークンが無効です:", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// カートのアイテムを取得する処理を実装
	cartItems, err := h.db.GetCartItems(user_id)
	if err != nil {
		log.Println("カートのアイテム取得に失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "カートのアイテム取得に失敗しました"})
		return
	}

	//ユーザー情報を取得
	userData, err := h.db.GetUserDataByID(user_id)
	if err != nil {
		log.Println("ユーザー情報の取得に失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザー情報の取得に失敗しました"})
		return
	}

	log.Println("カートのアイテムが取得されました:", cartItems)
	w.WriteHeader(http.StatusOK)
	CartResponse := struct {
		Cart  []utils.Item `json:"cart"`
		Point int64        `json:"point"`
	}{
		Cart:  cartItems,
		Point: userData.Point,
	}
	// レスポンスをJSON形式で返す
	json.NewEncoder(w).Encode(CartResponse)
}

func (h *cartHandler) DeleteCart(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)

	if err != nil || user_id == "" {
		log.Println("トークンが無効です:", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	//　リクエストボディから削除するアイテムの情報を取得
	var item utils.Item
	err = json.NewDecoder(r.Body).Decode(&item)
	if err != nil {
		log.Println("リクエストボディの解析に失敗:", err)
		http.Error(w, "Invalid request body "+err.Error(), http.StatusBadRequest)
		return
	}
	// カートからアイテムを削除する処理を実装
	err = h.db.DeleteCartItem(user_id, item.ID)
	if err != nil {
		log.Println("カートのアイテム削除に失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "カートのアイテム削除に失敗しました"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "カートが削除されました"})
}

func (h *cartHandler) EditCart(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)

	if err != nil || user_id == "" {
		log.Println("トークンが無効です:", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// リクエストボディから編集内容を取得
	var item utils.Item
	err = json.NewDecoder(r.Body).Decode(&item)
	if err != nil {
		log.Println("リクエストボディの解析に失敗:", err)
		http.Error(w, "Invalid request body "+err.Error(), http.StatusBadRequest)
		return
	}

	log.Println("編集内容:", item)
	// カートのアイテムを編集する処理を実装
	err = h.db.UpdateCartItem(user_id, item.ID, item.Quantity, item.IsSelected)
	if err != nil {
		log.Println("カートのアイテム編集に失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "カートのアイテム編集に失敗しました"})
		return
	}

	//カート情報の取得
	cartItems, err := h.db.GetCartItems(user_id)
	if err != nil {
		log.Println("カートのアイテム取得に失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "カートのアイテム取得に失敗しました"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(cartItems)
}
