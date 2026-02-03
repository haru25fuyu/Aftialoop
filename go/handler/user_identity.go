package handler

import (
	"animaloop/function"
	"database/sql"
	"fmt"
	"io"
	"log"
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

// SubmitIdentityVerification 本人確認書類のアップロード処理
func (h *userDataHandler) SubmitIdentityVerification(w http.ResponseWriter, r *http.Request) {
	// 1. 認証チェック
	userID, err := function.CheckUser(h.db, w, r)
	if err != nil {
		log.Println("Unauthorized access attempt")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	log.Printf("Submitting identity verification for user ID: %s\n", userID)
	// 2. フォームデータの解析 (10MB制限)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		log.Println("Error parsing multipart form:", err)
		http.Error(w, "File too large", http.StatusBadRequest)
		return
	}

	// 3. テキストデータの取得
	realName := r.FormValue("real_name")
	realNameKana := r.FormValue("real_name_kana")
	birthDate := r.FormValue("birth_date")
	address := r.FormValue("address")

	// 4. 画像データの読み込み
	// 表面
	frontData, mimeType, err := readFile(r, "image_front")
	if err != nil {
		log.Println("Error reading front image:", err)
		http.Error(w, "image_front is required", http.StatusBadRequest)
		return
	}
	// 裏面
	backData, _, err := readFile(r, "image_back")
	if err != nil {
		log.Println("Error reading back image:", err)
		http.Error(w, "image_back is required", http.StatusBadRequest)
		return
	}
	// 自撮り (MIMEタイプはfrontと同じと仮定、もしくは無視してOK)
	selfieData, _, err := readFile(r, "image_selfie")
	if err != nil {
		log.Println("Error reading selfie image:", err)
		http.Error(w, "image_selfie is required", http.StatusBadRequest)
		return
	}

	// 5. DB保存関数を呼び出す (引数に selfieData を追加)
	err = h.db.InsertIdentityVerification(userID, realName, realNameKana, birthDate, address, frontData, backData, selfieData, mimeType)

	if err != nil {
		// エラーログを出して500を返す
		fmt.Printf("DB Error: %v\n", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	go func() {
		// utilsパッケージの関数を呼ぶ
		function.SendIdentityVerificationNotification(realName, userID)
	}()

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Success"))
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
