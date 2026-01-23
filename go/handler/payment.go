package handler

import (
	"animaloop/function"
	"net/http"

	"github.com/gorilla/mux"
)

type paymentRequest struct {
	ItemID    uint64 `json:"item_id"`
	UsePoints int64  `json:"use_points"`
	CardID    string `json:"card_id"`
}

// adminHandler は /admin 系のエンドポイントをまとめたハンドラです
type paymentHandler struct {
	// ここに DB やサービスを注入しても OK
	db *function.Database
}

// NewAdminHandler はハンドラのコンストラクタ
func NewPaymentHandler(db *function.Database) *paymentHandler {
	return &paymentHandler{
		db: db,
	}
}

// RegisterRoutes がルーティングの登録を行います
func (h *paymentHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/payment/flea-market", h.FleaMarketCheckout).Methods("POST")
}

func (h *paymentHandler) FleaMarketCheckout(w http.ResponseWriter, r *http.Request) {
	// userID, err := function.CheckUser(h.db, w, r)
	//
	//	if err != nil || userID == "" {
	//		http.Error(w, "unauthorized", http.StatusUnauthorized)
	//		return
	//	}
	//
	// // リクエストボディの解析
	// var req paymentRequest
	//
	//	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
	//		http.Error(w, "bad json", http.StatusBadRequest)
	//		return
	//	}
	//
	// // ユーザーデータの取得
	// user, err := h.db.GetUserDataByID(userID)
	//
	//	if err != nil {
	//		http.Error(w, "failed to get user data", http.StatusInternalServerError)
	//		return
	//	}
	//
	//	if user.Point < req.UsePoints {
	//		http.Error(w, "not enough points", http.StatusBadRequest)
	//		return
	//	}
	//
	// // フリマアイテムの取得
	// item, err := h.db.GetFleaMarketItemByID(req.ItemID)
	//
	//	if err != nil {
	//		http.Error(w, "failed to get item data", http.StatusInternalServerError)
	//		return
	//	}
	//
	// fcg := function.GetFleaConfig()
	//
	// // 決済処理の実行
	// //　使用ポイントを商品のポイントレートを使用して価格からマイナスする
	// itemPrice := item.Price - float64(req.UsePoints * (item.SellerRate / float64(fcg.RateDen))
	//
	//	if itemPrice <= 0 {
	//		itemPrice = 0
	//	}
	//
	// // ユーザーのポイントを減算
	// err = h.db.ChargePoint(userID, req.UsePoints)
	//
	//	if err != nil {
	//		http.Error(w, "failed to charge points", http.StatusInternalServerError)
	//		return
	//	}
	//
	// // 残額があればクレジットカードで決済
	//
	//	if itemPrice > 0 {
	//		custumterID, err := h.db.GetCustomerID(userID)
	//		if err != nil {
	//			http.Error(w, "failed to get customer id", http.StatusInternalServerError)
	//			return
	//		}
	//
	//		_, err = function.ChargeCard(custumterID, req.CardID, int64(itemPrice))
	//		if err != nil {
	//			http.Error(w, "payment failed: "+err.Error(), http.StatusPaymentRequired)
	//			return
	//		}
	//	}
	//
	// // 注文の作成
	// //err = h.db.CreateOrderForFleaMarketItem(userID, req.ItemID, itemPrice, req.UsePoints)
	//
	//	if err != nil {
	//		http.Error(w, "failed to create order: "+err.Error(), http.StatusInternalServerError)
	//		return
	//	}
	//
	// w.WriteHeader(http.StatusNoContent)
}
