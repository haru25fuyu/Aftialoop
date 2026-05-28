package sql

import (
	"context"
	"fmt"
)

// ============================================================
// マイグレーション (PostgreSQL)
//
// 起動時に呼び出すことで、テーブルがまだ存在しなければ作成する。
// 既に存在する場合は CREATE TABLE IF NOT EXISTS により何もしない。
//
// 使い方 (例: main.go や NewDatabase の直後):
//
//	db, err := sql.NewDatabase()
//	if err != nil { log.Fatal(err) }
//	if err := db.AutoMigrate(context.Background()); err != nil {
//	    log.Fatalf("migration failed: %v", err)
//	}
//
// 注意:
//   - スキーマはコード中の SQL / 構造体から推定して起こしています。
//     型や NULL 可否、制約に過不足があれば、対応する DDL を調整してください
//     (特に「★要確認」コメントの箇所)。
//   - 既存 DB に後から流しても安全なように、すべて IF NOT EXISTS です。
//     ただし「既にあるテーブルの列を変更する」ことはしません(あくまで新規作成のみ)。
// ============================================================

// migrationStatements は実行する DDL を順番に並べたもの。
// 外部キーの依存関係に合わせて、親テーブルを先に作成する順序にしています。
var migrationStatements = []struct {
	name string
	ddl  string
}{
	// --------------------------------------------------------
	// ユーザー本体
	// --------------------------------------------------------
	{
		name: "users",
		ddl: `
CREATE TABLE IF NOT EXISTS users (
    id                  TEXT PRIMARY KEY,
    customer_id         TEXT NOT NULL DEFAULT '',
    name                TEXT NOT NULL DEFAULT '',
    username            TEXT,
    email               TEXT NOT NULL DEFAULT '',
    point               BIGINT NOT NULL DEFAULT 0,
    icon_url            TEXT,
    identity_status     TEXT NOT NULL DEFAULT 'NONE',
    password            TEXT NOT NULL DEFAULT '',
    google_id           TEXT,
    apple_id            TEXT,
    default_card        TEXT NOT NULL DEFAULT '',
    following_count     INTEGER NOT NULL DEFAULT 0,
    followers_count     INTEGER NOT NULL DEFAULT 0,
    sales_balance       BIGINT NOT NULL DEFAULT 0,
    sub_email           TEXT,
    sub_email_verified_at TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_username_unique UNIQUE (username)
);`,
	},

	// プロフィール (テーブル名は単数形 "profile"。go/sql/profile.go に準拠)
	{
		name: "profile",
		ddl: `
CREATE TABLE IF NOT EXISTS profile (
    user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth TEXT,
    gender       TEXT,
    phone_number TEXT,
    bio          TEXT
);`,
	},

	// 本人確認
	{
		name: "identity_verifications",
		ddl: `
CREATE TABLE IF NOT EXISTS identity_verifications (
    id                BIGSERIAL PRIMARY KEY,
    user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    real_name         TEXT,
    real_name_kana    TEXT,
    birth_date        TEXT,
    address           TEXT,
    image_front_data  BYTEA,
    image_back_data   BYTEA,
    image_selfie_data BYTEA,
    mime_type         TEXT,
    status            TEXT NOT NULL DEFAULT 'PENDING',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},

	// 銀行口座
	{
		name: "user_bank_accounts",
		ddl: `
CREATE TABLE IF NOT EXISTS user_bank_accounts (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_name           TEXT NOT NULL DEFAULT '',
    bank_code           TEXT NOT NULL DEFAULT '',
    branch_name         TEXT NOT NULL DEFAULT '',
    branch_code         TEXT NOT NULL DEFAULT '',
    account_type        INTEGER NOT NULL DEFAULT 0,
    account_number      TEXT NOT NULL DEFAULT '',
    account_holder_name TEXT NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_bank_accounts_user_unique UNIQUE (user_id)
);`,
	},

	// --------------------------------------------------------
	// 住所・支払い
	// --------------------------------------------------------
	{
		name: "addresses",
		ddl: `
CREATE TABLE IF NOT EXISTS addresses (
    id         BIGSERIAL PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT,
    phone      TEXT,
    post_code  TEXT,
    pref       TEXT,
    pref_code  INTEGER,
    address1   TEXT,
    address2   TEXT,
    address3   TEXT,
    status     INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},

	// カード (cards テーブル: id は外部のカードID文字列。go/sql/card.go の "SELECT id FROM cards" に準拠)
	// ★要確認: cards のカラムはコードからは id しか確認できませんでした。最低限の定義です。
	{
		name: "cards",
		ddl: `
CREATE TABLE IF NOT EXISTS cards (
    id         TEXT PRIMARY KEY,
    user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},

	// カードと住所の紐付け
	{
		name: "user_payment_methods",
		ddl: `
CREATE TABLE IF NOT EXISTS user_payment_methods (
    id         BIGSERIAL PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id    TEXT NOT NULL,
    address_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_payment_methods_card_unique UNIQUE (card_id)
);`,
	},

	// --------------------------------------------------------
	// カテゴリ・用品種別マスター
	// --------------------------------------------------------
	{
		name: "categories",
		ddl: `
CREATE TABLE IF NOT EXISTS categories (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT NOT NULL DEFAULT '',
    slug          TEXT NOT NULL DEFAULT '',
    parent_id     BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    path          TEXT,
    rank          TEXT,
    built_in_type TEXT,
    CONSTRAINT categories_slug_unique UNIQUE (slug)
);`,
	},
	{
		name: "supply_types",
		ddl: `
CREATE TABLE IF NOT EXISTS supply_types (
    id   BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    slug TEXT NOT NULL DEFAULT '',
    CONSTRAINT supply_types_slug_unique UNIQUE (slug)
);`,
	},
	// search_tags: カテゴリ/用品に検索用の別名・シノニムを紐付ける
	// (SearchFleaItems / SearchCategories / SearchSuggestions が参照)
	// category_id と supply_type_id はどちらか一方が入る想定。
	{
		name: "search_tags",
		ddl: `
CREATE TABLE IF NOT EXISTS search_tags (
    id             BIGSERIAL PRIMARY KEY,
    category_id    BIGINT REFERENCES categories(id) ON DELETE CASCADE,
    supply_type_id BIGINT REFERENCES supply_types(id) ON DELETE CASCADE,
    term           TEXT NOT NULL DEFAULT ''
);`,
	},

	// --------------------------------------------------------
	// フリマ: 商品本体・画像・詳細
	// --------------------------------------------------------
	{
		name: "flea_items",
		ddl: `
CREATE TABLE IF NOT EXISTS flea_items (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                 TEXT NOT NULL DEFAULT '',
    description          TEXT,
    price                BIGINT NOT NULL DEFAULT 0,
    quantity             INTEGER NOT NULL DEFAULT 1,
    type                 TEXT NOT NULL DEFAULT '',
    category_id          BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    supply_type_id       BIGINT REFERENCES supply_types(id) ON DELETE SET NULL,
    category_name        TEXT,
    is_multi_purchasable INTEGER NOT NULL DEFAULT 0,
    buy_user_id          TEXT,
    main_image_url       TEXT,
    ship_from            INTEGER,
    shipping_method      TEXT,
    shipping_fee_type    INTEGER NOT NULL DEFAULT 0,
    ships_within_days    INTEGER,
    seller_rate          BIGINT NOT NULL DEFAULT 0,
    commission_rate      BIGINT NOT NULL DEFAULT 0,
    status               INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at           TIMESTAMPTZ
);`,
	},
	{
		name: "flea_item_images",
		ddl: `
CREATE TABLE IF NOT EXISTS flea_item_images (
    id       BIGSERIAL PRIMARY KEY,
    item_id  BIGINT NOT NULL REFERENCES flea_items(id) ON DELETE CASCADE,
    url      TEXT NOT NULL,
    sort_num INTEGER NOT NULL DEFAULT 0
);`,
	},
	{
		name: "flea_item_animal_details",
		ddl: `
CREATE TABLE IF NOT EXISTS flea_item_animal_details (
    item_id    BIGINT PRIMARY KEY REFERENCES flea_items(id) ON DELETE CASCADE,
    locality   TEXT,
    hatch_date DATE,
    size_value NUMERIC,
    size_unit  TEXT,
    generation TEXT,
    sex        TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},
	{
		name: "flea_item_supply_details",
		ddl: `
CREATE TABLE IF NOT EXISTS flea_item_supply_details (
    item_id      BIGINT PRIMARY KEY REFERENCES flea_items(id) ON DELETE CASCADE,
    brand        TEXT,
    sku          TEXT,
    net_weight_g INTEGER,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},

	// フリマ: 下書き
	{
		name: "flea_item_drafts",
		ddl: `
CREATE TABLE IF NOT EXISTS flea_item_drafts (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                 TEXT,
    description          TEXT,
    price                NUMERIC,
    quantity             INTEGER,
    type                 TEXT,
    category_id          BIGINT,
    supply_type_id       BIGINT,
    is_multi_purchasable INTEGER NOT NULL DEFAULT 0,
    main_image_url       TEXT,
    status               INTEGER NOT NULL DEFAULT 0,
    ship_from            INTEGER,
    shipping_fee_type    INTEGER,
    ships_within_days    INTEGER,
    details              JSONB,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},
	{
		name: "flea_item_draft_images",
		ddl: `
CREATE TABLE IF NOT EXISTS flea_item_draft_images (
    id         BIGSERIAL PRIMARY KEY,
    draft_id   BIGINT NOT NULL REFERENCES flea_item_drafts(id) ON DELETE CASCADE,
    asset_id   BIGINT,
    temp_path  TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);`,
	},

	// --------------------------------------------------------
	// フリマ: 購入申請・取引・メッセージ・レビュー・いいね
	// --------------------------------------------------------
	{
		name: "flea_purchase_requests",
		ddl: `
CREATE TABLE IF NOT EXISTS flea_purchase_requests (
    id                   BIGSERIAL PRIMARY KEY,
    item_id              BIGINT NOT NULL REFERENCES flea_items(id) ON DELETE CASCADE,
    buyer_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address_id           BIGINT,
    shipping_method_pref TEXT,
    shipping_fee_pref    TEXT,
    note                 TEXT,
    status               TEXT NOT NULL DEFAULT 'REQUESTED',
    rejection_reason     TEXT,
    withdrawal_reason    TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},
	{
		name: "flea_transactions",
		ddl: `
CREATE TABLE IF NOT EXISTS flea_transactions (
    id                  BIGSERIAL PRIMARY KEY,
    purchase_request_id BIGINT NOT NULL REFERENCES flea_purchase_requests(id) ON DELETE CASCADE,
    item_id             BIGINT NOT NULL REFERENCES flea_items(id) ON DELETE CASCADE,
    buyer_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address_id          BIGINT,
    shipping_method     TEXT,
    shipping_fee_type   TEXT,
    price_item          BIGINT NOT NULL DEFAULT 0,
    price_shipping      BIGINT NOT NULL DEFAULT 0,
    payment_provider    TEXT,
    payment_id          TEXT,
    use_point           BIGINT NOT NULL DEFAULT 0,
    point_rate          BIGINT NOT NULL DEFAULT 0,
    payment_status      TEXT NOT NULL DEFAULT 'NONE',
    shipping_carrier    TEXT,
    tracking_number     TEXT,
    fee_amount          INTEGER NOT NULL DEFAULT 0,
    profit_amount       INTEGER NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'ACCEPTED',
    cancellation_reason TEXT,
    idempotency_key     TEXT,
    paid_at             TIMESTAMPTZ,
    shipped_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT flea_transactions_pr_unique UNIQUE (purchase_request_id)
);`,
	},

	// 商品へのコメント (item へのツリー型コメント)
	{
		name: "flea_item_messages",
		ddl: `
CREATE TABLE IF NOT EXISTS flea_item_messages (
    id                BIGSERIAL PRIMARY KEY,
    item_id           BIGINT NOT NULL REFERENCES flea_items(id) ON DELETE CASCADE,
    parent_message_id BIGINT REFERENCES flea_item_messages(id) ON DELETE CASCADE,
    user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body              TEXT NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at        TIMESTAMPTZ
);`,
	},

	// 取引チャット (purchase_request_id 単位)
	{
		name: "flea_transaction_messages",
		ddl: `
CREATE TABLE IF NOT EXISTS flea_transaction_messages (
    id                  BIGSERIAL PRIMARY KEY,
    purchase_request_id BIGINT NOT NULL REFERENCES flea_purchase_requests(id) ON DELETE CASCADE,
    user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message             TEXT NOT NULL DEFAULT '',
    is_system           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},

	// 取引レビュー
	{
		name: "flea_reviews",
		ddl: `
CREATE TABLE IF NOT EXISTS flea_reviews (
    id             BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT REFERENCES flea_transactions(id) ON DELETE SET NULL,
    reviewer_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id        BIGINT REFERENCES flea_items(id) ON DELETE SET NULL,
    rating         INTEGER NOT NULL DEFAULT 0,
    comment        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},

	// いいね (複合主キー)
	{
		name: "flea_likes",
		ddl: `
CREATE TABLE IF NOT EXISTS flea_likes (
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id    BIGINT NOT NULL REFERENCES flea_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, item_id)
);`,
	},

	// --------------------------------------------------------
	// SNS: フォロー・ブロック・通報・投稿
	// --------------------------------------------------------
	// フォロー (テーブル名 follows / follower_id, followee_id。go/sql/sns.go に準拠)
	{
		name: "follows",
		ddl: `
CREATE TABLE IF NOT EXISTS follows (
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id)
);`,
	},
	{
		name: "user_blocks",
		ddl: `
CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id)
);`,
	},
	{
		name: "user_reports",
		ddl: `
CREATE TABLE IF NOT EXISTS user_reports (
    id          BIGSERIAL PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason      TEXT,
    details     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},
	{
		name: "user_posts",
		ddl: `
CREATE TABLE IF NOT EXISTS user_posts (
    id             BIGSERIAL PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body           TEXT NOT NULL DEFAULT '',
    image_urls     TEXT,
    likes_count    INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},

	// --------------------------------------------------------
	// 通知
	// --------------------------------------------------------
	// user_id は NULL 可 (全体お知らせ)。go/sql/notification.go の "user_id IS NULL" に準拠
	{
		name: "notifications",
		ddl: `
CREATE TABLE IF NOT EXISTS notifications (
    id         BIGSERIAL PRIMARY KEY,
    user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL DEFAULT '',
    title      TEXT NOT NULL DEFAULT '',
    body       TEXT NOT NULL DEFAULT '',
    url        TEXT,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},

	// --------------------------------------------------------
	// ポイント・売上金の履歴
	// --------------------------------------------------------
	{
		name: "point_histories",
		ddl: `
CREATE TABLE IF NOT EXISTS point_histories (
    id         BIGSERIAL PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL DEFAULT '',
    amount     BIGINT NOT NULL DEFAULT 0,
    note       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},
	{
		name: "sales_histories",
		ddl: `
CREATE TABLE IF NOT EXISTS sales_histories (
    id               BIGSERIAL PRIMARY KEY,
    user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id   BIGINT,
    type             TEXT NOT NULL DEFAULT '',
    amount           BIGINT NOT NULL DEFAULT 0,
    balance_snapshot BIGINT NOT NULL DEFAULT 0,
    note             TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},

	// --------------------------------------------------------
	// 配送料金マスター
	// --------------------------------------------------------
	{
		name: "shipping_areas",
		ddl: `
CREATE TABLE IF NOT EXISTS shipping_areas (
    id      BIGSERIAL PRIMARY KEY,
    carrier TEXT NOT NULL DEFAULT '',
    name    TEXT NOT NULL DEFAULT ''
);`,
	},
	{
		name: "shipping_rates",
		ddl: `
CREATE TABLE IF NOT EXISTS shipping_rates (
    id               BIGSERIAL PRIMARY KEY,
    carrier          TEXT NOT NULL DEFAULT '',
    temp             TEXT NOT NULL DEFAULT '',
    sender_pref_code INTEGER NOT NULL DEFAULT 0,
    receiver_area_id BIGINT NOT NULL DEFAULT 0,
    price_60         BIGINT,
    price_80         BIGINT,
    price_100        BIGINT,
    price_120        BIGINT,
    price_140        BIGINT,
    source_version   TEXT,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},

	// --------------------------------------------------------
	// 認証・アセット・システム設定
	// --------------------------------------------------------
	// refresh_tokens: user_id を UNIQUE にして CreateRefreshToken の ON CONFLICT (user_id) を成立させる
	{
		name: "refresh_tokens",
		ddl: `
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id            BIGSERIAL PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT refresh_tokens_user_unique UNIQUE (user_id)
);`,
	},
	// image_assets: UploadImageAsset が INSERT ... RETURNING id する
	{
		name: "image_assets",
		ddl: `
CREATE TABLE IF NOT EXISTS image_assets (
    id         BIGSERIAL PRIMARY KEY,
    url        TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},
	// system_settings: "key" を主キーにして SaveFleaConfig の ON CONFLICT ("key") を成立させる
	// ※ "value" は予約語ではないが紛らわしいのでコード側で二重引用符を付けている
	{
		name: "system_settings",
		ddl: `
CREATE TABLE IF NOT EXISTS system_settings (
    "key"      TEXT PRIMARY KEY,
    "value"    TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},

	// --------------------------------------------------------
	// EC(旧)系: items / cart / favorites / histories
	// ※ フリマへ移行中で未使用なら、不要な分はこの配列から削除してください。
	// --------------------------------------------------------
	{
		name: "items",
		ddl: `
CREATE TABLE IF NOT EXISTS items (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL DEFAULT '',
    price          BIGINT NOT NULL DEFAULT 0,
    point          BIGINT NOT NULL DEFAULT 0,
    main_image_url TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},
	{
		name: "cart_items",
		ddl: `
CREATE TABLE IF NOT EXISTS cart_items (
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id     TEXT NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    is_selected BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (user_id, item_id)
);`,
	},
	{
		name: "favorites",
		ddl: `
CREATE TABLE IF NOT EXISTS favorites (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    PRIMARY KEY (user_id, item_id)
);`,
	},
	{
		name: "histories",
		ddl: `
CREATE TABLE IF NOT EXISTS histories (
    id         BIGSERIAL PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},
}

// migrationIndexes はテーブル作成後に張る INDEX。
// 検索・JOIN で多用される外部キー列を中心に最低限を用意しています。
var migrationIndexes = []string{
	`CREATE INDEX IF NOT EXISTS idx_flea_items_user_id ON flea_items(user_id);`,
	`CREATE INDEX IF NOT EXISTS idx_flea_items_status ON flea_items(status);`,
	`CREATE INDEX IF NOT EXISTS idx_flea_items_category_id ON flea_items(category_id);`,
	`CREATE INDEX IF NOT EXISTS idx_flea_item_images_item_id ON flea_item_images(item_id);`,
	`CREATE INDEX IF NOT EXISTS idx_flea_item_messages_item_id ON flea_item_messages(item_id);`,
	`CREATE INDEX IF NOT EXISTS idx_flea_tx_messages_pr_id ON flea_transaction_messages(purchase_request_id);`,
	`CREATE INDEX IF NOT EXISTS idx_flea_pr_seller_id ON flea_purchase_requests(seller_id);`,
	`CREATE INDEX IF NOT EXISTS idx_flea_pr_buyer_id ON flea_purchase_requests(buyer_id);`,
	`CREATE INDEX IF NOT EXISTS idx_flea_tx_buyer_id ON flea_transactions(buyer_id);`,
	`CREATE INDEX IF NOT EXISTS idx_flea_tx_seller_id ON flea_transactions(seller_id);`,
	`CREATE INDEX IF NOT EXISTS idx_flea_reviews_reviewee_id ON flea_reviews(reviewee_id);`,
	`CREATE INDEX IF NOT EXISTS idx_flea_likes_item_id ON flea_likes(item_id);`,
	`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`,
	`CREATE INDEX IF NOT EXISTS idx_point_histories_user_id ON point_histories(user_id);`,
	`CREATE INDEX IF NOT EXISTS idx_sales_histories_user_id ON sales_histories(user_id);`,
	`CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);`,
	`CREATE INDEX IF NOT EXISTS idx_shipping_rates_lookup ON shipping_rates(carrier, temp, sender_pref_code, receiver_area_id);`,
	// --- 絞り込み・検索用インデックス ---
	// 生体詳細: sex は完全一致、locality は部分一致(ILIKE)、size_value/hatch_date は範囲検索
	`CREATE INDEX IF NOT EXISTS idx_animal_details_sex ON flea_item_animal_details(sex);`,
	`CREATE INDEX IF NOT EXISTS idx_animal_details_locality ON flea_item_animal_details(locality);`,
	`CREATE INDEX IF NOT EXISTS idx_animal_details_size ON flea_item_animal_details(size_value, size_unit);`,
	`CREATE INDEX IF NOT EXISTS idx_animal_details_hatch_date ON flea_item_animal_details(hatch_date);`,
	// 用品詳細: brand での絞り込み
	`CREATE INDEX IF NOT EXISTS idx_supply_details_brand ON flea_item_supply_details(brand);`,
	// カテゴリ階層: path 前方一致 (path LIKE '/1/2/%') を効かせるため text_pattern_ops
	`CREATE INDEX IF NOT EXISTS idx_categories_path ON categories(path text_pattern_ops);`,
	`CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);`,
	// 検索タグ
	`CREATE INDEX IF NOT EXISTS idx_search_tags_category_id ON search_tags(category_id);`,
	`CREATE INDEX IF NOT EXISTS idx_search_tags_supply_type_id ON search_tags(supply_type_id);`,
}

// AutoMigrate は、存在しないテーブルを作成する。
// すべて IF NOT EXISTS のため、何度実行しても安全(冪等)。
func (d *Database) AutoMigrate(ctx context.Context) error {
	if d.DB == nil {
		return fmt.Errorf("database not initialized")
	}

	// 各 DDL を順に実行。途中で失敗したらどのテーブルで失敗したか分かるようにする。
	for _, stmt := range migrationStatements {
		if _, err := d.DB.ExecContext(ctx, stmt.ddl); err != nil {
			return fmt.Errorf("migrate %q failed: %w", stmt.name, err)
		}
	}

	for _, idx := range migrationIndexes {
		if _, err := d.DB.ExecContext(ctx, idx); err != nil {
			return fmt.Errorf("create index failed (%s): %w", idx, err)
		}
	}

	return nil
}
