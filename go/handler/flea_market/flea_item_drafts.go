package handler

import (
	"animaloop/function"
	"animaloop/utils"
	"bytes"
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

// ---- 下書き関連 ----

// 保存（新規 or 更新）
func (h *FleaMarketHandler) SaveFleaDraft(w http.ResponseWriter, r *http.Request) {
	uid, err := function.CheckUser(h.db, w, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// ★デバッグ: リクエストボディを一度読み出してログに出す
	bodyBytes, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes)) // 読み出した分を戻す

	var req utils.SaveDraftRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[ERROR] JSON Decode Error: %v", err) // エラー内容をログに
		http.Error(w, fmt.Sprintf("invalid json: %v", err), http.StatusBadRequest)
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
			http.Error(w, "draft not found", http.StatusNotFound)
			return
		}
		// その他のエラー
		http.Error(w, err.Error(), http.StatusInternalServerError)
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
	// 1. 最大10MB制限
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "File too large", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Error retrieving the file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// 2. 保存ディレクトリ（相対パスに変更）
	uploadDir := "static/flea_drafts"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		http.Error(w, "Error creating directory", http.StatusInternalServerError)
		return
	}

	// 3. 安全なファイル名の生成
	// filepath.Base でパス操作を防ぎ、拡張子を保持しつつユニーク化
	cleanFileName := filepath.Base(handler.Filename)
	filename := fmt.Sprintf("%d-%s", time.Now().UnixNano(), cleanFileName)
	savePath := filepath.Join(uploadDir, filename)

	// 4. ファイルの保存
	dst, err := os.Create(savePath)
	if err != nil {
		http.Error(w, "Error saving the file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "Error copying the file", http.StatusInternalServerError)
		return
	}

	// 5. DB保存用のURL作成（ブラウザからアクセス可能な形式）
	publicURL := "/" + filepath.ToSlash(savePath)

	id, err := h.db.UploadImageAsset(publicURL)
	if err != nil {
		http.Error(w, "Error saving file info to DB", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(UploadResponse{
		ID:  id,
		URL: publicURL,
	})
}
