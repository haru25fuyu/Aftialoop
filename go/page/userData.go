package page

import (
	"animaloop/function"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/gorilla/mux"
)

// userDataHandler は /user 系のエンドポイントをまとめたハンドラです
type userDataHandler struct {
	// ここに DB やサービスを注入しても OK
}

// NewUserDataHandler はハンドラのコンストラクタ
func NewUserDataHandler() *userDataHandler {
	return &userDataHandler{}
}

// RegisterRoutes がルーティングの登録を行います
func (h *userDataHandler) RegisterRoutes(r *mux.Router) {
	// POST /mypage
	r.HandleFunc("/mypage", h.mypage).Methods("POST")
	// GET /customer/data
	r.HandleFunc("/customer/data", h.GetcustomerData).Methods("POST")
	// DELETE /profile/get
	r.HandleFunc("/profile/get", h.GetProfile).Methods("POST")
	// GET /user/list
	r.HandleFunc("/profile/edit", h.EditProfile).Methods("POST")

	r.HandleFunc("/customer", h.GetCustomer).Methods("POST")

}

// マイページの取得
func (h *userDataHandler) mypage(w http.ResponseWriter, r *http.Request) {
	token, res := function.CheckUser(w, r)
	if res != "" || token == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": res})
		return
	}
	log.Println(token)
	// トークンを検証
	var claims *function.User
	claims, err := function.GetUserFromToken(token)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		log.Println(err)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// 結果を格納する変数
	var history interface{}
	var favorites interface{}
	var user interface{}

	// エラーチャネルを用意
	errCh := make(chan error, 3) // 3つの非同期処理があるためバッファサイズ3

	wg := new(sync.WaitGroup)

	// 履歴取得
	wg.Add(1)
	go func() {
		defer wg.Done()
		h, err := function.GetHistory(claims.ID, 0)
		if err != nil {
			errCh <- err
			return
		}
		history = h
	}()

	// お気に入り取得
	wg.Add(1)
	go func() {
		defer wg.Done()
		f, err := function.GetFavoriteItems(claims.ID, 0)
		if err != nil {
			errCh <- err
			return
		}
		favorites = f
	}()

	// ユーザー情報取得
	wg.Add(1)
	go func() {
		defer wg.Done()
		u, err := function.GetUserData([]string{"id"}, []interface{}{claims.ID})
		if err != nil {
			errCh <- err
			return
		}
		user = u
	}()

	// 全ての処理が完了するのを待つ
	wg.Wait()
	close(errCh)

	// エラーチェック
	for err := range errCh {
		if err != nil {
			// エラーハンドリング
			log.Println(err)
		}
	}
	// レスポンスを返す
	response := map[string]interface{}{
		"history":      history,
		"favorites":    favorites,
		"user":         user,
		"access_token": token,
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// ユーザー情報取得
func (h *userDataHandler) GetcustomerData(w http.ResponseWriter, r *http.Request) {
	token, err := function.CheckUser(w, r)

	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// トークンからIdを取得
	claims, erro := function.GetUserFromToken(token)
	if erro != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// IDを返す
	userData, erro := function.GetUserDataAndProfile([]string{"u.ID=?"}, []interface{}{claims.ID})
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "データの取得に失敗しました: " + erro.Error()})
		return
	}

	response := map[string]interface{}{
		"user":  userData,
		"token": token,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// ユーザー情報取得
func (h *userDataHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	token, err := function.CheckUser(w, r)
	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// トークンからIdを取得
	claims, erro := function.GetUserFromToken(token)
	if erro != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです" + erro.Error()})
		log.Println("トークンの取得に失敗:", erro)
		return
	}

	// ユーザー情報取得
	userData, erro := function.GetUserData([]string{"id = ?"}, []interface{}{claims.ID})
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "userデータの取得に失敗しました: " + erro.Error()})
		return
	}

	// プロフィール情報取得
	profileData, erro := function.GetProfile(claims.ID)
	if erro != nil {
		log.Println("DB取得失敗:", erro)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "profileデータの取得に失敗しました: " + erro.Error()})
		return
	}

	// ユーザー情報とプロフィール情報を結合
	response := map[string]interface{}{
		"Name":         userData.Name,
		"Email":        userData.Email,
		"DateOfBirth":  profileData.DateOfBirth,
		"Gender":       profileData.Gender,
		"PhoneNumber":  profileData.PhoneNumber,
		"Bio":          profileData.Bio,
		"IconURL":      profileData.IconURL,
		"access_token": token,
	}

	log.Println("ユーザー情報取得:", response)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// ユーザー情報更新
func (h *userDataHandler) EditProfile(w http.ResponseWriter, r *http.Request) {
	// 1. multipart/form-dataのリクエストを処理するために、最初にリクエストの解析を行う
	err := r.ParseMultipartForm(10 << 20) // 例えば最大10MBのフォームデータを許可
	if err != nil {
		http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
		return
	}

	token, erro := function.CheckUser(w, r)
	if erro != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// トークンからIdを取得
	claims, err := function.GetUserFromToken(token)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	var request function.RequestUserProfile
	err = json.Unmarshal([]byte(r.FormValue("data")), &request)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 初期値は空文字で
	var iconPath string

	// 画像がアップロードされているか確認
	file, _, err := r.FormFile("image")
	if err == nil {
		// 画像があるときだけ保存処理
		defer file.Close()

		dir := "./account_data/icon/"
		react_dir := "/static/icon/"
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			if err := os.MkdirAll(dir, os.ModePerm); err != nil {
				http.Error(w, "Failed to create directory", http.StatusInternalServerError)
				return
			}
		}

		fileName := fmt.Sprintf("icon_%s.png", claims.ID)
		iconPath = react_dir + fileName

		outFile, err := os.Create(dir + fileName)
		if err != nil {
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}
		defer outFile.Close()

		if _, err := io.Copy(outFile, file); err != nil {
			http.Error(w, "Failed to write file", http.StatusInternalServerError)
			return
		}
	} else {
		// 画像が送信されていない場合は何もしない
		log.Println("✅ No image uploaded, keeping existing IconURL")
	}

	log.Println(file)

	// ユーザー情報を取得
	user := function.SqlUser{
		ID:    claims.ID,
		Name:  request.Name,
		Email: request.Email,
	}

	// 既存プロフィールを取得（←これがキモ！）
	existingProfile, _ := function.GetProfile(claims.ID)

	profile := function.Profile{
		DateOfBirth: function.Ptr(request.DateOfBirth),
		Gender:      function.Ptr(request.Gender),
		PhoneNumber: function.Ptr(request.PhoneNumber),
		Bio:         function.Ptr(request.Bio),
		IconURL:     existingProfile.IconURL, // デフォは今のやつ
	}

	// もし画像が新しくアップロードされてたら、差し替え
	if iconPath != "" {
		profile.IconURL = function.Ptr(iconPath)
	}

	user_map, err := function.StructToMap(user)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "map変換に失敗しました"})
		return
	}
	// ユーザー情報更新
	err = function.UpdateUser(claims.ID, user_map)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "ユーザーデータの更新に失敗しました： " + err.Error()})
		return
	}

	profile_map, err := function.StructToMap(profile)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "map変換に失敗しました"})
		return
	}

	// プロフィール情報更新
	err = function.UpdateProfile(claims.ID, profile_map)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "プロフィールの更新に失敗しました： " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "ユーザー情報を更新しました"})
}

func (h *userDataHandler) GetCustomer(w http.ResponseWriter, r *http.Request) {
	token, err := function.CheckUser(w, r)
	if err != "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	// トークンからIdを取得
	claims, erro := function.GetUserFromToken(token)
	if erro != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "無効なトークンです"})
		return
	}

	customerData, erro := function.GetUserData([]string{"ID = ?"}, []interface{}{claims.ID})
	if erro != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"err_message": "カスタマーデータの取得に失敗しました: " + erro.Error()})
		return
	}

	response := map[string]interface{}{
		"user":  customerData,
		"token": token,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
