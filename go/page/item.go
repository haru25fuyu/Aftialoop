<<<<<<< HEAD
package page

import (
	"animaloop/function"
	"animaloop/utils"

	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

// ItemHandler は /item 系のエンドポイントをまとめたハンドラです
type ItemHandler struct {
	// ここに DB やサービスを注入しても OK
	db *function.Database
}

// NewItemHandler はハンドラのコンストラクタ
func NewItemHandler(db *function.Database) *ItemHandler {
	return &ItemHandler{
		db: db,
	}
}

// RegisterRoutes がルーティングの登録を行います
func (h *ItemHandler) RegisterRoutes(r *mux.Router) {
	// POST /item
	r.HandleFunc("/item/create", h.CreateItem).Methods("POST")
	r.HandleFunc("/item/get/{id}", h.GetItem).Methods("GET")
	r.HandleFunc("/item/update/{id}", h.UpdateItem).Methods("PUT")
	r.HandleFunc("/item/delete/{id}", h.DeleteItem).Methods("DELETE")
	r.HandleFunc("/item/list", h.ListItems).Methods("POST")
}

func (h *ItemHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	var item utils.Item
	err := json.NewDecoder(r.Body).Decode(&item)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if item.Name == "" || item.Price <= 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "商品名と価格を正しく入力してください"})
		return
	}

	err = h.db.SaveItem(&item)
	if err != nil {
		log.Println("商品保存に失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "商品保存に失敗しました"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
}

func (h *ItemHandler) GetItem(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	log.Println("商品ID:", id)
	item, err := h.db.GetItemByID(id)
	if err != nil {
		log.Println("商品取得に失敗:", err)
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "商品が見つかりません"})
		return
	}

	//商品の画像リストを取得する
	images, err := h.db.GetItemImages(id)
	if err != nil {
		log.Println("商品画像取得に失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "商品画像取得に失敗しました"})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"item":   item,
		"images": images,
	})
}

func (h *ItemHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var item utils.Item
	err := json.NewDecoder(r.Body).Decode(&item)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if item.Name == "" || item.Price <= 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "商品名と価格を正しく入力してください"})
		return
	}

	err = h.db.UpdateItem(id, &item)
	if err != nil {
		log.Println("商品更新に失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "商品更新に失敗しました"})
		return
	}

	json.NewEncoder(w).Encode(item)
}

func (h *ItemHandler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	err := h.db.DeleteItem(id)
	if err != nil {
		log.Println("商品削除に失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "商品削除に失敗しました"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ItemHandler) ListItems(w http.ResponseWriter, r *http.Request) {
	var req utils.ListItemsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	items, _, err := h.db.ListItems(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(items); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
=======
package page

import (
	"animaloop/function"
	"animaloop/utils"

	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

// ItemHandler は /item 系のエンドポイントをまとめたハンドラです
type ItemHandler struct {
	// ここに DB やサービスを注入しても OK
	db *function.Database
}

// NewItemHandler はハンドラのコンストラクタ
func NewItemHandler(db *function.Database) *ItemHandler {
	return &ItemHandler{
		db: db,
	}
}

// RegisterRoutes がルーティングの登録を行います
func (h *ItemHandler) RegisterRoutes(r *mux.Router) {
	// POST /item
	r.HandleFunc("/item/create", h.CreateItem).Methods("POST")
	r.HandleFunc("/item/get/{id}", h.GetItem).Methods("GET")
	r.HandleFunc("/item/update/{id}", h.UpdateItem).Methods("PUT")
	r.HandleFunc("/item/delete/{id}", h.DeleteItem).Methods("DELETE")
	r.HandleFunc("/item/list", h.ListItems).Methods("POST")
}

func (h *ItemHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	var item utils.Item
	err := json.NewDecoder(r.Body).Decode(&item)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if item.Name == "" || item.Price <= 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "商品名と価格を正しく入力してください"})
		return
	}

	err = h.db.SaveItem(&item)
	if err != nil {
		log.Println("商品保存に失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "商品保存に失敗しました"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
}

func (h *ItemHandler) GetItem(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	log.Println("商品ID:", id)
	item, err := h.db.GetItemByID(id)
	if err != nil {
		log.Println("商品取得に失敗:", err)
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "商品が見つかりません"})
		return
	}

	//商品の画像リストを取得する
	images, err := h.db.GetItemImages(id)
	if err != nil {
		log.Println("商品画像取得に失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "商品画像取得に失敗しました"})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"item":   item,
		"images": images,
	})
}

func (h *ItemHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var item utils.Item
	err := json.NewDecoder(r.Body).Decode(&item)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if item.Name == "" || item.Price <= 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "商品名と価格を正しく入力してください"})
		return
	}

	err = h.db.UpdateItem(id, &item)
	if err != nil {
		log.Println("商品更新に失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "商品更新に失敗しました"})
		return
	}

	json.NewEncoder(w).Encode(item)
}

func (h *ItemHandler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	err := h.db.DeleteItem(id)
	if err != nil {
		log.Println("商品削除に失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "商品削除に失敗しました"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ItemHandler) ListItems(w http.ResponseWriter, r *http.Request) {
	var req utils.ListItemsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	items, _, err := h.db.ListItems(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(items); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
>>>>>>> 7e5800f5 (Refactor user data handler to use dependency injection for database access and improve error handling)
