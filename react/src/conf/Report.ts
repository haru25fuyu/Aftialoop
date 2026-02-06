// src/conf/Report.ts

// バックエンドの config.go と合わせた通報理由コード
export const REPORT_REASONS = {
  SPAM: "spam",
  INAPPROPRIATE_CONTENT: "inappropriate_content",
  HARASSMENT: "harassment",
  FAKE_ITEM: "fake_item",
  OTHER: "other",
} as const;

// コード値に対応する日本語ラベル
export const REPORT_REASON_LABELS: Record<string, string> = {
  [REPORT_REASONS.SPAM]: "スパム・宣伝目的",
  [REPORT_REASONS.INAPPROPRIATE_CONTENT]: "不適切なコンテンツ（画像・文章）",
  [REPORT_REASONS.HARASSMENT]: "嫌がらせ・誹謗中傷",
  [REPORT_REASONS.FAKE_ITEM]: "偽ブランド品・禁止商品の出品",
  [REPORT_REASONS.OTHER]: "その他",
};

// セレクトボックス用に配列化したもの (mapで回しやすい)
export const REPORT_REASON_OPTIONS = Object.entries(REPORT_REASON_LABELS).map(
  ([value, label]) => ({ value, label }),
);

// コード値からラベルを取得するヘルパー関数
export const getReportReasonLabel = (reason: string) => {
  return REPORT_REASON_LABELS[reason] || "不明な理由";
};
