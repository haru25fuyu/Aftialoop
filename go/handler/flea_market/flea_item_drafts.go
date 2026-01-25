package handler

import (
	"animaloop/function"
	"animaloop/utils"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gorilla/mux"
)

// ---- ドラフト関連 ----

// 保存（新規 or 更新）
func (h *FleaMarketHandler) SaveFleaDraft(w http.ResponseWriter, r *http.Request) {
	uid, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req utils.SaveDraftRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var draftID uint64
	var savedAt time.Time
	if req.DraftID == nil || *req.DraftID == 0 {
		draftID, savedAt, err = h.db.CreateDraft(ctx, uid, req.Payload)
		if err != nil {
			id, savedAt, err := h.db.CreateDraft(ctx, uid, req.Payload)
			if err != nil {
				log.Printf("[draft.save] create failed: %v", err)
				http.Error(w, "create failed", 500)
				return
			}
			json.NewEncoder(w).Encode(utils.SaveDraftResponse{DraftID: id, SavedAt: savedAt.UTC().Format(time.RFC3339)})
			return
		}
	} else {
		savedAt, err = h.db.UpdateDraftByID(ctx, uid, *req.DraftID, req.Payload)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				id, savedAt2, err2 := h.db.CreateDraft(ctx, uid, req.Payload)
				if err2 != nil {
					log.Printf("[draft.save] fallback create failed: %v", err2)
					http.Error(w, "create failed", 500)
					return
				}
				json.NewEncoder(w).Encode(utils.SaveDraftResponse{DraftID: id, SavedAt: savedAt2.UTC().Format(time.RFC3339)})
				return
			}
			http.Error(w, "update failed", http.StatusInternalServerError)
			return
		}
		draftID = *req.DraftID
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(utils.SaveDraftResponse{
		DraftID: draftID,
		SavedAt: savedAt.UTC().Format(time.RFC3339),
	})
}

// 1件取得
func (h *FleaMarketHandler) GetFleaDraftByID(w http.ResponseWriter, r *http.Request) {
	uid, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", 401)
		return
	}
	idStr := mux.Vars(r)["id"]
	did, convErr := utils.ParseUint(idStr)
	if convErr != nil {
		http.Error(w, "bad id", 400)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	resp, err := h.db.GetFleaDraftByID(ctx, uid, did)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "not found", 404)
			return
		}
		http.Error(w, "db error", 500)
		return
	}
	_ = json.NewEncoder(w).Encode(resp)
}

// 一覧
func (h *FleaMarketHandler) ListFleaDrafts(w http.ResponseWriter, r *http.Request) {
	uid, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", 401)
		return
	}
	q := r.URL.Query()
	limit := utils.ParseInt(q.Get("limit"), 20)
	offset := utils.ParseInt(q.Get("offset"), 0)

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	resp, err := h.db.ListDraftsByUser(ctx, uid, limit, offset)
	if err != nil {
		log.Printf("[draft.list] db error: %v", err)
		http.Error(w, "db error", 500)
		return
	}
	_ = json.NewEncoder(w).Encode(resp)
}

// アーカイブ（削除扱い）
func (h *FleaMarketHandler) DeleteFleaDraft(w http.ResponseWriter, r *http.Request) {
	uid, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", 401)
		return
	}
	idStr := mux.Vars(r)["id"]
	did, convErr := utils.ParseUint(idStr)
	if convErr != nil {
		http.Error(w, "bad id", 400)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	if err := h.db.ArchiveDraft(ctx, uid, did); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, "not found", 404)
			return
		}
		log.Printf("[draft.delete] delete failed: %v", err)
		http.Error(w, "delete failed", 500)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// レスポンスの型定義
type UploadResponse struct {
	ID  int64  `json:"id"`
	URL string `json:"url"`
}

func (h *FleaMarketHandler) UploadTempImage(w http.ResponseWriter, r *http.Request) {
	// 1. 画像サイズの制限 (例: 10MB)
	r.ParseMultipartForm(10 << 20)

	// 2. フロントから送られてきた "image" を取得
	file, handler, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Error retrieving the file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// 3. 保存先ディレクトリの作成 (なければ作る)
	uploadDir := "/var/www/web/Aftialoop/go/static"

	// ディレクトリがなければ作る（権限エラーが出る場合は事前にmkdirが必要かも）
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}

	// 4. ユニークなファイル名を生成 (タイムスタンプ + 元のファイル名)
	filename := fmt.Sprintf("%d-%s", time.Now().UnixNano(), handler.Filename)
	filepath := filepath.Join(uploadDir, filename)

	// 5. ファイルを保存
	dst, err := os.Create(filepath)
	if err != nil {
		http.Error(w, "Error saving the file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "Error copying the file", http.StatusInternalServerError)
		return
	}

	// 6. DBに情報を保存 (IDを発番するため)
	// ※ 公開用URL: "/static/" というパスでアクセスできる前提とします
	publicURL := fmt.Sprintf("/static/%s", filename)

	id, err := h.db.UploadImageAsset(publicURL)
	if err != nil {
		http.Error(w, "Error saving file info to DB", http.StatusInternalServerError)
		return
	}

	// 7. JSONで結果を返す
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(UploadResponse{
		ID:  id,
		URL: publicURL, // フロントエンドはこのURLを使って画像を表示します
	})
}
