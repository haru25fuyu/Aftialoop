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
	"golang.org/x/sync/errgroup"
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

	// 他人のプロフィール取得
	r.HandleFunc("/users/{id}/profile", h.GetUserProfile).Methods("GET")

	r.HandleFunc("/identity/submit", h.SubmitIdentityVerification).Methods("POST")
	r.HandleFunc("/identity/image", h.GetIdentityImage).Methods("GET")
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
	var listingsCount, pendingCount, activeCount int

	// 並列でデータ取得

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

	wg.Add(1)
	go func() {
		defer wg.Done()
		pendingCount, activeCount, err = h.db.GetUserActionCounts(r.Context(), user_id)
		if err != nil {
			errCh <- err
			// カウント失敗しても致命的ではないので、ログだけ出して count=0 で進める手もあり
			log.Println("出品数カウント失敗:", err)
			pendingCount, activeCount = 0, 0
			return
		}
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
		"id":                        user.ID,
		"name":                      user.Name,
		"email":                     user.Email,
		"icon_url":                  user.IconURL,        // ユーザーアイコン
		"sales_balance":             user.SalesBalance,   // 売上金 (SqlUserに追加が必要かも)
		"point":                     user.Point,          // ポイント
		"following_count":           user.FollowingCount, // フォロー数
		"followers_count":           user.FollowersCount, // フォロワー数
		"listings_count":            listingsCount,       // 出品数
		"identity_status":           user.IdentityStatus, // 本人確認ステータス
		"pending_requests_count":    pendingCount,
		"active_transactions_count": activeCount,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"user": response})
}

// プロフィール取得 (表示・編集画面用)
func (h *userDataHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	userData, err := h.db.GetUserDataAndProfile([]string{"u.id = ?"}, []interface{}{user_id})
	if err != nil {
		log.Println("GetProfile error:", err)
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
	file, _, err := r.FormFile("icon_url")
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

	if iconPath != "" {
		user.IconURL = function.Ptr(iconPath)
	}

	// usersテーブルを更新 (名前、Email、アイコン)
	err = h.db.UpdateUser(user_id, user)
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
	}

	// profileテーブルを更新 (自己紹介など)
	err = h.db.UpdateProfile(user_id, profile)
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

// プロフィールAPIのレスポンス構造体
type UserProfileAPIResponse struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	IconUrl       *string `json:"iconUrl"` // JS側で camelCase なので注意
	Description   string  `json:"description"`
	RatingAverage float64 `json:"ratingAverage"`
	RatingCount   int     `json:"ratingCount"`

	IsFollowing    bool `json:"isFollowing"`
	FollowersCount int  `json:"followersCount"`
	FollowingCount int  `json:"followingCount"`

	Listings []utils.FleaMarketItemResponse `json:"listings"`
	Reviews  []utils.UserReviewResponse     `json:"reviews"`
}

// GET /users/{id}/profile
func (h *userDataHandler) GetUserProfile(w http.ResponseWriter, r *http.Request) {
	// 閲覧者(自分)のID取得 (エラーでもゲストとして続行)
	currentUserID, _ := function.CheckUser(h.db, w, r)

	vars := mux.Vars(r)
	targetUserID := vars["id"]

	// 結果を格納する変数を定義
	var (
		basicInfo   utils.RequestUserProfile // または *utils.User (DB定義に合わせて)
		listings    []utils.FleaMarketItemResponse
		reviews     []utils.UserReviewResponse
		avg         float64
		count       int
		isFollowing bool
	)

	// errgroup の作成
	eg, ctx := errgroup.WithContext(r.Context())

	// 1. 基本ユーザー情報 (これだけは必須なのでエラーなら即終了)
	eg.Go(func() error {
		var err error
		// context対応のメソッドがあれば ctx を渡すのがベストですが、なければそのまま
		basicInfo, err = h.db.GetUserDataAndProfile([]string{"u.id = ?"}, []interface{}{targetUserID})
		if err != nil {
			return err // ここでエラーを返すと eg.Wait() でエラーになる
		}
		return nil
	})

	// 2. 出品リスト (失敗しても空リストでOKとする)
	eg.Go(func() error {
		var err error
		listings, err = h.db.GetUserListings(ctx, targetUserID, false, 20, 0)
		if err != nil {
			listings = []utils.FleaMarketItemResponse{} // 空にする
			// エラーを返さない (nil) = 全体の処理は止めない
		}
		return nil
	})

	// 3. レビューリスト (失敗しても空リスト)
	eg.Go(func() error {
		var err error
		reviews, err = h.db.GetUserReviews(targetUserID, 20)
		if err != nil {
			reviews = []utils.UserReviewResponse{}
		}
		return nil
	})

	// 4. 評価集計 (失敗しても0点)
	eg.Go(func() error {
		var err error
		avg, count, err = h.db.GetUserRatingStats(targetUserID)
		if err != nil {
			avg = 0
			count = 0
		}
		return nil
	})

	// 5. フォロー状態の確認 (ログイン済み かつ 本人以外の場合)
	if currentUserID != "" && currentUserID != targetUserID {
		eg.Go(func() error {
			var err error
			isFollowing, err = h.db.IsFollowing(ctx, currentUserID, targetUserID)
			if err != nil {
				isFollowing = false
			}
			return nil
		})
	}

	// 全てのスレッドが終わるのを待つ
	if err := eg.Wait(); err != nil {
		// 基本情報(1番)が取れなかった場合のみここに来る
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	// レスポンス構築
	// basicInfo がポインタか構造体かで書き方が変わるので調整してください
	// ここでは構造体として扱っています
	resp := UserProfileAPIResponse{
		ID:            basicInfo.ID,
		Name:          basicInfo.Name,
		IconUrl:       basicInfo.IconURL,
		Description:   *basicInfo.Bio,
		RatingAverage: avg,
		RatingCount:   count,
		Listings:      listings,

		// basicInfoにJOINで取ってきたカウントが入っているならそれを使う
		FollowersCount: basicInfo.FollowersCount,
		FollowingCount: basicInfo.FollowingCount,

		IsFollowing: isFollowing, // 並行処理で取得した結果
		Reviews:     reviews,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
