/**
 * ANIMALOOP デザイントークン
 *
 * Web (CSS) と React Native (StyleSheet) 両方から参照する唯一の真実の源。
 * カラー変更はここだけ触れば全体に反映される。
 *
 * ロゴカラー：
 *   アンバー    #d4913a  — 文字「af」「as」
 *   グレー      #8c8c8c  — 文字「t」「aloop」
 *   ダークレッド #7a1a1a  — 人型「i」のドット
 *   ブラック    #1a1a1a  — 角の「p」
 */

// ─────────────────────────────────────────
// カラー
// ─────────────────────────────────────────

export const colors = {
  // プライマリ（アンバー：ロゴの「af」「as」）
  primary50: "#fdf5e8",
  primary100: "#f9e4be",
  primary200: "#f3cc88",
  primary300: "#ecaf50",
  primary400: "#e49a2a",
  primary500: "#d4913a", // ★ ロゴアンバー
  primary600: "#b87530",
  primary700: "#935c24",
  primary800: "#6b421a",
  primary900: "#432910",

  // アクセント（ダークレッド：ロゴの人型「i」）
  accent50: "#f9eaea",
  accent100: "#f0c4c4",
  accent200: "#e08888",
  accent400: "#b03030",
  accent500: "#7a1a1a", // ★ ロゴダークレッド
  accent600: "#611515",
  accent800: "#3d0d0d",

  // ニュートラル（グレー：ロゴの「t」「aloop」）
  neutral0: "#ffffff",
  neutral50: "#f8f7f5",
  neutral100: "#f0eeeb",
  neutral200: "#e0ddd8",
  neutral300: "#c4c1bb",
  neutral400: "#8c8c8c", // ★ ロゴグレー
  neutral600: "#5c5a56",
  neutral800: "#302e2a",
  neutral900: "#1a1a1a", // ★ ロゴブラック

  // セマンティック
  success: "#3a7a22",
  successBg: "#eaf3e8",
  danger: "#b03030",
  dangerBg: "#f9eaea",
  warning: "#935c24",
  warningBg: "#fdf5e8",
  info: "#2c4eb0",
  infoBg: "#e8eef8",

  // 透明
  transparent: "transparent",
} as const;

export type ColorKey = keyof typeof colors;

// ─────────────────────────────────────────
// タイポグラフィ
// ─────────────────────────────────────────

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  "2xl": 30,
  "3xl": 36,
} as const;

export const fontWeight = {
  normal: "400" as const,
  medium: "500" as const,
  bold: "700" as const,
};

export const lineHeight = {
  tight: 1.3,
  normal: 1.6,
  loose: 1.9,
};

// ─────────────────────────────────────────
// スペーシング（8px グリッド）
// ─────────────────────────────────────────

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export type SpacingKey = keyof typeof spacing;

// ─────────────────────────────────────────
// ボーダー半径
// ─────────────────────────────────────────

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// ─────────────────────────────────────────
// シャドウ（React Native 用）
// ─────────────────────────────────────────

export const shadow = {
  sm: {
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: "#1a1a1a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

// ─────────────────────────────────────────
// レイアウト定数
// ─────────────────────────────────────────

export const layout = {
  headerHeight: 64,
  bottomNavHeight: 64,
  contentPaddingH: spacing[4],
  maxWidth: 1200,
  narrowWidth: 720,
} as const;

// ─────────────────────────────────────────
// よく使うセマンティックエイリアス
// ─────────────────────────────────────────

export const semantic = {
  // 背景
  bgPage: colors.neutral50,
  bgSurface: colors.neutral0,
  bgSurfaceAlt: colors.neutral100,
  bgHeader: colors.neutral0,

  // テキスト
  textPrimary: colors.neutral900,
  textSecondary: colors.neutral600,
  textMuted: colors.neutral400,
  textInverse: colors.neutral0,
  textLink: colors.primary700,

  // ボーダー
  borderDefault: colors.neutral200,
  borderFocus: colors.primary500,
  borderStrong: colors.neutral300,

  // ブランドアクション
  btnPrimaryBg: colors.primary500,
  btnPrimaryText: colors.neutral0,
  btnAccentBg: colors.accent500,
  btnAccentText: colors.neutral0,
} as const;
