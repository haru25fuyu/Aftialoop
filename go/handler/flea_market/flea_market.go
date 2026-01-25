package handler

import (
	SQL "animaloop/sql"

	"github.com/gorilla/mux"
)

// flea market Handler は /flea-market 系のエンドポイントをまとめたハンドラです
type FleaMarketHandler struct{ db *SQL.Database }

// NewFleaMarketHandler はハンドラのコンストラクタ
func NewFleaMarketHandler(db *SQL.Database) *FleaMarketHandler {
	return &FleaMarketHandler{db: db}
}

func (h *FleaMarketHandler) RegisterRoutes(r *mux.Router) {
	// 商品取得
	r.HandleFunc("/flea-market/item/{id}", h.GetFleaMarketItem).Methods("GET")
	// 一覧・新規出品
	r.HandleFunc("/flea-market/list", h.ListFleaMarket).Methods("POST")
	r.HandleFunc("/flea-market/selling/list", h.GetMyListings).Methods("GET")
	r.HandleFunc("/flea-market/add/item", h.CreateFleaItem).Methods("POST")
	// ドラフト関連
	r.HandleFunc("/flea-market/upload/temp", h.UploadTempImage).Methods("POST")
	r.HandleFunc("/flea-market/draft/save", h.SaveFleaDraft).Methods("POST")
	r.HandleFunc("/flea-market/draft/list", h.ListFleaDrafts).Methods("GET")
	r.HandleFunc("/flea-market/draft/{id}", h.GetFleaDraftByID).Methods("GET")
	r.HandleFunc("/flea-market/draft/{id}", h.DeleteFleaDraft).Methods("DELETE")
	// 生体詳細
	r.HandleFunc("/flea-market/item/{id:[0-9]+}/animal-details", h.UpsertAnimalDetails).Methods("POST")
	// 用品詳細
	r.HandleFunc("/flea-market/item/{id:[0-9]+}/supply-details", h.UpsertSupplyDetails).Methods("POST")
	// コメント関係
	r.HandleFunc("/flea-market/item/{id}/messages", h.GetFleaMarketItemMessages).Methods("GET")
	r.HandleFunc("/flea-market/item/{id}/messages", h.AddFleaMarketItemMessage).Methods("POST")
	// 購入リクエスト関係
	r.HandleFunc("/flea-market/purchase-requests/create", h.CreateFleaPurchaseRequest).Methods("POST")
	//r.HandleFunc("/flea-market/purchase-requests/{id}/cancel", h.CancelFleaPurchaseRequest).Methods("POST")
	//r.HandleFunc("/flea-market/purchase-requests/buyer", h.ListFleaPurchaseRequestsByBuyer).Methods("GET")
	r.HandleFunc("/flea-market/purchase-requests/seller", h.ListFleaPurchaseRequestsBySeller).Methods("GET")
	//取引関係
	r.HandleFunc("/flea-market/transactions/{id}", h.GetFleaTransaction).Methods("GET")

	r.HandleFunc("/flea-market/transactions/{id}/accept", h.AcceptPurchaseRequest).Methods("POST")
	r.HandleFunc("/flea-market/transactions/{id}/pay", h.PayTransaction).Methods("POST")

	r.HandleFunc("/flea-market/transactions/{id}/shipped", h.ShipTransaction).Methods("POST")
	r.HandleFunc("/flea-market/transactions/{id}/rate/buyer", h.RateTransactionByBuyer).Methods("POST")
	r.HandleFunc("/flea-market/transactions/{id}/complete/seller", h.CompleteTransactionBySeller).Methods("POST")
	r.HandleFunc("/flea-market/transactions/{id}/receipt/pdf", h.DownloadReceiptPDF).Methods("GET")
	r.HandleFunc("/flea-market/transactions/{id}/statement/pdf", h.DownloadSalesStatementPDF).Methods("GET")

	r.HandleFunc("/flea-market/my/sales", h.GetMySalesHistory).Methods("GET")
	r.HandleFunc("/flea-market/my/sales/exchange", h.ExchangeSalesToPoint).Methods("POST")
}
