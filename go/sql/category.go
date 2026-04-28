package sql

import (
	"database/sql"
	"fmt"
	"strconv"
	"strings"

	"github.com/jmoiron/sqlx"
)

// Category モデル
type Category struct {
	ID           uint64  `db:"id" json:"id"`
	Name         string  `db:"name" json:"name"`
	Slug         string  `db:"slug" json:"slug"`
	ParentID     *uint64 `db:"parent_id" json:"parent_id"`
	Path         *string `db:"path" json:"path"`
	Rank         *string `db:"rank" json:"rank"`
	FullPathName string  `db:"-" json:"full_path_name,omitempty"`
	BuiltInType  *string `db:"built_in_type" json:"built_in_type"` // ★ポインタ型です
	MatchLen     *int    `db:"match_len" json:"-"`                 // 検索スコア用 (DB専用)
	FullSlugPath string  `db:"-" json:"full_slug_path"`
	HasChildren  bool    `db:"has_children" json:"has_children"`
}

// 用品種別マスター
type SupplyType struct {
	ID   uint64 `db:"id" json:"id"`
	Name string `db:"name" json:"name"`
	Slug string `db:"slug" json:"slug"` // ★追加: "food", "cage" 等
}

// 検索結果受け取り用
type SupplySearchResult struct {
	CategoryID   uint64 `db:"category_id"`
	CategoryName string `db:"category_name"`
	CategorySlug string `db:"category_slug"` // ★生体のslug (dog)

	SupplyTypeID   uint64 `db:"supply_type_id"`
	SupplyTypeName string `db:"supply_type_name"`
	SupplyTypeSlug string `db:"supply_type_slug"` // ★用品のslug (food)
}

type SearchSuggestion struct {
	ID          uint64  `db:"id" json:"id"`
	Name        string  `db:"name" json:"name"`
	Slug        string  `db:"slug" json:"slug"`
	Type        string  `db:"type" json:"type"` // "category" or "supply" or "combination"
	BuiltInType *string `db:"built_in_type" json:"built_in_type"`

	SupplyID   *uint64 `db:"supply_id" json:"supply_id,omitempty"`
	SupplyName *string `db:"supply_name" json:"supply_name,omitempty"`
	SupplySlug *string `db:"supply_slug" json:"supply_slug,omitempty"`

	FullPathName string `db:"-" json:"full_path_name"`
	FullSlugPath string `db:"-" json:"full_slug_path,omitempty"`

	Path     *string `db:"path" json:"-"`
	MatchLen *int    `db:"match_len" json:"-"`
}

// -------------------------------------------------------
// 1. 階層API用: 親IDを指定して子供を取得
// -------------------------------------------------------
// GetCategoriesByParentID を修正して has_children を判定する
func (db *Database) GetCategoriesByParentID(parentID *uint64) ([]Category, error) {
    var categories []Category
    var query string
    var args []interface{}

    // PostgreSQLでは型を明確にするため ::boolean をつけるとより確実です
    existsQuery := "EXISTS(SELECT 1 FROM categories c2 WHERE c2.parent_id = c1.id)::boolean"

    if parentID == nil {
        query = fmt.Sprintf(`
            SELECT 
                c1.id, c1.name, c1.slug, c1.parent_id, c1.path, c1.rank, c1.built_in_type,
                %s AS has_children
            FROM categories c1
            WHERE c1.parent_id IS NULL 
            ORDER BY c1.id ASC`, existsQuery)
    } else {
        query = fmt.Sprintf(`
            SELECT 
                c1.id, c1.name, c1.slug, c1.parent_id, c1.path, c1.rank, c1.built_in_type,
                %s AS has_children
            FROM categories c1
            WHERE c1.parent_id = ? 
            ORDER BY c1.id ASC`, existsQuery)
        args = append(args, *parentID)
    }

    // ★ ここで PostgreSQL 用の $1 に変換
    query = db.DB.Rebind(query)

    err := db.DB.Select(&categories, query, args...)
    if err != nil {
        return nil, err
    }
    return categories, nil
}

// -------------------------------------------------------
//  2. 検索API用: キーワード検索＋パンくずリスト生成
//     (スペース区切り & 逆検索対応)
//
// -------------------------------------------------------
func (db *Database) SearchCategories(keyword string) ([]Category, error) {
	var results []Category

	keyword = strings.ReplaceAll(keyword, "　", " ")
	words := strings.Fields(keyword)
	if len(words) == 0 {
		return nil, nil
	}

	// 1. 検索実行（ここは元のまま）
	query := `
        SELECT DISTINCT 
            c.id, c.name, c.slug, c.parent_id, c.path, c.rank, c.built_in_type,
            CHAR_LENGTH(st.term) as match_len
        FROM categories c
        LEFT JOIN search_tags st ON c.id = st.category_id
        WHERE 
    `

	var whereClauses []string
	var args []interface{}

	for _, w := range words {
		condition := `(
            c.name LIKE ? 
            OR (? LIKE CONCAT('%', c.name, '%') AND CHAR_LENGTH(c.name) >= 2)
            OR st.term LIKE ?
            OR (? LIKE CONCAT('%', st.term, '%') AND CHAR_LENGTH(st.term) >= 2)
        )`
		whereClauses = append(whereClauses, condition)
		likeWord := "%" + w + "%"
		exactWord := w
		args = append(args, likeWord, exactWord, likeWord, exactWord)
	}

	query += strings.Join(whereClauses, " AND ")
	query += `
        ORDER BY 
            match_len DESC,
            c.id ASC
        LIMIT 20
    `

	err := db.DB.Select(&results, query, args...)
	if err != nil {
		return nil, err
	}

	// 検索結果がなければ終了
	if len(results) == 0 {
		return results, nil
	}

	// -------------------------------------------------------
	// 2. ここから改修：パス解決（名前とSlugの両方を一括取得）
	// -------------------------------------------------------

	// (A) 必要な全カテゴリーID（親含む）を収集
	relatedIDs := make(map[uint64]bool)
	for _, cat := range results {
		if cat.Path != nil && *cat.Path != "" {
			// Path "1/2/3/" を分解してIDを集める
			ids := strings.Split(strings.Trim(*cat.Path, "/"), "/")
			for _, idStr := range ids {
				id, _ := strconv.ParseUint(idStr, 10, 64)
				if id > 0 {
					relatedIDs[id] = true
				}
			}
		}
		// 自分自身も念のため含める
		relatedIDs[cat.ID] = true
	}

	// (B) IDリストを作成して一括取得
	if len(relatedIDs) > 0 {
		var idList []uint64
		for id := range relatedIDs {
			idList = append(idList, id)
		}

		// sqlx.In で "WHERE id IN (?)" を展開
		q, args, err := sqlx.In("SELECT id, name, slug FROM categories WHERE id IN (?)", idList)
		if err != nil {
			return nil, err
		}
		q = db.DB.Rebind(q)

		// 辞書作成用の一時構造体
		var parents []struct {
			ID   uint64 `db:"id"`
			Name string `db:"name"`
			Slug string `db:"slug"`
		}
		err = db.DB.Select(&parents, q, args...)
		if err != nil {
			return nil, err
		}

		// (C) IDからデータを引けるマップを作成
		parentMap := make(map[uint64]struct{ Name, Slug string })
		for _, p := range parents {
			parentMap[p.ID] = struct{ Name, Slug string }{p.Name, p.Slug}
		}

		// (D) 各結果の FullPathName と FullSlugPath を組み立てる
		for i, cat := range results {
			// パスがない場合は自分自身の値を入れる
			if cat.Path == nil || *cat.Path == "" {
				results[i].FullPathName = cat.Name
				results[i].FullSlugPath = cat.Slug
				continue
			}

			pathIDs := strings.Split(strings.Trim(*cat.Path, "/"), "/")
			var names []string
			var slugs []string

			for _, pidStr := range pathIDs {
				pid, _ := strconv.ParseUint(pidStr, 10, 64)
				if info, ok := parentMap[pid]; ok {
					names = append(names, info.Name)
					// Slugが空でなければ追加
					if info.Slug != "" {
						slugs = append(slugs, info.Slug)
					}
				}
			}

			// 結合してセット
			results[i].FullPathName = strings.Join(names, " > ") // 例: 昆虫 > クワガタ
			results[i].FullSlugPath = strings.Join(slugs, "/")   // 例: insect/stag-beetle
		}
	}

	return results, nil
}

// -------------------------------------------------------
// 3. 用品検索ロジック (SearchSupplies)
// -------------------------------------------------------
func (db *Database) SearchSupplies(keyword string) ([]SupplySearchResult, error) {
	var results []SupplySearchResult

	// 1. キーワードの前処理
	keyword = strings.ReplaceAll(keyword, "　", " ")
	words := strings.Fields(keyword)

	if len(words) == 0 {
		return nil, nil
	}

	// -------------------------------------------------------
	// ★追加: 自動分割ロジック (ドックフード -> ドック, フード)
	// -------------------------------------------------------
	if len(words) == 1 {
		raw := words[0]
		var matchedSupplyName string
		// DBから用品名を探す (長い順)
		checkQuery := `SELECT name FROM supply_types WHERE $1 LIKE '%' || name || '%' ORDER BY LENGTH(name) DESC LIMIT 1`
		err := db.DB.Get(&matchedSupplyName, checkQuery, raw)

		if err == nil && matchedSupplyName != "" && matchedSupplyName != raw {
			prefix := strings.Replace(raw, matchedSupplyName, "", 1)
			if prefix != "" {
				// 分割成功！ -> ["ドック", "フード"]
				words = []string{prefix, matchedSupplyName}
			}
		}
	}

	// クエリ構築準備
	var query string
	var args []interface{}

	baseQuery := `
        SELECT 
            c.id as category_id,
            c.name as category_name,
            c.slug as category_slug,
            st.id as supply_type_id,
            st.name as supply_type_name,
            st.slug as supply_type_slug
        FROM categories c
        JOIN supply_types st ON 1=1
        LEFT JOIN search_tags tc ON c.id = tc.category_id
        LEFT JOIN search_tags ts ON st.id = ts.supply_type_id
        WHERE 
    `

	makeCondition := func(tableAlias, colName string) string {
    fullCol := fmt.Sprintf("%s.%s", tableAlias, colName)
    // $1, $2 は後で Rebind で解決するので、一旦 ? のままでもOKですが、
    // PostgreSQL の LIKE 演算子に合わせます
    return fmt.Sprintf("(%s LIKE ? OR (? LIKE '%%' || %s || '%%' AND LENGTH(%s) >= 2))", fullCol, fullCol, fullCol)
	}

	catMatchCond := fmt.Sprintf("(%s OR %s)", makeCondition("c", "name"), makeCondition("tc", "term"))
	supplyMatchCond := fmt.Sprintf("(%s OR %s)", makeCondition("st", "name"), makeCondition("ts", "term"))

	groupByClause := `
        GROUP BY 
            c.id, c.name, c.slug, 
            st.id, st.name, st.slug
    `

	if len(words) == 1 {
		// --- パターンA: 1単語 (分割できなかった場合) ---
		w := words[0]
		likeW := "%" + w + "%"
		exactW := w

		// 並び順: タグヒット > 名前ヒット > 短い順
		orderByClause := `
            ORDER BY 
                MIN(CASE 
                    WHEN tc.term LIKE ? THEN 1
                    WHEN c.name LIKE ? THEN 2
                    ELSE 3 
                END) ASC,
                CHAR_LENGTH(c.name) ASC,
                c.id ASC
        `

		query = baseQuery + fmt.Sprintf(`
            ( (%s) AND c.built_in_type = 'MAMMAL' )
            OR 
            ( %s )
            %s 
            %s
            LIMIT 50
        `, catMatchCond, supplyMatchCond, groupByClause, orderByClause)

		args = []interface{}{
			likeW, exactW, likeW, exactW, // Cat
			likeW, exactW, likeW, exactW, // Supply
			// Order
			likeW, likeW,
		}

	} else {
		// --- パターンB: 2単語以上 (ドック + フード) ---
		w1 := words[0] // ドック (カテゴリー寄り)
		w2 := words[1] // フード (用品寄り)
		likeW1 := "%" + w1 + "%"
		exactW1 := w1
		likeW2 := "%" + w2 + "%"
		exactW2 := w2

		// ★修正: 2単語用の強力な並び替え
		// 1. 「カテゴリーがw1」かつ「用品がw2」の両方にヒットするものを最優先
		orderByClause := `
            ORDER BY 
                MIN(CASE 
                    -- カテゴリーがw1(ドック)を含み、かつ用品がw2(フード)を含む -> 最強(1位)
                    WHEN (tc.term LIKE ? OR c.name LIKE ?) AND (ts.term LIKE ? OR st.name LIKE ?) THEN 1
                    -- カテゴリーだけでもヒットしてるなら次点(2位)
                    WHEN (tc.term LIKE ? OR c.name LIKE ?) THEN 2
                    ELSE 3 
                END) ASC,
                -- 次に文字数の短さ
                (CHAR_LENGTH(c.name) + CHAR_LENGTH(st.name)) ASC,
                c.id ASC
        `

		query = baseQuery + fmt.Sprintf(`
            ( %s AND %s )
            OR
            ( %s AND %s )
            %s 
            %s
            LIMIT 50
        `, catMatchCond, supplyMatchCond, catMatchCond, supplyMatchCond, groupByClause, orderByClause)

		// Set 1
		set1 := []interface{}{
			likeW1, exactW1, likeW1, exactW1,
			likeW2, exactW2, likeW2, exactW2,
		}
		// Set 2
		set2 := []interface{}{
			likeW2, exactW2, likeW2, exactW2,
			likeW1, exactW1, likeW1, exactW1,
		}
		args = append(set1, set2...)

		// ORDER BY用の引数 (ここが重要！)
		// 1. (Cat:w1 OR CatName:w1) AND (Supply:w2 OR SupplyName:w2)
		args = append(args, likeW1, likeW1, likeW2, likeW2)
		// 2. (Cat:w1 OR CatName:w1)
		args = append(args, likeW1, likeW1)
	}

	query = db.DB.Rebind(query)
	err := db.DB.Select(&results, query, args...)
	if err != nil {
		return nil, err
	}

	return results, nil
}

func (db *Database) SearchSuggestions(keyword string) ([]SearchSuggestion, error) {
	// 1. キーワード処理
	keyword = strings.ReplaceAll(keyword, "　", " ")
	words := strings.Fields(keyword)
	if len(words) == 0 {
		return nil, nil
	}

	// -------------------------------------------------------
	// 2. キーワード分割・役割分担ロジック
	// -------------------------------------------------------
	catWords := words
	supWords := words

	// パターンA: 1単語の場合 (例: "ドックフード")
	if len(words) == 1 {
		raw := words[0]
		var matchedSupplyName string
		// プレースホルダーを使った安全なチェック
		checkQuery := `SELECT name FROM supply_types WHERE ? LIKE CONCAT('%', name, '%') ORDER BY CHAR_LENGTH(name) DESC LIMIT 1`
		err := db.DB.Get(&matchedSupplyName, checkQuery, raw)

		if err == nil && matchedSupplyName != "" && matchedSupplyName != raw {
			prefix := strings.Replace(raw, matchedSupplyName, "", 1)
			if prefix != "" {
				words = []string{prefix, matchedSupplyName} // 2単語に拡張
				catWords = []string{prefix}                 // 生体: "ドック"
				supWords = []string{matchedSupplyName}      // 用品: "フード"
			}
		}
	} else if len(words) == 2 {
		// パターンB: 最初から2単語の場合
		w1, w2 := words[0], words[1]
		var count int
		db.DB.Get(&count, "SELECT COUNT(*) FROM supply_types WHERE name = ?", w2)
		if count > 0 {
			catWords = []string{w1}
			supWords = []string{w2}
		} else {
			db.DB.Get(&count, "SELECT COUNT(*) FROM supply_types WHERE name = ?", w1)
			if count > 0 {
				catWords = []string{w2}
				supWords = []string{w1}
			}
		}
	}

	// -------------------------------------------------------
	// 3. SQL構築 (プレースホルダー ? を使用)
	// -------------------------------------------------------

	// 全ての引数を順番に格納するスライス
	var args []interface{}

	// (A) 生体単体検索 (catWords)
	var catConds []string
	for _, w := range catWords {
		// Name OR Slug OR Tag
		catConds = append(catConds, `(
            c.name LIKE ? OR 
            c.slug LIKE ? OR 
            EXISTS(SELECT 1 FROM search_tags st WHERE st.category_id = c.id AND st.term LIKE ?)
        )`)
		likeW := "%" + w + "%"
		args = append(args, likeW, likeW, likeW) // ? 3つ分
	}
	whereCat := strings.Join(catConds, " AND ")

	// (B) 用品単体検索 (supWords)
	var supConds []string
	for _, w := range supWords {
		// Name OR Slug OR Tag
		supConds = append(supConds, `(
            s.name LIKE ? OR 
            s.slug LIKE ? OR 
            EXISTS(SELECT 1 FROM search_tags st WHERE st.supply_type_id = s.id AND st.term LIKE ?)
        )`)
		likeW := "%" + w + "%"
		args = append(args, likeW, likeW, likeW) // ? 3つ分
	}
	whereSup := strings.Join(supConds, " AND ")

	// (C) 組み合わせ検索 (Mix)
	whereMix := "1=0" // デフォルト(ヒットなし)

	// 2単語以上ある場合のみ組み合わせ検索を有効化
	if len(words) >= 2 {
		w1 := words[0]
		w2 := words[1]
		likeW1 := "%" + w1 + "%"
		likeW2 := "%" + w2 + "%"

		// 生体(w1) × 用品(w2)
		// 生体: Name OR Tag
		catPart := `(c.name LIKE ? OR EXISTS(SELECT 1 FROM search_tags st WHERE st.category_id = c.id AND st.term LIKE ?))`
		// 用品: Name OR Tag
		supPart := `(s.name LIKE ? OR EXISTS(SELECT 1 FROM search_tags st WHERE st.supply_type_id = s.id AND st.term LIKE ?))`

		mixCond1 := fmt.Sprintf("(%s AND %s)", catPart, supPart)

		// 生体(w2) × 用品(w1) - 逆パターン
		mixCond2 := fmt.Sprintf("(%s AND %s)", catPart, supPart)

		whereMix = fmt.Sprintf("(%s OR %s)", mixCond1, mixCond2)

		// 引数を追加 (順序重要: SQLの ? の出現順)
		// mixCond1用: cat(w1), sup(w2)
		args = append(args, likeW1, likeW1, likeW2, likeW2)
		// mixCond2用: cat(w2), sup(w1)
		args = append(args, likeW2, likeW2, likeW1, likeW1)
	}

	// -------------------------------------------------------
	// 4. メインクエリ結合
	// -------------------------------------------------------
	query := fmt.Sprintf(`
    SELECT * FROM (
        -- 1. 生体カテゴリー
        SELECT 
            c.id, c.name, c.slug, c.path, c.built_in_type,
            'category'::text as type,
            NULL::bigint as supply_id, NULL::text as supply_name, NULL::text as supply_slug,
            LENGTH(c.name) as match_len
        FROM categories c
        WHERE %s

        UNION ALL

        -- 2. 用品タイプ
        SELECT 
            s.id, s.name, ''::text as slug, NULL::text as path, NULL::text as built_in_type,
            'supply'::text as type,
            s.id as supply_id, s.name as supply_name, s.slug as supply_slug,
            LENGTH(s.name) as match_len
        FROM supply_types s
        WHERE %s
        
        UNION ALL

        -- 3. 生体 × 用品の組み合わせ
        SELECT
            c.id, 
            (c.name || ' > ' || s.name) as name,
            c.slug, c.path, c.built_in_type,
            'combination'::text as type,
            s.id as supply_id, s.name as supply_name, s.slug as supply_slug,
            (LENGTH(c.name) + LENGTH(s.name) + 10) as match_len
        FROM categories c
        CROSS JOIN supply_types s -- JOIN 1=1 は CROSS JOIN と書くのが一般的
        WHERE %s
    ) AS combined
    ORDER BY match_len DESC, id ASC
    LIMIT 20
    `, whereCat, whereSup, whereMix)

    // ★ 実行前に必ず Rebind
    query = db.DB.Rebind(query)

	// -------------------------------------------------------
	// 5. 実行 & パス解決 (ロジック変更なし)
	// -------------------------------------------------------
	var results []SearchSuggestion
	err := db.DB.Select(&results, query, args...) // argsを展開して渡す
	if err != nil {
		return nil, err
	}

	// (A) 親ID収集
	relatedIDs := make(map[uint64]bool)
	for _, item := range results {
		if item.Path != nil && *item.Path != "" {
			ids := strings.Split(strings.Trim(*item.Path, "/"), "/")
			for _, idStr := range ids {
				id, _ := strconv.ParseUint(idStr, 10, 64)
				if id > 0 {
					relatedIDs[id] = true
				}
			}
		}
	}

	// (B) 親データ取得
	parentMap := make(map[uint64]struct{ Name, Slug string })
	if len(relatedIDs) > 0 {
		var idList []uint64
		for id := range relatedIDs {
			idList = append(idList, id)
		}
		q, a, _ := sqlx.In("SELECT id, name, slug FROM categories WHERE id IN (?)", idList)
		q = db.DB.Rebind(q)
		var parents []struct {
			ID         uint64
			Name, Slug string
		}
		db.DB.Select(&parents, q, a...)
		for _, p := range parents {
			parentMap[p.ID] = struct{ Name, Slug string }{p.Name, p.Slug}
		}
	}

	// (C) パス生成
	for i, item := range results {
		var pathNames, pathSlugs []string

		if item.Path != nil && *item.Path != "" {
			pathIDs := strings.Split(strings.Trim(*item.Path, "/"), "/")
			for _, pidStr := range pathIDs {
				pid, _ := strconv.ParseUint(pidStr, 10, 64)
				if pid == item.ID {
					continue
				}
				if info, ok := parentMap[pid]; ok {
					pathNames = append(pathNames, info.Name)
					if info.Slug != "" {
						pathSlugs = append(pathSlugs, info.Slug)
					}
				}
			}
		}

		switch item.Type {
		case "combination":
			// 表示: 親 > 犬 > フード
			fullPathName := item.Name
			if len(pathNames) > 0 {
				fullPathName = strings.Join(pathNames, " > ") + " > " + item.Name
			}
			results[i].FullPathName = fullPathName

			// URL: mammal/dog/food
			if item.Slug != "" {
				pathSlugs = append(pathSlugs, item.Slug)
			}
			if item.SupplySlug != nil && *item.SupplySlug != "" {
				pathSlugs = append(pathSlugs, *item.SupplySlug)
			}
			results[i].FullSlugPath = strings.Join(pathSlugs, "/")

		case "category":
			pathNames = append(pathNames, item.Name)
			if item.Slug != "" {
				pathSlugs = append(pathSlugs, item.Slug)
			}
			results[i].FullPathName = strings.Join(pathNames, " > ")
			results[i].FullSlugPath = strings.Join(pathSlugs, "/")
		default: // supply
			results[i].FullPathName = item.Name
			if item.SupplySlug != nil {
				results[i].FullSlugPath = *item.SupplySlug
			}
		}
	}

	return results, nil
}

type LookupResult struct {
	ID   uint64 `db:"id" json:"id"`
	Name string `db:"name" json:"name"`
	Slug string `db:"slug" json:"slug"`
	Type string `json:"type"` // "CATEGORY" or "SUPPLY"

	// カテゴリー固有（用品のときは空になる）
	ParentID    *uint64 `db:"parent_id" json:"parent_id,omitempty"`
	Path        *string `db:"path" json:"path,omitempty"`
	BuiltInType *string `db:"built_in_type" json:"built_in_type,omitempty"`
}

func (db *Database) GetCategoryBySlug(slug string) (*LookupResult, error) {
    var result LookupResult

    // 1. まず「生体カテゴリー」を探す
    // 修正: ? -> $1, カラム名を安全のために "path" と囲む（環境によるが推奨）
    queryCat := `
        SELECT id, name, slug, parent_id, "path", built_in_type 
        FROM categories 
        WHERE slug = $1
    `
    var cat Category
    err := db.DB.Get(&cat, queryCat, slug)

    if err == nil {
        result.ID = cat.ID
        result.Name = cat.Name
        result.Slug = cat.Slug
        result.Type = "CATEGORY"
        result.ParentID = cat.ParentID
        result.Path = cat.Path
        result.BuiltInType = cat.BuiltInType
        return &result, nil
    }

    if err != sql.ErrNoRows {
        return nil, err
    }

    // 2. なければ「用品種別」を探す
    // 修正: ? -> $1
    querySupply := `
        SELECT id, name, slug 
        FROM supply_types 
        WHERE slug = $1
    `
    var supply SupplyType
    err = db.DB.Get(&supply, querySupply, slug)

    if err == nil {
        result.ID = supply.ID
        result.Name = supply.Name
        result.Slug = supply.Slug
        result.Type = "SUPPLY"
        return &result, nil
    }

    return nil, sql.ErrNoRows
}

// -------------------------------------------------------
// 4. 用品種別API用: 全リスト取得
// -------------------------------------------------------
func (db *Database) GetSupplyTypes() ([]SupplyType, error) {
	var list []SupplyType
	err := db.DB.Select(&list, "SELECT id, name FROM supply_types ORDER BY id ASC")
	if err != nil {
		return nil, err
	}
	return list, nil
}
