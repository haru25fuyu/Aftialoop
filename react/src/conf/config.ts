const CONFIG = {
  BASE_URL: "https://go.aftialoop.com" // 他にも使うなら残してOK
};


enum OrderStatus {
  Pending = 1,    // 未決済
  Paid,           // 決済済み
  Preparing,      // 発送準備中
  Shipped,        // 発送済み
  Delivered,      // 配送完了
  Cancelled,      // キャンセル
  Returned,       // 返品中
  Refunded,       // 返金済み
}

const ORDER_STATUS = {
  [OrderStatus.Pending]: "未決済",
  [OrderStatus.Paid]: "決済済み",
  [OrderStatus.Preparing]: "発送準備中",
  [OrderStatus.Shipped]: "発送済み",
  [OrderStatus.Delivered]: "配送完了",
  [OrderStatus.Cancelled]: "キャンセル",
  [OrderStatus.Returned]: "返品中",
  [OrderStatus.Refunded]: "返金済み",
};

const ITEM__STATUS = {
  IS_ON_SALE:    1 << 0, // 販売中
  HAS_RESTOCK:   1 << 1, // 再入荷
  ACCEPTS_ORDER: 1 << 2, // 受注可
  IS_NEW_ARRIVAL:1 << 3, // 新着商品
  IS_FEATURED:   1 << 4  // 特集商品
} as const;

const ITEM_STATUS_LABELS = {
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

export { CONFIG, OrderStatus, ITEM__STATUS, ORDER_STATUS, ITEM_STATUS_LABELS };
