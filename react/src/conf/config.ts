export const CONFIG = {
  BASE_URL: "https://go.aftialoop.com" // 他にも使うなら残してOK
};


export enum OrderStatus {
  Pending = 1,    // 未決済
  Paid,           // 決済済み
  Preparing,      // 発送準備中
  Shipped,        // 発送済み
  Delivered,      // 配送完了
  Cancelled,      // キャンセル
  Returned,       // 返品中
  Refunded,       // 返金済み
}

export const ORDER_STATUS = {
  [OrderStatus.Pending]: "未決済",
  [OrderStatus.Paid]: "決済済み",
  [OrderStatus.Preparing]: "発送準備中",
  [OrderStatus.Shipped]: "発送済み",
  [OrderStatus.Delivered]: "配送完了",
  [OrderStatus.Cancelled]: "キャンセル",
  [OrderStatus.Returned]: "返品中",
  [OrderStatus.Refunded]: "返金済み",
};

export const IDENTITY_STATUS = {
  NONE:     "NONE",     // 本人確認未提出
  PENDING:  "PENDING",  // 本人確認審査中
  APPROVED: "APPROVED", // 本人確認承認済み
  REJECTED: "REJECTED", // 本人確認拒否済み
} as const;

export const IDENTITY_STATUS_LABELS = {
  NONE:     "本人確認未提出",
  PENDING:  "本人確認審査中",
  APPROVED: "本人確認承認済み",
  REJECTED: "本人確認拒否済み",
} as const;

export const ITEM__STATUS   = {
  IS_ON_SALE:    1 << 0, // 販売中
  HAS_RESTOCK:   1 << 1, // 再入荷
  ACCEPTS_ORDER: 1 << 2, // 受注可
  IS_NEW_ARRIVAL:1 << 3, // 新着商品
  IS_FEATURED:   1 << 4  // 特集商品
} as const;

export const ITEM_STATUS_LABELS = {
  IS_ON_SALE: {
    flag: 1 << 2,
    yes: "販売中",
    no: "販売停止中",
  },
  HAS_RESTOCK: {
    flag: 1 << 1,
    yes: "再入荷予定あり",
    no: "在庫限り",
  },
  ACCEPTS_ORDER: {
    flag: 1 << 0,
    yes: "受注可",
    no: "受注不可",
  },
  IS_NEW_ARRIVAL: {
    flag: 1 << 3,
    yes: "新着商品",
    no: null, // 表示しないならnullもアリ
  },
  IS_FEATURED: {
    flag: 1 << 4,
    yes: "特集商品",
    no: null,
  }
};

export const PREFS = [
  { id: 1, name: "北海道" },
  { id: 2, name: "青森県" },
  { id: 3, name: "岩手県" },
  { id: 4, name: "宮城県" },
  { id: 5, name: "秋田県" },
  { id: 6, name: "山形県" },
  { id: 7, name: "福島県" },
  { id: 8, name: "茨城県" },
  { id: 9, name: "栃木県" },
  { id: 10, name: "群馬県" },
  { id: 11, name: "埼玉県" },
  { id: 12, name: "千葉県" },
  { id: 13, name: "東京都" },
  { id: 14, name: "神奈川県" },
  { id: 15, name: "新潟県" },
  { id: 16, name: "富山県" },
  { id: 17, name: "石川県" },
  { id: 18, name: "福井県" },
  { id: 19, name: "山梨県" },
  { id: 20, name: "長野県" },
  { id: 21, name: "岐阜県" },
  { id: 22, name: "静岡県" },
  { id: 23, name: "愛知県" },
  { id: 24, name: "三重県" },
  { id: 25, name: "滋賀県" },
  { id: 26, name: "京都府" },
  { id: 27, name: "大阪府" },
  { id: 28, name: "兵庫県" },
  { id: 29, name: "奈良県" },
  { id: 30, name: "和歌山県" },
  { id: 31, name: "鳥取県" },
  { id: 32, name: "島根県" },
  { id: 33, name: "岡山県" },
  { id: 34, name: "広島県" },
  { id: 35, name: "山口県" },
  { id: 36, name: "徳島県" },
  { id: 37, name: "香川県" },
  { id: 38, name: "愛媛県" },
  { id: 39, name: "高知県" },
  { id: 40, name: "福岡県" },
  { id: 41, name: "佐賀県" },
  { id: 42, name: "長崎県" },
  { id: 43, name: "熊本県" },
  { id: 44, name: "大分県" },
  { id: 45, name: "宮崎県" },
  { id: 46, name: "鹿児島県" },
  { id: 47, name: "沖縄県" },
];
