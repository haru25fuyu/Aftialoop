package page

import (
	"animaloop/function"
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
}

// NewCardHandler はハンドラのコンストラクタ
func NewCardHandler() *cardHandler {
	return &cardHandler{}
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
	token, err := function.CheckUser(w, r)
	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// リクエストボディからカード情報を取得
	var card function.RequestCard
	erro := json.NewDecoder(r.Body).Decode(&card)
	if erro != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Printf("Token: %s", card.Token)
	log.Printf("CustomerID: %s", card.CustomerID)
	log.Printf("Name: %s", card.Name)
	log.Printf("VerificationToken: %s", card.VerificationToken)

	// カード情報を保存
	card_map, erro := function.CreateCard(card)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの保存に失敗しました"})
		return
	}
	log.Println(card_map)

	// レスポンス
	response := map[string]interface{}{
		"card":  card_map,
		"token": token,
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// クレジットカードでの支払い
func (h *cardHandler) ChargeCard(w http.ResponseWriter, r *http.Request) {
	token, err := function.CheckUser(w, r)
	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	//　トークンからIDを取得
	claims, erro := function.GetUserFromToken(token)
	if erro != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// リクエストボディから支払い情報を取得
	var charge function.RequestCharge
	erro = json.NewDecoder(r.Body).Decode(&charge)
	if erro != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Println(charge)

	// 購入履歴を保存
	Purchase_ID,erro := function.SavePurchaseHistory(claims.ID, charge.CardID, charge.Amount, charge.Items, charge.AddressID, "")
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "購入履歴の保存に失敗しました" + erro.Error()})
		return
	}

	// 支払い処理
	url, erro := function.ChargeCard(claims.ID, charge.CardID, charge.Amount)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "支払いに失敗しました" + erro.Error()})
		return
	}
	log.Println("支払い成功")

	SaveReceiptURL := function.SaveReceiptURL(Purchase_ID, url)
	if SaveReceiptURL != nil {
		// レシートURLの保存に失敗(ログに残すがそのまま続行する)
		log.Printf("レシートURLの保存に失敗: %v", SaveReceiptURL)
	}

	for _, item := range charge.Items {
		DeleteCartItem := function.DeleteCartItem(claims.ID, item.ID)
		if DeleteCartItem != nil {
			// カートアイテムの削除に失敗(ログに残すがそのまま続行する)
			log.Printf("カートアイテムの削除に失敗: %v", DeleteCartItem)
		}
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
	res, erro := function.SendMail(claims.Email, subject, htmlContent)
	if erro != nil {
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
	token, err := function.CheckUser(w, r)
	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}
	// トークンからIdを取得
	claims, erro := function.GetUserFromToken(token)
	if erro != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// リクエストボディから住所とクレジットカード情報を取得
	var user_data function.RequestCardWithAddress
	erro = json.NewDecoder(r.Body).Decode(&user_data)
	if erro != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Println(user_data)

	erro = function.SaveOrUpdateCardAddress(claims.ID, user_data.CardID, user_data.AddressID)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの保存に失敗しました: " + erro.Error()})
		return
	}
	log.Println("カードと住所の保存成功")

	// カード情報を取得
	cardData, erro := function.LoadUserAndCards(token)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + erro.Error()})
		return
	}

	// レスポンス
	response := map[string]interface{}{
		"card":    cardData,
		"count":   len(cardData),
		"message": "カードと住所を保存しました",
		"token":   token,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)

}

// 　クレジットカードリストの取得
func (h *cardHandler) ListCards(w http.ResponseWriter, r *http.Request) {
	token, err := function.CheckUser(w, r)
	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	cardData, erro := function.LoadUserAndCards(token)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + erro.Error()})
		return
	}

	response := map[string]interface{}{
		"card":  cardData,
		"count": len(cardData),
		"token": token,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// クレジットカードの削除
func (h *cardHandler) DeleteCard(w http.ResponseWriter, r *http.Request) {
	token, err := function.CheckUser(w, r)
	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}
	// トークンからIdを取得
	claims, erro := function.GetUserFromToken(token)
	if erro != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// リクエストボディから削除するカードのIDを取得
	var card function.RequestCharge
	erro = json.NewDecoder(r.Body).Decode(&card)
	if erro != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Println(card)

	erro = function.DeleteCardAddress(claims.ID, card.CardID)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの削除に失敗しました" + erro.Error()})
		return
	}

	// カードの削除
	erro = function.DeleteCard(card.CardID)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの削除に失敗しました" + erro.Error()})
		return
	}
	log.Println("カード削除成功")

	cardData, erro := function.LoadUserAndCards(token)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + erro.Error()})
		return
	}

	// レスポンス
	response := map[string]interface{}{
		"card":    cardData,
		"count":   len(cardData),
		"message": "カードを削除しました",
		"token":   token,
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// カードのデフォルト設定
func (h *cardHandler) SetDefaultCard(w http.ResponseWriter, r *http.Request) {
	token, err := function.CheckUser(w, r)
	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}
	// トークンからIdを取得
	claims, erro := function.GetUserFromToken(token)
	if erro != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}
	// リクエストボディからデフォルトにするカードのIDを取得
	var card function.RequestCharge
	erro = json.NewDecoder(r.Body).Decode(&card)
	if erro != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// カードのデフォルト設定
	erro = function.SetDefaultCard(claims.ID, card.CardID)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "デフォルトカードの設定に失敗しました" + erro.Error()})
		return
	}
	log.Println("デフォルトカード設定成功")

	cardData, erro := function.LoadUserAndCards(token)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + erro.Error()})
		return
	}

	// レスポンス
	response := map[string]interface{}{
		"card":    cardData,
		"count":   len(cardData),
		"message": "デフォルトカードを設定しました",
		"token":   token,
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// カードのアドレス情報の取得
func (h *cardHandler) GetCardAddress(w http.ResponseWriter, r *http.Request) {
	token, err := function.CheckUser(w, r)
	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}
	// トークンからIdを取得
	claims, erro := function.GetUserFromToken(token)
	if erro != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}
	// リクエストボディからカードのIDを取得
	var card function.RequestCharge
	erro = json.NewDecoder(r.Body).Decode(&card)
	if erro != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// カードのアドレス情報を取得
	addressData, erro := function.GetCardAddress(claims.ID, card.CardID)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + erro.Error()})
		return
	}

	response := map[string]interface{}{
		"address": addressData,
		"token":   token,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// クレジットカードの取得
func (h *cardHandler) GetCard(w http.ResponseWriter, r *http.Request) {
	token, err := function.CheckUser(w, r)
	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// リクエストボディからカードのIDを取得
	var cardRequest function.RequestCharge
	erro := json.NewDecoder(r.Body).Decode(&cardRequest)
	if erro != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Println("カードID:", cardRequest.CardID)
	// カード情報の取得
	var cardData *square.GetCardResponse
	cardData, erro = function.GetCardByID(cardRequest.CardID)
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + erro.Error()})
		return
	}

	responseCard := function.CardSummary{
		ID:        *cardData.Card.ID,
		Brand:     string(*cardData.Card.CardBrand),
		Last4:     *cardData.Card.Last4,
		ExpMonth:  int(*cardData.Card.ExpMonth),
		ExpYear:   int(*cardData.Card.ExpYear),
		Disabled:  cardData.Card.Enabled != nil && !*cardData.Card.Enabled,
	}

	response := map[string]interface{}{
		"card":       responseCard,
		"CustomerID": cardData.Card.CustomerID,
		"token":      token,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
