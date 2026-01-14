package main

import (
	"bytes"
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

type Carrier string
type Temp string

const (
	CarrierYamato Carrier = "YAMATO"
	CarrierJP     Carrier = "JP"

	TempAmbient Temp = "AMBIENT"
	TempChilled Temp = "CHILLED"
	TempFrozen  Temp = "FROZEN"
)

type block struct {
	name      string
	prefs     []int
	priceBySz map[Size]int
}

type Size int

var Sizes = []Size{60, 80, 100, 120}

// PREFS（ユーザーが持ってるやつと同じ）
type Pref struct {
	ID   int
	Name string
}

var PREFS = []Pref{
	{1, "北海道"},
	{2, "青森県"},
	{3, "岩手県"},
	{4, "宮城県"},
	{5, "秋田県"},
	{6, "山形県"},
	{7, "福島県"},
	{8, "茨城県"},
	{9, "栃木県"},
	{10, "群馬県"},
	{11, "埼玉県"},
	{12, "千葉県"},
	{13, "東京都"},
	{14, "神奈川県"},
	{15, "新潟県"},
	{16, "富山県"},
	{17, "石川県"},
	{18, "福井県"},
	{19, "山梨県"},
	{20, "長野県"},
	{21, "岐阜県"},
	{22, "静岡県"},
	{23, "愛知県"},
	{24, "三重県"},
	{25, "滋賀県"},
	{26, "京都府"},
	{27, "大阪府"},
	{28, "兵庫県"},
	{29, "奈良県"},
	{30, "和歌山県"},
	{31, "鳥取県"},
	{32, "島根県"},
	{33, "岡山県"},
	{34, "広島県"},
	{35, "山口県"},
	{36, "徳島県"},
	{37, "香川県"},
	{38, "愛媛県"},
	{39, "高知県"},
	{40, "福岡県"},
	{41, "佐賀県"},
	{42, "長崎県"},
	{43, "熊本県"},
	{44, "大分県"},
	{45, "宮崎県"},
	{46, "鹿児島県"},
	{47, "沖縄県"},
}

func prefNameToCode(name string) int {
	for _, p := range PREFS {
		if p.Name == name {
			return p.ID
		}
	}
	return 0
}

func mustHTTPGet(url string) ([]byte, error) {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	// 軽い礼儀（ブロック回避にも）
	req.Header.Set("User-Agent", "AnimaloopShippingSeeder/1.0 (+https://aftialoop.com)")
	client := &http.Client{Timeout: 25 * time.Second}

	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("GET %s -> %s", url, res.Status)
	}
	return io.ReadAll(res.Body)
}

func sha1Hex(b []byte) string {
	h := sha1.Sum(b)
	return hex.EncodeToString(h[:])
}

type RateKey struct {
	Carrier      Carrier
	Temp         Temp
	Size         Size
	FromPrefCode int
	ToPrefCode   int
}

type RateRow struct {
	Key       RateKey
	PriceYen  int
	SourceVer string
}

var prefBaseToCode map[string]int

func init() {
	prefBaseToCode = map[string]int{}
	for _, p := range PREFS {
		base := prefBaseName(p.Name)
		prefBaseToCode[p.Name] = p.ID
		prefBaseToCode[base] = p.ID
	}
}

// "兵庫県" -> "兵庫", "大阪府" -> "大阪", "東京都" -> "東京", "北海道" -> "北海道"
func prefBaseName(name string) string {
	name = strings.TrimSpace(name)
	if name == "北海道" {
		return name
	}
	// 末尾の都道府県を落とす
	if strings.HasSuffix(name, "県") || strings.HasSuffix(name, "府") || strings.HasSuffix(name, "都") {
		return strings.TrimSuffix(strings.TrimSuffix(strings.TrimSuffix(name, "県"), "府"), "都")
	}
	// 念のため
	if strings.HasSuffix(name, "道") {
		return strings.TrimSuffix(name, "道")
	}
	return name
}

// ページから拾った token を都道府県コードに変換（"青森" でもOK）
func prefTokenToCode(token string) int {
	t := strings.TrimSpace(token)
	if t == "" {
		return 0
	}
	// 変な記号を落とす（括弧、読点、カンマ、全角など）
	re := regexp.MustCompile(`[()\[\]（）【】、,・\s]+`)
	t = re.ReplaceAllString(t, "")
	if t == "" {
		return 0
	}

	// 1) そのまま
	if code, ok := prefBaseToCode[t]; ok {
		return code
	}
	// 2) ベース化して探す
	base := prefBaseName(t)
	if code, ok := prefBaseToCode[base]; ok {
		return code
	}

	// 3) 「沖縄」みたいな例外も吸収（県が無い表記）
	//    ベースが一致していればここで拾えるはずだが、念のため
	if code, ok := prefBaseToCode[base]; ok {
		return code
	}

	return 0
}

func main() {
	fmt.Println("start: scrape JP + Yamato, build shipping_seed.sql")

	// 1) JP rates
	jpRows, err := buildJPRates()
	if err != nil {
		panic(err)
	}
	fmt.Printf("JP rows: %d\n", len(jpRows))

	// 2) Yamato rates
	yRows, err := buildYamatoRates()
	if err != nil {
		panic(err)
	}
	fmt.Printf("Yamato rows: %d\n", len(yRows))

	all := append(jpRows, yRows...)

	// sort stable for diff friendliness
	sort.Slice(all, func(i, j int) bool {
		a, b := all[i], all[j]
		if a.Key.Carrier != b.Key.Carrier {
			return a.Key.Carrier < b.Key.Carrier
		}
		if a.Key.Temp != b.Key.Temp {
			return a.Key.Temp < b.Key.Temp
		}
		if a.Key.Size != b.Key.Size {
			return a.Key.Size < b.Key.Size
		}
		if a.Key.FromPrefCode != b.Key.FromPrefCode {
			return a.Key.FromPrefCode < b.Key.FromPrefCode
		}
		return a.Key.ToPrefCode < b.Key.ToPrefCode
	})

	sql := buildInsertSQL(all)
	if err := os.WriteFile("shipping_seed.sql", []byte(sql), 0644); err != nil {
		panic(err)
	}

	fmt.Println("OK: wrote shipping_seed.sql")
}

// ------------------------
// JP (ゆうパック)
// ------------------------

func buildJPRates() ([]RateRow, error) {
	indexURL := "https://www.post.japanpost.jp/service/you_pack/charge/ichiran.html"
	b, err := mustHTTPGet(indexURL)
	if err != nil {
		return nil, err
	}
	sourceVer := "jp:" + sha1Hex(b)

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(b))
	if err != nil {
		return nil, err
	}

	// indexページから都道府県リンクを集める（/ichiran/{code}.html）
	links := map[int]string{}
	re := regexp.MustCompile(`/service/you_pack/charge/ichiran/([0-9]{1,2})\.html`)
	doc.Find("a").Each(func(_ int, s *goquery.Selection) {
		href, ok := s.Attr("href")
		if !ok {
			return
		}
		m := re.FindStringSubmatch(href)
		if len(m) != 2 {
			return
		}
		n, e := strconv.Atoi(m[1])
		if e != nil {
			return
		}
		links[n] = "https://www.post.japanpost.jp" + href
	})

	if len(links) < 40 {
		return nil, fmt.Errorf("JP index parse failed: links=%d", len(links))
	}

	// チルド加算（公式の「国内の運賃表（荷物）」に基づく）
	// 60:+225 / 80:+360 / 100:+675 / 120:+675 …（今回は120まで使う）
	chilledSurcharge := map[Size]int{
		60:  225,
		80:  360,
		100: 675,
		120: 675,
	}

	var out []RateRow

	// 全差出地prefを巡回
	for from := 1; from <= 47; from++ {
		url, ok := links[from]
		if !ok {
			// 一部欠けても進めるより、落としたほうが安全
			return nil, fmt.Errorf("JP link missing for from_pref=%d", from)
		}
		rows, err := parseJPFromPage(from, url, sourceVer)
		if err != nil {
			return nil, err
		}

		// AMBIENT（基本運賃）追加
		out = append(out, rows...)

		// CHILLED（基本 + 加算）追加
		for _, r := range rows {
			sur, ok := chilledSurcharge[r.Key.Size]
			if !ok {
				continue
			}
			out = append(out, RateRow{
				Key: RateKey{
					Carrier:      CarrierJP,
					Temp:         TempChilled,
					Size:         r.Key.Size,
					FromPrefCode: r.Key.FromPrefCode,
					ToPrefCode:   r.Key.ToPrefCode,
				},
				PriceYen:  r.PriceYen + sur,
				SourceVer: r.SourceVer + ":chilled",
			})
		}

		// JP FROZEN は基本「非対応」にするのが無難（ここでは作らない）
	}

	return out, nil
}

func parseJPFromPage(fromPref int, url string, sourceVer string) ([]RateRow, error) {
	b, err := mustHTTPGet(url)
	if err != nil {
		return nil, err
	}
	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	// ページ内テキストを使ってブロックごと拾う（構造が安定してる）
	text := doc.Text()
	text = normalizeJPText(text)

	// パターン:
	// お届け先ブロック名 → (都道府県列挙が来ることもある) → "60サイズ 820 円" ... の連続
	// 例: "東北 青森 岩手 ... 60サイズ 1,150 円 80サイズ ..."
	//
	// まず「60サイズ」を起点にブロックを分割して拾うのが楽
	//
	// ただし、ブロック名は「北海道」「東北」「関東 信越」など混ざる。
	// ここでは、見出しっぽい行を拾ってから、その直後のサイズ価格を読む。

	// 目的: toPrefごとのサイズ価格を確定する
	// このページは「差出地固定」なので、宛先が
	// - 単一都道府県（例: 兵庫）
	// - 複数都道府県（例: 東北=青森..）
	// - 地方名（関東/信越/北陸/東海/近畿/中国/四国/九州）
	// のいずれか。

	// ブロック抽出用： "(\p{Han}|\p{Hiragana}|\p{Katakana}|県|府|都|道|北陸|東海|近畿|中国|四国|九州|信越|関東|東北|北海道|沖縄)+" を雑に拾うとノイズ多いので、
	// 「60サイズ」の前方を辿る方式にする。

	// サイズ価格の抽出
	reSize := regexp.MustCompile(`(60|80|100|120)サイズ\s*([0-9,]+)\s*円`)
	matches := reSize.FindAllStringSubmatchIndex(text, -1)
	if len(matches) < 4 {
		return nil, fmt.Errorf("JP parse failed (no size blocks): from=%d url=%s", fromPref, url)
	}

	// ブロック境界： "お届け先" から末尾までを対象にする
	idx := strings.Index(text, "お届け先")
	if idx >= 0 {
		text = text[idx:]
	}

	// 行分割でざっくり読む
	lines := strings.Split(text, "\n")
	lines = trimEmpty(lines)

	var blocks []block

	// 状態機械（簡易）
	var cur *block
	for _, ln := range lines {
		ln = strings.TrimSpace(ln)
		if ln == "" {
			continue
		}
		// サイズ行？
		if m := reSize.FindStringSubmatch(ln); len(m) == 3 {
			if cur == nil {
				// ここに来るなら見出し抽出がズレてる
				continue
			}
			szI, _ := strconv.Atoi(m[1])
			price := mustAtoiComma(m[2])
			cur.priceBySz[Size(szI)] = price
			continue
		}

		// 見出しっぽいもの:
		// - 都道府県単体（例: 兵庫）
		// - 地方名（例: 東北）
		// - 複合（例: 関東 信越 / 北陸 東海 近畿 中国 四国）
		//
		// ただし「差出地」側の列挙もあるので、「### お届け先」以降でしか使わない想定。
		if looksLikeJPBlockTitle(ln) {
			// 前ブロック確定（条件が揃ってる時だけ）
			if cur != nil && len(cur.priceBySz) > 0 && len(cur.prefs) > 0 {
				blocks = append(blocks, *cur)
			}

			cur = &block{name: ln, prefs: []int{}, priceBySz: map[Size]int{}}

			// 単体県タイトルならそれも入る（"青森" でもOKにしてる前提）
			if code := prefTokenToCode(ln); code != 0 {
				cur.prefs = append(cur.prefs, code)
			}

			// ★追加：見出し行に同居してる都道府県も拾う
			addPrefListToBlock(cur, ln)

			// デバッグ：見出し候補が本当に来てるか見る
			// fmt.Printf("JP TITLE from=%d: %q prefs=%v\n", fromPref, ln, cur.prefs)

			continue
		}

		// 都道府県列挙行？（例: "青森 岩手 宮城 ..."）
		if cur != nil {
			addPrefListToBlock(cur, ln)
		}
		// 都道府県列挙行？（例: "青森 岩手 宮城 ..."）
		if cur != nil {
			addPrefListToBlock(cur, ln)
		}
	}

	if len(blocks) == 0 {
		fmt.Printf("WARN: JP blocks empty: from=%d url=%s (skip)\n", fromPref, url)

		// 何が取れてるか保存（調査用）
		_ = os.WriteFile(fmt.Sprintf("debug_jp_%02d.txt", fromPref), []byte(text), 0644)

		return nil, nil
	}

	// ブロック → 宛先都道府県へ展開
	var out []RateRow
	for _, bl := range blocks {
		for _, to := range bl.prefs {
			for _, sz := range Sizes {
				price, ok := bl.priceBySz[sz]
				if !ok {
					continue
				}
				out = append(out, RateRow{
					Key: RateKey{
						Carrier:      CarrierJP,
						Temp:         TempAmbient,
						Size:         sz,
						FromPrefCode: fromPref,
						ToPrefCode:   to,
					},
					PriceYen:  price,
					SourceVer: sourceVer,
				})
			}
		}
	}

	// “最低限これくらい欲しい” という目安。欠けても運用は回す（warn止まり）。
	if len(out) < 47*len(Sizes)-10 {
		fmt.Printf("WARN: JP rows small from=%d rows=%d url=%s\n", fromPref, len(out), url)
	}

	if len(out) <= 8 {
		_ = os.WriteFile(fmt.Sprintf("debug_jp_small_%02d.txt", fromPref), []byte(text), 0644)
	}

	return out, nil

}

func normalizeJPText(s string) string {
	s = strings.ReplaceAll(s, "\r", "\n")
	// 全角スペースを潰す
	s = strings.ReplaceAll(s, "　", " ")
	// 連続空白を潰す
	re := regexp.MustCompile(`[ \t]+`)
	s = re.ReplaceAllString(s, " ")
	return s
}

func trimEmpty(lines []string) []string {
	out := make([]string, 0, len(lines))
	for _, ln := range lines {
		if strings.TrimSpace(ln) == "" {
			continue
		}
		out = append(out, ln)
	}
	return out
}

func looksLikeJPBlockTitle(ln string) bool {
	// 雑に「サイズ」「円」を含むのは除外
	if strings.Contains(ln, "サイズ") || strings.Contains(ln, "円") {
		return false
	}
	// ありがちなヘッダ除外
	ng := []string{"差出地", "お届け先", "基本運賃表", "ゆうパック", "ご利用方法"}
	for _, n := range ng {
		if strings.Contains(ln, n) {
			return false
		}
	}
	// 都道府県名単体 or 地方名っぽい
	if prefTokenToCode(ln) != 0 {
		return true
	}
	keys := []string{"北海道", "東北", "関東", "信越", "北陸", "東海", "近畿", "中国", "四国", "九州", "沖縄"}
	for _, k := range keys {
		if strings.Contains(ln, k) {
			return true
		}
	}
	return false
}

func addPrefListToBlock(b *block, ln string) bool {
	parts := strings.Fields(ln)
	added := false
	for _, p := range parts {
		code := prefTokenToCode(p)
		if code == 0 {
			continue
		}
		if !containsInt(b.prefs, code) {
			b.prefs = append(b.prefs, code)
			added = true
		}
	}
	return added
}

func containsInt(xs []int, v int) bool {
	for _, x := range xs {
		if x == v {
			return true
		}
	}
	return false
}

func mustAtoiComma(s string) int {
	s = strings.ReplaceAll(s, ",", "")
	n, err := strconv.Atoi(strings.TrimSpace(s))
	if err != nil {
		return 0
	}
	return n
}

// ------------------------
// Yamato
// ------------------------

func buildYamatoRates() ([]RateRow, error) {
	url := "https://www.kuronekoyamato.co.jp/ytc/search/estimate/ichiran.html"
	b, err := mustHTTPGet(url)
	if err != nil {
		return nil, err
	}
	sourceVer := "yamato:" + sha1Hex(b)

	doc, err := goquery.NewDocumentFromReader(bytes.NewReader(b))
	if err != nil {
		return nil, err
	}

	text := doc.Text()
	text = strings.ReplaceAll(text, "\r", "\n")
	text = strings.ReplaceAll(text, "　", " ")
	text = regexp.MustCompile(`[ \t]+`).ReplaceAllString(text, " ")

	// このページは「都道府県→運賃ブロック」のリストと、ブロック間運賃表がある。
	// DOM変化に強いように、まずは「都道府県名が縦に並ぶ領域」からブロック境界を推定し、
	// 料金表は「60 」「80 」「100」「120」行を正規表現で拾う。

	// ブロック定義（ページ内の並び順がそのまま列順になっている）
	blocks, err := parseYamatoBlocksFromText(text)
	if err != nil {
		return nil, err
	}

	// 運賃表：各ブロック（発送地）×（お届け先ブロック）×サイズ
	base, err := parseYamatoBaseMatrixFromText(text, len(blocks))
	if err != nil {
		return nil, err
	}

	// クール加算（公式）
	coolSurcharge := map[Size]int{60: 275, 80: 330, 100: 440, 120: 715}

	// 都道府県→ブロックindex
	prefToBlock := map[int]int{}
	for bi, bl := range blocks {
		for _, pc := range bl.PrefCodes {
			prefToBlock[pc] = bi
		}
	}
	// 全prefが割り当たってるか
	for _, p := range PREFS {
		if _, ok := prefToBlock[p.ID]; !ok {
			return nil, fmt.Errorf("yamato: pref not mapped: %d %s", p.ID, p.Name)
		}
	}

	// 展開：47×47×サイズ
	var out []RateRow
	for _, from := range PREFS {
		fb := prefToBlock[from.ID]
		for _, to := range PREFS {
			tb := prefToBlock[to.ID]
			for _, sz := range Sizes {
				price := base[fb][tb][sz]
				if price <= 0 {
					continue
				}
				// AMBIENT
				out = append(out, RateRow{
					Key: RateKey{
						Carrier:      CarrierYamato,
						Temp:         TempAmbient,
						Size:         sz,
						FromPrefCode: from.ID,
						ToPrefCode:   to.ID,
					},
					PriceYen:  price,
					SourceVer: sourceVer,
				})
				// CHILLED / FROZEN = 同じ加算（ヤマト公式：冷蔵/冷凍は同額）
				sur := coolSurcharge[sz]
				out = append(out, RateRow{
					Key: RateKey{
						Carrier:      CarrierYamato,
						Temp:         TempChilled,
						Size:         sz,
						FromPrefCode: from.ID,
						ToPrefCode:   to.ID,
					},
					PriceYen:  price + sur,
					SourceVer: sourceVer + ":cool",
				})
				out = append(out, RateRow{
					Key: RateKey{
						Carrier:      CarrierYamato,
						Temp:         TempFrozen,
						Size:         sz,
						FromPrefCode: from.ID,
						ToPrefCode:   to.ID,
					},
					PriceYen:  price + sur,
					SourceVer: sourceVer + ":cool",
				})
			}
		}
	}

	return out, nil
}

type YamatoBlock struct {
	Name      string
	PrefCodes []int
}

// ページ末尾付近に「北海道 青森県 秋田県 ...」みたいな並びがあり、改行位置でブロック境界が出る。
// ※この抽出はページ構造に依存するので、失敗したら即エラーにして気付けるようにする。
func parseYamatoBlocksFromText(text string) ([]YamatoBlock, error) {
	// 「発地 都道府県」あたりからブロック定義が始まって、その後に「サイズ」行が来る
	start := strings.Index(text, "発地 都道府県")
	if start < 0 {
		// フォールバック（最悪「北海道」でも探す）
		start = strings.Index(text, "北海道")
	}
	if start < 0 {
		return nil, errors.New("yamato: cannot locate blocks start")
	}

	// start以降で「サイズ」を探す（ここが重要）
	rest := text[start:]
	relEnd := strings.Index(rest, "サイズ")
	if relEnd < 0 {
		return nil, errors.New("yamato: cannot locate blocks end (size)")
	}
	end := start + relEnd

	segment := text[start:end]

	// 行に分けて、都道府県を拾って「行＝ブロック」にする
	lines := trimEmpty(strings.Split(segment, "\n"))

	var blocks []YamatoBlock
	for _, ln := range lines {
		ln = strings.TrimSpace(ln)
		if ln == "" {
			continue
		}
		// 余計な見出し除外
		if strings.Contains(ln, "着地") || strings.Contains(ln, "発地") || strings.Contains(ln, "都道府県") {
			continue
		}
		parts := strings.Fields(ln)

		var pcs []int
		for _, part := range parts {
			code := prefTokenToCode(part)
			if code != 0 {
				pcs = append(pcs, code)
			}
		}
		if len(pcs) == 0 {
			continue
		}
		blocks = append(blocks, YamatoBlock{
			Name:      ln,
			PrefCodes: pcs,
		})
	}

	seen := map[int]bool{}
	for _, b := range blocks {
		for _, pc := range b.PrefCodes {
			seen[pc] = true
		}
	}
	if len(seen) != 47 {
		return nil, fmt.Errorf("yamato: blocks cover=%d (need 47)", len(seen))
	}

	return blocks, nil
}

// base[originBlock][destBlock][size] = price
func parseYamatoBaseMatrixFromText(text string, blockCount int) ([][]map[Size]int, error) {
	// 「サイズ」以降に表が出る。そこから "60 " "80 " "100" "120" の価格群を拾う。
	idx := strings.Index(text, "サイズ")
	if idx < 0 {
		return nil, errors.New("yamato: cannot locate rate table")
	}
	seg := text[idx:]

	// サイズ行の例が turn6view0 にある: "80 ｰ 2,950 2,530 ... 1,230"
	// ただし最左の列が「同一県内」等で "ｰ" が入る。
	// ここでは「サイズごとに、blockCount個ぶんの行がある」前提で読むのが危険なので、
	// 「行単位で originブロック順に並んでいる」前提で拾う。
	//
	// 実装方針：
	// - originブロックは blockCount個
	// - 1originにつき、サイズ(60/80/100/120) の4行がある構造を期待する
	// - 各行には destブロック数 (=blockCount) の価格が並ぶ（同一県内含む列数はページ次第）
	//
	// ただし turn6view0 は一部しか見えてないので、保守的に：
	// - 価格の列数が blockCount と一致しない場合はエラーにする（テーブル変更に即気付ける）

	lines := trimEmpty(strings.Split(seg, "\n"))
	// "60"行を拾う
	reLine := regexp.MustCompile(`^(60|80|100|120)\s+.*$`)

	type row struct {
		sz     Size
		prices []int
	}
	var rows []row
	for _, ln := range lines {
		ln = strings.TrimSpace(ln)
		if !reLine.MatchString(ln) {
			continue
		}
		// 数字（カンマ付き）を全部拾う
		nums := regexp.MustCompile(`[0-9][0-9,]*`).FindAllString(ln, -1)
		if len(nums) < 2 {
			continue
		}
		szI, _ := strconv.Atoi(nums[0])
		var prices []int
		for _, s := range nums[1:] {
			prices = append(prices, mustAtoiComma(s))
		}
		rows = append(rows, row{sz: Size(szI), prices: prices})
	}

	// originBlockごとに4サイズ行ある想定なので rowsは blockCount*4 のはず
	if len(rows) < blockCount*len(Sizes) {
		return nil, fmt.Errorf("yamato: rate rows too few: got=%d want>=%d", len(rows), blockCount*len(Sizes))
	}

	// base作る
	base := make([][]map[Size]int, blockCount)
	for i := 0; i < blockCount; i++ {
		base[i] = make([]map[Size]int, blockCount)
		for j := 0; j < blockCount; j++ {
			base[i][j] = map[Size]int{}
		}
	}

	// rowsを origin順に詰める： origin i の4行が連続している前提
	ri := 0
	for oi := 0; oi < blockCount; oi++ {
		// 4サイズを読む
		for _, sz := range Sizes {
			// sz一致する行まで進める（ページの混入を避ける）
			found := false
			for ri < len(rows) {
				if rows[ri].sz == sz {
					found = true
					break
				}
				ri++
			}
			if !found || ri >= len(rows) {
				return nil, fmt.Errorf("yamato: cannot find row for origin=%d size=%d", oi, sz)
			}
			r := rows[ri]
			ri++

			// dest列数チェック
			if len(r.prices) < blockCount {
				return nil, fmt.Errorf("yamato: dest columns too few: got=%d need=%d (origin=%d size=%d)", len(r.prices), blockCount, oi, sz)
			}
			for di := 0; di < blockCount; di++ {
				base[oi][di][sz] = r.prices[di]
			}
		}
	}

	return base, nil
}

// ------------------------
// SQL output
// ------------------------
func buildInsertSQL(rows []RateRow) string {
	const batchSize = 2000

	var b strings.Builder
	b.WriteString("-- generated by shipping_seed\n")
	b.WriteString("START TRANSACTION;\n")

	for start := 0; start < len(rows); start += batchSize {
		end := start + batchSize
		if end > len(rows) {
			end = len(rows)
		}
		chunk := rows[start:end]

		b.WriteString("INSERT INTO shipping_rates (carrier, temp, size, sender_pref_code, receiver_pref_code, price, source_version)\nVALUES\n")

		for i, r := range chunk {
			if i > 0 {
				b.WriteString(",\n")
			}
			b.WriteString(fmt.Sprintf("('%s','%s',%d,%d,%d,%d,'%s')",
				r.Key.Carrier,
				r.Key.Temp,
				int(r.Key.Size),
				r.Key.FromPrefCode, // ← sender
				r.Key.ToPrefCode,   // ← receiver
				r.PriceYen,         // ← price
				escapeSQL(r.SourceVer),
			))
		}

		b.WriteString("\nON DUPLICATE KEY UPDATE\n")
		b.WriteString("  price = VALUES(price),\n")
		b.WriteString("  source_version = VALUES(source_version),\n")
		b.WriteString("  updated_at = CURRENT_TIMESTAMP;\n\n")
	}

	b.WriteString("COMMIT;\n")
	return b.String()
}

func escapeSQL(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}
