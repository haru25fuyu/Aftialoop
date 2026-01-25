package handler

import (
	"animaloop/function"
	SQL "animaloop/sql"
	"animaloop/utils"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/gorilla/mux"
)

type userDataHandler struct {
	db *SQL.Database
}

func NewUserDataHandler(db *SQL.Database) *userDataHandler {
	return &userDataHandler{db: db}
}

func (h *userDataHandler) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/mypage", h.mypage).Methods("POST")
	r.HandleFunc("/customer/data", h.GetCustomerData).Methods("POST") // メソッド名統一
	r.HandleFunc("/profile/get", h.GetProfile).Methods("POST")
	r.HandleFunc("/profile/edit", h.EditProfile).Methods("POST")
	r.HandleFunc("/customer", h.GetCustomer).Methods("POST")
}

// マイページの取得 (ダッシュボード用: 基本情報 + カウンターのみ)
func (h *userDataHandler) mypage(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": err.Error()})
		return
	}

	// 並列処理用のチャネル（エラーハンドリング用）
	errCh := make(chan error, 2)
	wg := new(sync.WaitGroup)

	var user utils.SqlUser
	var listingsCount int

	// 1. ユーザー基本情報取得 (フォロー数・フォロワー数・アイコン含む)
	wg.Add(1)
	go func() {
		defer wg.Done()
		// GetUserData は following_count, followers_count, icon_url を含むように修正済み前提
		u, err := h.db.GetUserData([]string{"id = ?"}, []interface{}{user_id})
		if err != nil {
			errCh <- err
			return
		}
		user = u
	}()

	// 2. 出品数をカウント (usersテーブルにカラムがない場合、itemsテーブルから数える)
	wg.Add(1)
	go func() {
		defer wg.Done()
		count, err := h.db.CountUserListings(user_id)
		if err != nil {
			errCh <- err
			// カウント失敗しても致命的ではないので、ログだけ出して count=0 で進める手もあり
			log.Println("出品数カウント失敗:", err)
			listingsCount = 0
			return
		}
		listingsCount = count
	}()

	wg.Wait()
	close(errCh)

	// エラーがあれば返す（ユーザー取得失敗など）
	for err := range errCh {
		if err != nil {
			log.Println("MyPage Error:", err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}

	// レスポンス作成
	// React側(UserProfile型)に合わせて整形
	response := map[string]interface{}{
		"id":              user.ID,
		"name":            user.Name,
		"email":           user.Email,
		"icon_url":        user.IconURL,        // ユーザーアイコン
		"sales_balance":   user.SalesBalance,   // 売上金 (SqlUserに追加が必要かも)
		"point":           user.Point,          // ポイント
		"following_count": user.FollowingCount, // フォロー数
		"followers_count": user.FollowersCount, // フォロワー数
		"listings_count":  listingsCount,       // ★追加: 出品数
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"user": response})
}

// プロフィール取得 (表示・編集画面用)
// ★ここを大幅にリファクタリング！
func (h *userDataHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// ★ 修正ポイント:
	// これまでは GetUserData と GetProfile を別々に呼んで結合していましたが、
	// SQLで JOIN 済みのデータを返す関数を作ったので、それを1発呼ぶだけにします。
	// これでアイコン(users)も自己紹介(profile)も一度に取れます。

	userData, err := h.db.GetUserDataAndProfile([]string{"u.id = ?"}, []interface{}{user_id})
	if err != nil {
		// プロフィールが無い(ユーザーはいる)場合のハンドリングが必要なら
		// GetUserDataAndProfile 内で LEFT JOIN しているので基本は取れるはず
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データ取得失敗: " + err.Error()})
		return
	}

	// レスポンス (RequestUserProfile型をそのまま返せばOK)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(userData)
}

// ユーザー情報取得 (共通利用)
func (h *userDataHandler) GetCustomerData(w http.ResponseWriter, r *http.Request) {
	// GetProfileと同じロジックでOKなら、共通化しても良いですが
	// 用途が違う（こちらは決済用など）ならそのままで。
	// 今回は GetProfile と同じく JOIN 版を使います。
	h.GetProfile(w, r)
}

// ユーザー情報更新
func (h *userDataHandler) EditProfile(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
		return
	}

	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	var request utils.RequestUserProfile
	err = json.Unmarshal([]byte(r.FormValue("data")), &request)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var iconPath string
	file, _, err := r.FormFile("image")
	if err == nil {
		defer file.Close()
		dir := "./static/icon/"
		react_dir := "/static/icon/" // DB保存用パス

		if _, err := os.Stat(dir); os.IsNotExist(err) {
			os.MkdirAll(dir, os.ModePerm)
		}

		// キャッシュ対策でファイル名にタイムスタンプを入れるか、UUIDにするのが本来はベター
		fileName := fmt.Sprintf("icon_%s.png", user_id)
		iconPath = react_dir + fileName

		outFile, err := os.Create(dir + fileName)
		if err != nil {
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}
		defer outFile.Close()
		io.Copy(outFile, file)
	}

	// --- 更新処理 ---

	// 1. usersテーブル更新用データ
	user := utils.SqlUser{
		ID:    user_id,
		Name:  request.Name,
		Email: request.Email,
	}
	// ★重要: アイコンURLは users テーブルのカラムになったので、ここでセットする
	if iconPath != "" {
		user.IconURL = function.Ptr(iconPath)
	}

	user_map, _ := function.StructToMap(user)

	// usersテーブルを更新 (名前、Email、アイコン)
	err = h.db.UpdateUser(user_id, user_map)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザー更新失敗: " + err.Error()})
		return
	}

	// 2. profileテーブル更新用データ
	profile := utils.Profile{
		DateOfBirth: request.DateOfBirth,
		Gender:      request.Gender,
		PhoneNumber: request.PhoneNumber,
		Bio:         request.Bio,
		// IconURL:   // ★ここからは削除済みなのでセットしない
	}

	profile_map, _ := function.StructToMap(profile)

	// profileテーブルを更新 (自己紹介など)
	err = h.db.UpdateProfile(user_id, profile_map)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "プロフィール更新失敗: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "更新しました"})
}

// GetCustomer (EC購入画面などで使う詳細情報)
func (h *userDataHandler) GetCustomer(w http.ResponseWriter, r *http.Request) {
	// ... (元のコードのままでOK。ただし GetUserData がアイコン等を返すようになっているのでリッチになります)
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// 最新の GetUserData (icon, follow count入り) を取得
	customerData, err := h.db.GetUserData([]string{"id = ?"}, []interface{}{user_id})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	defoltAddress, _ := h.db.GetDefaultAddress(user_id)

	response := map[string]interface{}{
		"user": customerData,
		"address": func() string {
			if defoltAddress == nil {
				return ""
			}
			return *defoltAddress.ID
		}(),
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
