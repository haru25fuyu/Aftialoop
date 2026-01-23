package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"animaloop/function"
	"animaloop/utils"

	"github.com/gorilla/mux"
)

// pointHandler は /point 系のエンドポイントをまとめたハンドラです
type pointHandler struct {
	// ここに DB やサービスを注入しても OK
	db *function.Database
}

// NewPointHandler はハンドラのコンストラクタ
func NewPointHandler(db *function.Database) *pointHandler {
	return &pointHandler{
		db: db,
	}
}

// RegisterRoutes がルーティングの登録を行います
func (h *pointHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/point/charge", h.ChargePoint).Methods("POST")
}

// ChargePoint はポイント決済のエンドポイントです
func (h *pointHandler) ChargePoint(w http.ResponseWriter, r *http.Request) {
	// ポイント決済の処理を実装
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil || user_id == "" {
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
	Purchase_ID, err := h.db.SavePurchaseHistory(user_id, "point", int64(charge.Amount), charge.Items, charge.AddressID, "")
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "購入履歴の保存に失敗しました" + err.Error()})
		return
	}

	// ポイント決済の処理を実行
	err = h.db.ChargePoint(user_id, int64(charge.Amount))
	if err != nil {
		log.Printf("ポイント決済に失敗: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "ポイント決済に失敗しました: " + err.Error()})
		return
	}

	log.Println("支払い成功")

	SaveReceiptURL := h.db.SaveReceiptURL(Purchase_ID, "")
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

	// ユーザー情報を取得
	userData, err := h.db.GetUserDataByID(user_id)
	if err != nil {
		log.Println("ユーザー情報の取得に失敗:", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザー情報の取得に失敗しました"})
		return
	}

	// 支払い完了メールの送信
	htmlContent := fmt.Sprintf(`<h3>%s様</h3><br />
	<P>ご購入ありがとうございます。</p><br />
	<p>以下の内容でお支払いが完了しました。</p><br />
	<p>合計ポイント: %dpt</p><br />
	<p>購入日時: %s</p><br />
	<p>お支払い方法: ポイント</p><br />
	<p>領収書は以下のリンクからダウンロードできます。</p><br />
	<p><a href="%s">領収書をダウンロードする</a></p><br />
	<p>ご不明な点がございましたら、お気軽にお問い合わせください。</p><br />
	<p>今後とも、Animaloopをどうぞよろしくお願いいたします。</p><br />
	<p>Animaloopサポートチーム</p>
	`, userData.Name, charge.Amount, "", time.Now().Format("2006-01-02 15:04:05"))

	subject := "【Aftialoop】お支払い完了のお知らせ"

	// メール送信
	res, err := function.SendMail(userData.Email, subject, htmlContent)
	if err != nil {
		log.Printf("SES送信失敗: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "メールの送信に失敗しました"})
		return
	}
	log.Printf("Email sent: %+v", res)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "支払いが完了しました", "receipt_url": ""})

	// 支払い完了メール送信成功
	log.Println("支払い完了メール送信成功")
}
