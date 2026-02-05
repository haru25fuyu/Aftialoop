package handler

import (
	"animaloop/function"
	"database/sql"
	"fmt"
	"io"
	"net/http"
)

// GetIdentityImage 画像データをDBから取得して返却する
// アクセス例: GET /api/admin/identity/image?id=1&side=selfie
func (h *userDataHandler) GetIdentityImage(w http.ResponseWriter, r *http.Request) {
	// 1. パラメータ取得
	id := r.URL.Query().Get("id")
	side := r.URL.Query().Get("side")

	// バリデーション (selfie も許可)
	if id == "" || (side != "front" && side != "back" && side != "selfie") {
		http.Error(w, "Invalid parameters", http.StatusBadRequest)
		return
	}

	// 2. DB関数を呼び出す
	imageData, mimeType, err := h.db.GetIdentityImageByID(id, side)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Image not found", http.StatusNotFound)
		} else {
			fmt.Printf("DB Error: %v\n", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
		}
		return
	}

	// 3. レスポンス設定
	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Cache-Control", "private, max-age=3600")

	w.Write(imageData)
}

func (h *userDataHandler) SubmitIdentityVerification(w http.ResponseWriter, r *http.Request) {
	// 1. 認証チェック
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. フォーム解析 & データ取得 (省略せずに書いておきます)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "File too large", http.StatusBadRequest)
		return
	}

	realName := r.FormValue("real_name")
	realNameKana := r.FormValue("real_name_kana")
	birthDate := r.FormValue("birth_date")
	address := r.FormValue("address")

	frontData, mimeType, err := readFile(r, "image_front")
	if err != nil {
		http.Error(w, "image_front error", http.StatusBadRequest)
		return
	}
	backData, _, err := readFile(r, "image_back")
	if err != nil {
		http.Error(w, "image_back error", http.StatusBadRequest)
		return
	}
	selfieData, _, err := readFile(r, "image_selfie")
	if err != nil {
		http.Error(w, "image_selfie error", http.StatusBadRequest)
		return
	}

	// 3. DB保存
	err = h.db.CreateIdentityVerification(userID, realName, realNameKana, birthDate, address, frontData, backData, selfieData, mimeType)

	if err != nil {
		// DBのエラーログを出して500を返す
		fmt.Printf("DB Error: %v\n", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// 4. メール通知 (非同期)
	go func() {
		function.SendIdentityVerificationNotification(realName, userID)
	}()

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Success"))
}

// ApproveIdentityVerification 申請を承認する
func (h *userDataHandler) ApproveIdentityVerification(w http.ResponseWriter, r *http.Request) {
	targetUserID, err := function.CheckUser(h.db, w, r)

	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	tx, err := h.db.DB.Begin()
	if err != nil {
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	// 1. 申請データのステータスを承認にする
	_, err = tx.Exec("UPDATE identity_verifications SET status = 'APPROVED' WHERE user_id = ?", targetUserID)
	if err != nil {
		http.Error(w, "Update Verification Error", http.StatusInternalServerError)
		return
	}

	// 2. ユーザー本体のステータスを承認済みにする
	// ★これで「認証済み」になります
	_, err = tx.Exec("UPDATE users SET identity_status = 'APPROVED' WHERE id = ?", targetUserID)
	if err != nil {
		http.Error(w, "Update User Error", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "Commit Error", http.StatusInternalServerError)
		return
	}

	// (任意) ユーザーに「承認されました！」とメールを送るならここで

	w.Write([]byte("Approved"))
}

// ファイル読み込み用ヘルパー関数 (ハンドラー内または別ファイルに定義)
func readFile(r *http.Request, fieldName string) ([]byte, string, error) {
	file, header, err := r.FormFile(fieldName)
	if err != nil {
		// ファイルがない場合、file は nil なので Close() してはいけない
		return nil, "", err
	}
	// エラーがない場合のみ Close する
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return nil, "", err
	}
	return data, header.Header.Get("Content-Type"), nil
}
