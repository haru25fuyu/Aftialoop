package page

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
	token, err := function.CheckUser(h.db, w, r)
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
	var charge utils.RequestCharge
	erro = json.NewDecoder(r.Body).Decode(&charge)
	if erro != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	log.Println(charge)

	// 購入履歴を保存
	Purchase_ID, erro := h.db.SavePurchaseHistory(claims.ID, "point", charge.Amount, charge.Items, charge.AddressID, "")
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "購入履歴の保存に失敗しました" + erro.Error()})
		return
	}

	// ポイント決済の処理を実行
	erro = h.db.ChargePoint(claims.ID, charge.Amount)
	if erro != nil {
		log.Printf("ポイント決済に失敗: %v", erro)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "ポイント決済に失敗しました: " + erro.Error()})
		return
	}

	log.Println("支払い成功")

	SaveReceiptURL := h.db.SaveReceiptURL(Purchase_ID, "")
	if SaveReceiptURL != nil {
		// レシートURLの保存に失敗(ログに残すがそのまま続行する)
		log.Printf("レシートURLの保存に失敗: %v", SaveReceiptURL)
	}

	for _, item := range charge.Items {
		DeleteCartItem := h.db.DeleteCartItem(claims.ID, item.ID)
		if DeleteCartItem != nil {
			// カートアイテムの削除に失敗(ログに残すがそのまま続行する)
			log.Printf("カートアイテムの削除に失敗: %v", DeleteCartItem)
		}
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
	`, claims.Name, charge.Amount, "", time.Now().Format("2006-01-02 15:04:05"))

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
	json.NewEncoder(w).Encode(map[string]string{"message": "支払いが完了しました", "receipt_url": ""})

	// 支払い完了メール送信成功
	log.Println("支払い完了メール送信成功")
}
