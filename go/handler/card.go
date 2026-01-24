package handler

import (
	"animaloop/function"
	SQL "animaloop/sql"
	"animaloop/utils"

	"fmt"
	"time"

	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	square "github.com/square/square-go-sdk"
)

// cardHandler は /card 系のエンドポイントをまとめたハンドラです
type cardHandler struct {
	// ここに DB やサービスを注入しても OK
	db *SQL.Database
}

// NewCardHandler はハンドラのコンストラクタ
func NewCardHandler(db *SQL.Database) *cardHandler {
	return &cardHandler{
		db: db,
	}
}

// RegisterRoutes がルーティングの登録を行います
func (h *cardHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/card/save", h.SaveCard).Methods("POST")
	r.HandleFunc("/card/charge", h.ChargeCard).Methods("POST")
	r.HandleFunc("/card/address", h.SaveCardAddress).Methods("POST")
	r.HandleFunc("/card/list", h.ListCards).Methods("POST")
	r.HandleFunc("/card/delete", h.DeleteCard).Methods("POST")
	r.HandleFunc("/card/default", h.SetDefaultCard).Methods("POST")
	r.HandleFunc("/card/address/get", h.GetCardAddress).Methods("POST")
	r.HandleFunc("/card/get", h.GetCard).Methods("POST") // 住所のリスト取得
}

// クレジットカードの保存
func (h *cardHandler) SaveCard(w http.ResponseWriter, r *http.Request) {
	_, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// リクエストボディからカード情報を取得
	var card utils.RequestCard
	err = json.NewDecoder(r.Body).Decode(&card)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Println("userID:", card.UserID)
	customerID, err := h.db.GetCustomerID(card.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "顧客IDの取得に失敗しました"})
		return
	}
	log.Println("顧客ID:", customerID)
	log.Println("カード情報:", card.Token)
	card.CustomerID = customerID

	// カード情報を保存
	card_map, err := function.CreateCard(card)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの保存に失敗しました"})
		return
	}
	log.Println(card_map)

	// レスポンス
	response := map[string]interface{}{
		"card": card_map,
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// クレジットカードでの支払い
func (h *cardHandler) ChargeCard(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// リクエストボディから支払い情報を取得
	var charge utils.RequestCharge
	err = json.NewDecoder(r.Body).Decode(&charge)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Println(charge)

	// 購入履歴を保存
	Purchase_ID, err := h.db.SavePurchaseHistory(user_id, charge.CardID, int64(charge.Amount), charge.Items, charge.AddressID, "")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "購入履歴の保存に失敗しました" + err.Error()})
		return
	}

	// 支払い処理
	url, err := function.ChargeCard(user_id, charge.CardID, charge.Amount)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "支払いに失敗しました" + err.Error()})
		return
	}
	log.Println("支払い成功")

	SaveReceiptURL := h.db.SaveReceiptURL(Purchase_ID, url)
	if SaveReceiptURL != nil {
		// レシートURLの保存に失敗(ログに残すがそのまま続行する)
		log.Printf("レシートURLの保存に失敗: %v", SaveReceiptURL)
	}

	for _, item := range charge.Items {
		DeleteCartItem := h.db.DeleteCartItem(user_id, item.ID)
		if DeleteCartItem != nil {
			// カートアイテムの削除に失敗(ログに残すがそのまま続行する)
			log.Printf("カートアイテムの削除に失敗: %v", DeleteCartItem)
		}
	}

	// user_idからユーザー情報を取得
	claims, err := h.db.GetUserDataByID(user_id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザー情報の取得に失敗しました" + err.Error()})
		return
	}

	// 支払い完了メールの送信
	htmlContent := fmt.Sprintf(`<h3>%s様</h3><br />
	<P>ご購入ありがとうございます。</p><br />
	<p>以下の内容でお支払いが完了しました。</p><br />
	<p>金額: %d円</p><br />
	<p>購入日時: %s</p><br />
	<p>お支払い方法: クレジットカード</p><br />
	<p>領収書は以下のリンクからダウンロードできます。</p><br />
	<p><a href="%s">領収書をダウンロードする</a></p><br />
	<p>ご不明な点がございましたら、お気軽にお問い合わせください。</p><br />
	<p>今後とも、Animaloopをどうぞよろしくお願いいたします。</p><br />
	<p>Animaloopサポートチーム</p>
	`, claims.Name, charge.Amount, url, time.Now().Format("2006-01-02 15:04:05"))

	subject := "【Aftialoop】お支払い完了のお知らせ"

	// メール送信
	res, err := function.SendMail(claims.Email, subject, htmlContent)
	if err != nil {
		log.Printf("SES送信失敗: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールの送信に失敗しました"})
		return
	}
	log.Printf("Email sent: %+v", res)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "支払いが完了しました", "receipt_url": url})

	// 支払い完了メール送信成功
	log.Println("支払い完了メール送信成功")
}

// クレジットの住所の保存
func (h *cardHandler) SaveCardAddress(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// リクエストボディから住所とクレジットカード情報を取得
	var user_data utils.RequestCardWithAddress
	err = json.NewDecoder(r.Body).Decode(&user_data)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Println(user_data)

	err = h.db.SaveOrUpdateCardAddress(user_id, user_data.CardID, user_data.AddressID)
	if err != nil {
		log.Println("住所とカードの保存失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの保存に失敗しました: " + err.Error()})
		return
	}
	log.Println("カードと住所の保存成功")

	// カード情報を取得
	cardData, err := function.LoadUserAndCards(h.db, user_id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + err.Error()})
		return
	}

	// レスポンス
	response := map[string]interface{}{
		"card":    cardData,
		"count":   len(cardData),
		"message": "カードと住所を保存しました",
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)

}

// 　クレジットカードリストの取得
func (h *cardHandler) ListCards(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	cardData, err := function.LoadUserAndCards(h.db, user_id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + err.Error()})
		return
	}

	response := map[string]interface{}{
		"card":  cardData,
		"count": len(cardData),
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// クレジットカードの削除
func (h *cardHandler) DeleteCard(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}
	// トークンからIdを取得
	claims, err := h.db.GetUserDataByID(user_id)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// リクエストボディから削除するカードのIDを取得
	var card utils.RequestCharge
	err = json.NewDecoder(r.Body).Decode(&card)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Println(card)

	err = h.db.DeleteCardAddress(claims.ID, card.CardID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの削除に失敗しました" + err.Error()})
		return
	}

	// カードの削除
	err = function.DeleteCard(card.CardID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの削除に失敗しました" + err.Error()})
		return
	}
	log.Println("カード削除成功")

	cardData, err := function.LoadUserAndCards(h.db, user_id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + err.Error()})
		return
	}

	// レスポンス
	response := map[string]interface{}{
		"card":    cardData,
		"count":   len(cardData),
		"message": "カードを削除しました",
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// カードのデフォルト設定
func (h *cardHandler) SetDefaultCard(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}
	// トークンからIdを取得
	claims, err := h.db.GetUserDataByID(user_id)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}
	// リクエストボディからデフォルトにするカードのIDを取得
	var card utils.RequestCharge
	err = json.NewDecoder(r.Body).Decode(&card)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// カードのデフォルト設定
	err = h.db.SetDefaultCard(claims.ID, card.CardID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "デフォルトカードの設定に失敗しました" + err.Error()})
		return
	}
	log.Println("デフォルトカード設定成功")

	cardData, err := function.LoadUserAndCards(h.db, user_id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + err.Error()})
		return
	}

	// レスポンス
	response := map[string]interface{}{
		"card":    cardData,
		"count":   len(cardData),
		"message": "デフォルトカードを設定しました",
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// カードのアドレス情報の取得
func (h *cardHandler) GetCardAddress(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// リクエストボディからカードのIDを取得
	var card utils.RequestCharge
	err = json.NewDecoder(r.Body).Decode(&card)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// カードのアドレス情報を取得
	addressData, err := h.db.GetCardAddress(user_id, card.CardID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + err.Error()})
		return
	}

	response := map[string]interface{}{
		"address": addressData,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// クレジットカードの取得
func (h *cardHandler) GetCard(w http.ResponseWriter, r *http.Request) {
	_, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// リクエストボディからカードのIDを取得
	var cardRequest utils.RequestCharge
	err = json.NewDecoder(r.Body).Decode(&cardRequest)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Println("カードID:", cardRequest.CardID)
	// カード情報の取得
	var cardData *square.GetCardResponse
	cardData, err = function.GetCardByID(cardRequest.CardID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + err.Error()})
		return
	}

	responseCard := utils.CardSummary{
		ID:       *cardData.Card.ID,
		Brand:    string(*cardData.Card.CardBrand),
		Last4:    *cardData.Card.Last4,
		ExpMonth: int(*cardData.Card.ExpMonth),
		ExpYear:  int(*cardData.Card.ExpYear),
		Disabled: cardData.Card.Enabled != nil && !*cardData.Card.Enabled,
	}

	response := map[string]interface{}{
		"card":       responseCard,
		"CustomerID": cardData.Card.CustomerID,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
