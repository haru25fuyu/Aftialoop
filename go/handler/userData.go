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
	"time"

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

	// IDで検索する場合 (アプリ内リンク用)
	r.HandleFunc("/users/id/{id}/profile", h.GetUserProfileByID).Methods("GET")

	// ユーザーネームで検索する場合 (URLシェア用)
	r.HandleFunc("/users/username/{username}/profile", h.GetUserProfileByUsername).Methods("GET")

	r.HandleFunc("/identity/submit", h.SubmitIdentityVerification).Methods("POST")
	r.HandleFunc("/identity/image", h.GetIdentityImage).Methods("GET")

	r.HandleFunc("/check/username", h.CheckUsername).Methods("POST")

	r.HandleFunc("/users/{id}/listings", h.ListUserListings).Methods("GET")
	r.HandleFunc("/users/{id}/reviews", h.ListUserReviews).Methods("GET")
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

	currentPassHash, _ := h.db.GetUserPasswordByID(user_id)
	hasPassword := currentPassHash != ""

	// レスポンスデータ作成
	res := map[string]interface{}{
		"id":            userData.ID,
		"name":          userData.Name,
		"username":      userData.Username,
		"email":         userData.Email,
		"icon_url":      userData.IconURL,
		"date_of_birth": userData.DateOfBirth,
		"gender":        userData.Gender,
		"phone_number":  userData.PhoneNumber,
		"bio":           userData.Bio,

		"is_google_connected": userData.GoogleID != nil && *userData.GoogleID != "",
		"is_apple_connected":  userData.AppleID != nil && *userData.AppleID != "",
		"has_password":        hasPassword,
	}

	// レスポンス (RequestUserProfile型をそのまま返せばOK)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}

// ユーザー情報取得 (共通利用: /customer)
func (h *userDataHandler) GetCustomerData(w http.ResponseWriter, r *http.Request) {
	user_id, err := function.CheckUser(h.db, w, r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// DBから全情報を取得
	userData, err := h.db.GetUserData([]string{"id = ?"}, []interface{}{user_id})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	//　必要なデータだけを選んでレスポンスを作る
	response := map[string]interface{}{
		"id":           userData.ID,
		"name":         userData.Name,
		"email":        userData.Email, // 自分の情報なのでEmailは返してOK
		"point":        userData.Point,
		"default_card": userData.DefaultCard, // フロントエンドの型定義に合わせて返す
		"icon_url":     userData.IconURL,     // 多分アイコンも使うので入れておく

		"is_google_linked": userData.GoogleID.String != "",
		"is_apple_linked":  userData.AppleID.String != "",

		"identity_status": userData.IdentityStatus,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": response,
	})
}

// ユーザー情報更新
func (h *userDataHandler) EditProfile(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		log.Println("ParseMultipartForm error:", err)
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
		log.Println("EditProfile Unmarshal error:", err)
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

		// タイムスタンプを入れて毎回違うファイル名にする
		fileName := fmt.Sprintf("icon_%s_%d.png", user_id, time.Now().Unix())
		iconPath = react_dir + fileName

		outFile, err := os.Create(dir + fileName)
		if err != nil {
			log.Println("File creation error:", err)
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}
		defer outFile.Close()
		io.Copy(outFile, file)
	}

	// --- 更新処理 ---

	// 1. usersテーブル更新用データ
	user := utils.SqlUser{
		ID:       user_id,
		Name:     request.Name,
		Email:    request.Email,
		Username: request.Username,
	}

	if iconPath != "" {
		user.IconURL = function.Ptr(iconPath)
	}

	// usersテーブルを更新 (名前、Email、アイコン)
	err = h.db.UpdateUser(user_id, user)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Println("UpdateUser error:", err)
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
		log.Println("UpdateProfile error:", err)
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
	customerData, err := h.db.GetUserData([]string{"id = $1"}, []interface{}{user_id})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	defoltAddress, _ := h.db.GetDefaultAddress(user_id)

	response := map[string]interface{}{
		"user": map[string]interface{}{
			"id":           customerData.ID,
			"name":         customerData.Name,
			"email":        customerData.Email, // 自分の情報なのでEmailは返してOK
			"point":        customerData.Point,
			"default_card": customerData.DefaultCard, // フロントエンドの型定義に合わせて返す
			"icon_url":     customerData.IconURL,     // 多分アイコンも使うので入れておく

			"is_google_linked": customerData.GoogleID.String != "",

			"identity_status": customerData.IdentityStatus,
		},
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
	Username      *string `json:"username"`
	IconUrl       *string `json:"iconUrl"`
	Description   string  `json:"description"`
	RatingAverage float64 `json:"ratingAverage"`
	RatingCount   int     `json:"ratingCount"`

	IsFollowing    bool `json:"isFollowing"`
	IsBlocked      bool `json:"isBlocked"` // ★追加
	FollowersCount int  `json:"followersCount"`
	FollowingCount int  `json:"followingCount"`

	Listings []utils.FleaMarketItemResponse `json:"listings"`
	Reviews  []utils.UserReviewResponse     `json:"reviews"`
}

// ---------------------------------------------------------
// ① IDで取得するハンドラー
// ---------------------------------------------------------
func (h *userDataHandler) GetUserProfileByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	targetID := vars["id"]
	// UUIDで検索
	h.fetchAndRespondProfile(w, r, "u.id = ?", targetID)
}

// ---------------------------------------------------------
// ② ユーザーネームで取得するハンドラー
// ---------------------------------------------------------
func (h *userDataHandler) GetUserProfileByUsername(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	targetUsername := vars["username"]
	// usernameで検索
	h.fetchAndRespondProfile(w, r, "u.username = ?", targetUsername)
}

// ---------------------------------------------------------
// 共通処理 (ロジックは統合)
// ---------------------------------------------------------
func (h *userDataHandler) fetchAndRespondProfile(w http.ResponseWriter, r *http.Request, whereCol string, targetVal string) {
	currentUserID, _ := function.CheckUser(h.db, w, r)

	// 1. 基本情報取得 (ここが失敗＝ユーザー無し)
	basicInfo, err := h.db.GetUserDataAndProfile([]string{whereCol}, []interface{}{targetVal})
	if err != nil {
		log.Printf("User profile fetch error for %s: %v", targetVal, err)
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	// UUIDを確定させる
	targetUserID := basicInfo.ID

	// --- ここから並列処理 (targetUserID を使う) ---
	var (
		listings    []utils.FleaMarketItemResponse
		reviews     []utils.UserReviewResponse
		avg         float64
		count       int
		isFollowing bool
		isBlocked   bool
	)

	eg, ctx := errgroup.WithContext(r.Context())

	// 2. 出品リスト
	eg.Go(func() error {
		var err error
		listings, err = h.db.GetUserListings(ctx, targetUserID, false, 20, 0)
		if listings == nil {
			listings = []utils.FleaMarketItemResponse{}
		}
		if err != nil {
			log.Println("GetUserListings error:", err)
		}
		return nil
	})

	// 3. レビューリスト
	eg.Go(func() error {
		var err error
		reviews, err = h.db.GetUserReviews(ctx, targetUserID, 20, 0)
		if reviews == nil {
			reviews = []utils.UserReviewResponse{}
		}
		if err != nil {
			log.Println("GetUserReviews error:", err)
		}
		return nil
	})

	// 4. 評価集計
	eg.Go(func() error {
		var err error
		avg, count, err = h.db.GetUserRatingStats(targetUserID)
		if err != nil {
			avg = 0
			count = 0
		}
		return nil
	})

	// 5. 関係性 (自分 != 相手)
	if currentUserID != "" && currentUserID != targetUserID {
		eg.Go(func() error {
			var err error
			isFollowing, err = h.db.IsFollowing(ctx, currentUserID, targetUserID)
			if err != nil {
				isFollowing = false
			}
			return nil
		})
		eg.Go(func() error {
			var err error
			isBlocked, err = h.db.IsBlocked(ctx, currentUserID, targetUserID)
			if err != nil {
				isBlocked = false
			}
			return nil
		})
	}

	if err := eg.Wait(); err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// レスポンス作成
	description := ""
	if basicInfo.Bio != nil {
		description = *basicInfo.Bio
	}

	// UsernameがNULLの場合の考慮
	var username *string = nil
	if basicInfo.Username != nil {
		username = basicInfo.Username
	}

	resp := UserProfileAPIResponse{
		ID:             basicInfo.ID,
		Name:           basicInfo.Name,
		Username:       username, // レスポンスに含める
		IconUrl:        basicInfo.IconURL,
		Description:    description,
		RatingAverage:  avg,
		RatingCount:    count,
		Listings:       listings,
		FollowersCount: basicInfo.FollowersCount,
		FollowingCount: basicInfo.FollowingCount,
		IsFollowing:    isFollowing,
		IsBlocked:      isBlocked,
		Reviews:        reviews,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// ユーザーネームの重複チェック
func (h *userDataHandler) CheckUsername(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Username string `json:"username"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	taken, err := h.db.IsUsernameTaken(input.Username)
	if err != nil {
		http.Error(w, "Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	// available: true (使われていない) / false (使われている)
	json.NewEncoder(w).Encode(map[string]bool{"available": !taken})
}

// ListUserListings: 指定ユーザーの出品商品を取得 (公開されているもののみ)
func (h *userDataHandler) ListUserListings(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	targetUserID := vars["id"]

	// ページネーション
	limit := utils.ParseInt(r.URL.Query().Get("limit"), 20)
	offset := utils.ParseInt(r.URL.Query().Get("offset"), 0)

	// includeDrafts = false (他人のリストなので下書きは含めない)
	items, err := h.db.GetUserListings(r.Context(), targetUserID, false, limit, offset)
	if err != nil {
		log.Println("ListUserListings error:", err)
		http.Error(w, "failed to fetch listings", http.StatusInternalServerError)
		return
	}
	if items == nil {
		items = []utils.FleaMarketItemResponse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"items": items})
}

// ListUserReviews: 指定ユーザーの評価一覧を取得
func (h *userDataHandler) ListUserReviews(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	targetUserID := vars["id"]

	limit := utils.ParseInt(r.URL.Query().Get("limit"), 20)
	offset := utils.ParseInt(r.URL.Query().Get("offset"), 0)

	reviews, err := h.db.GetUserReviews(r.Context(), targetUserID, limit, offset)
	if err != nil {
		log.Println("ListUserReviews error:", err)
		http.Error(w, "failed to fetch reviews", http.StatusInternalServerError)
		return
	}
	if reviews == nil {
		reviews = []utils.UserReviewResponse{} // 空配列を返す
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"reviews": reviews})
}
