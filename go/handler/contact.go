package handler

import (
	"animaloop/config"
	"animaloop/function"
	SQL "animaloop/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

type ContactHandler struct {
	db *SQL.Database
}

func NewContactHandler(db *SQL.Database) *ContactHandler {
	return &ContactHandler{db: db}
}

func (h *ContactHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/contact/send", h.SendContact).Methods("POST")
}

type ContactRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Category string `json:"category"`
	Body     string `json:"body"`
}

func (h *ContactHandler) SendContact(w http.ResponseWriter, r *http.Request) {
	var req ContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// 簡易バリデーション
	if req.Name == "" || req.Email == "" || req.Body == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// ---------------------------------------------------------
	// 管理者への通知メール
	// ---------------------------------------------------------
	adminSubject := fmt.Sprintf("【お問い合わせ】%s (%s様)", categoryLabel(req.Category), req.Name)

	// fmt.Sprintfを使うため、CSS内の % は %% と記述する必要があります
	adminBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; color: #333; line-height: 1.6;">
    <h3 style="color: #2c3e50;">以下の内容でお問い合わせがありました</h3>
    
    <table style="width: 100%%; max-width: 600px; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #eee; width: 140px; background-color: #f8f9fa;">お名前</th>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">%s</td>
        </tr>
        <tr>
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #eee; background-color: #f8f9fa;">メールアドレス</th>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">%s</td>
        </tr>
        <tr>
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #eee; background-color: #f8f9fa;">お問い合わせ種別</th>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">%s</td>
        </tr>
    </table>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
        <p style="margin-top: 0; font-weight: bold; color: #555;">■内容:</p>
        <p style="white-space: pre-wrap; margin-bottom: 0;">%s</p>
    </div>
</body>
</html>
`, req.Name, req.Email, categoryLabel(req.Category), req.Body)

	if _, err := function.SendMail(config.FromEmail, adminSubject, adminBody); err != nil {
		log.Printf("Failed to send admin email: %v", err)
		http.Error(w, "Failed to send email", http.StatusInternalServerError)
		return
	}

	// ---------------------------------------------------------
	// ユーザーへの自動返信メール (HTML形式)
	// ---------------------------------------------------------
	userSubject := "【Aftialoop】お問い合わせありがとうございます"

	// fmt.Sprintfを使うため、CSS内の % は %% と記述します
	userBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; color: #333; line-height: 1.6;">
    <h3 style="color: #2c3e50;">お問い合わせありがとうございます</h3>
    <p>%s 様</p>
    <p>以下の内容でお問い合わせを受け付けました。<br>
    担当者より順次ご返信させていただきますので、今しばらくお待ちください。</p>
    
    <table style="width: 100%%; max-width: 600px; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
        <tr>
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #eee; width: 140px; background-color: #f8f9fa;">お問い合わせ種別</th>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">%s</td>
        </tr>
    </table>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
        <p style="margin-top: 0; font-weight: bold; color: #555;">■お問い合わせ内容:</p>
        <p style="white-space: pre-wrap; margin-bottom: 0;">%s</p>
    </div>

    <p style="margin-top: 20px; font-size: 12px; color: #777;">※本メールは自動送信です。</p>
</body>
</html>
`, req.Name, categoryLabel(req.Category), req.Body)

	// エラーでもユーザーには成功を返して良い（ログだけ残す）
	if _, err := function.SendMail(req.Email, userSubject, userBody); err != nil {
		log.Printf("Failed to send reply email to %s: %v", req.Email, err)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// カテゴリIDを日本語に変換
func categoryLabel(cat string) string {
	switch cat {
	case "service":
		return "サービスに関するお問い合わせ"
	case "account":
		return "アカウント・ログインについて"
	case "item":
		return "商品・取引について"
	case "bug":
		return "不具合の報告"
	case "other":
		return "その他"
	default:
		return cat
	}
}
