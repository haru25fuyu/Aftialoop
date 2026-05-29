import {
  colors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadow,
  semantic,
  layout,
} from "./tokens";

/**
 * ANIMALOOP ベーススタイル
 *
 * Web（React）では CSS クラスと組み合わせて使う。
 * React Native 移行時は import 元を以下に差し替えるだけで動く：
 *
 *   import { StyleSheet } from "react-native";
 *   export const base = StyleSheet.create({ ... });
 *
 * 今は StyleSheet なしの素のオブジェクトとして定義。
 * 型は React Native の ViewStyle / TextStyle と互換になるよう書いている。
 */

type FlexDirection = "row" | "column" | "row-reverse" | "column-reverse";
type AlignItems = "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
type JustifyContent =
  | "flex-start"
  | "flex-end"
  | "center"
  | "space-between"
  | "space-around"
  | "space-evenly";
type TextAlign = "left" | "right" | "center" | "justify";
type Overflow = "visible" | "hidden" | "scroll";

const hairlineWidth = 0.5;

export const base = {
  // ─── レイアウト ────────────────────────────────
  flex1: { flex: 1 },
  row: { flexDirection: "row" as FlexDirection },
  col: { flexDirection: "column" as FlexDirection },
  center: {
    alignItems: "center" as AlignItems,
    justifyContent: "center" as JustifyContent,
  },
  centerH: { alignItems: "center" as AlignItems },
  centerV: { justifyContent: "center" as JustifyContent },
  spaceBetween: { justifyContent: "space-between" as JustifyContent },

  safe: {
    flex: 1,
    backgroundColor: semantic.bgPage,
  },

  container: {
    flex: 1,
    paddingHorizontal: layout.contentPaddingH,
  },

  // ─── ヘッダー ─────────────────────────────────
  header: {
    flexDirection: "row" as FlexDirection,
    alignItems: "center" as AlignItems,
    height: layout.headerHeight,
    paddingHorizontal: spacing[3],
    backgroundColor: semantic.bgHeader,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: semantic.borderDefault,
  },

  headerTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: semantic.textPrimary,
    textAlign: "center" as TextAlign,
  },

  headerBtn: {
    padding: spacing[2],
    borderRadius: radius.sm,
  },

  // ─── カード ──────────────────────────────────
  card: {
    backgroundColor: semantic.bgSurface,
    borderRadius: radius.lg,
    borderWidth: hairlineWidth,
    borderColor: semantic.borderDefault,
    padding: spacing[5],
    ...shadow.sm,
  },

  cardFlat: {
    backgroundColor: semantic.bgSurface,
    borderRadius: radius.lg,
    borderWidth: hairlineWidth,
    borderColor: semantic.borderDefault,
    padding: spacing[5],
  },

  // ─── ボタン ──────────────────────────────────
  btnBase: {
    flexDirection: "row" as FlexDirection,
    alignItems: "center" as AlignItems,
    justifyContent: "center" as JustifyContent,
    height: 44,
    borderRadius: radius.md,
    paddingHorizontal: spacing[6],
  },

  btnPrimary: {
    backgroundColor: semantic.btnPrimaryBg,
    borderRadius: radius.md,
  },

  btnAccent: {
    backgroundColor: semantic.btnAccentBg,
    borderRadius: radius.md,
  },

  btnSecondary: {
    backgroundColor: semantic.bgSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: semantic.borderDefault,
  },

  btnGhost: {
    backgroundColor: colors.transparent,
    borderRadius: radius.md,
  },

  btnDisabled: { opacity: 0.45 },
  btnSm: { height: 34, paddingHorizontal: spacing[4], borderRadius: radius.sm },
  btnLg: { height: 52, paddingHorizontal: spacing[8], borderRadius: radius.lg },
  btnFull: { width: "100%" as const },

  // ─── ボタンテキスト ───────────────────────────
  btnTextPrimary: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: semantic.btnPrimaryText,
  },

  btnTextAccent: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: semantic.btnAccentText,
  },

  btnTextSecondary: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: semantic.textPrimary,
  },

  // ─── フォーム ─────────────────────────────────
  formGroup: {
    marginBottom: spacing[4],
  },

  formLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: semantic.textPrimary,
    marginBottom: spacing[1],
  },

  formInput: {
    height: 44,
    paddingHorizontal: spacing[4],
    borderWidth: 1,
    borderColor: semantic.borderDefault,
    borderRadius: radius.md,
    backgroundColor: semantic.bgSurface,
    fontSize: fontSize.base,
    color: semantic.textPrimary,
  },

  formInputFocused: {
    borderColor: semantic.borderFocus,
  },

  formTextarea: {
    minHeight: 120,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: semantic.borderDefault,
    borderRadius: radius.md,
    backgroundColor: semantic.bgSurface,
    fontSize: fontSize.base,
    color: semantic.textPrimary,
  },

  formError: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: spacing[1],
  },

  formHint: {
    fontSize: fontSize.xs,
    color: semantic.textMuted,
    marginTop: spacing[1],
  },

  // ─── テキスト ─────────────────────────────────
  textPrimary: { fontSize: fontSize.base, color: semantic.textPrimary },
  textSecondary: { fontSize: fontSize.sm, color: semantic.textSecondary },
  textMuted: { fontSize: fontSize.sm, color: semantic.textMuted },
  textLink: { fontSize: fontSize.base, color: semantic.textLink },
  textBold: { fontWeight: fontWeight.bold },

  h1: {
    fontSize: fontSize["2xl"],
    fontWeight: fontWeight.bold,
    color: semantic.textPrimary,
  },
  h2: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: semantic.textPrimary,
  },
  h3: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: semantic.textPrimary,
  },

  // ─── バッジ ──────────────────────────────────
  badgeBase: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: spacing[1],
  },
  badgePrimary: { backgroundColor: colors.primary100 },
  badgePrimaryText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primary800,
  },
  badgeAccent: { backgroundColor: colors.accent100 },
  badgeAccentText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.accent500,
  },
  badgeSuccess: { backgroundColor: colors.successBg },
  badgeSuccessText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  badgeDanger: { backgroundColor: colors.dangerBg },
  badgeDangerText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.danger,
  },
  badgeNeutral: { backgroundColor: colors.neutral100 },
  badgeNeutralText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.neutral600,
  },

  // ─── 商品カード ───────────────────────────────
  itemCard: {
    backgroundColor: semantic.bgSurface,
    borderRadius: radius.lg,
    borderWidth: hairlineWidth,
    borderColor: semantic.borderDefault,
    overflow: "hidden" as Overflow,
    ...shadow.sm,
  },

  itemCardImage: {
    width: "100%" as const,
    aspectRatio: 4 / 3,
    backgroundColor: colors.primary50,
  },

  itemCardBody: { padding: spacing[3] },
  itemCardName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: semantic.textPrimary,
  },
  itemCardPrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary700,
  },
  itemCardPoint: { fontSize: fontSize.xs, color: colors.accent500 },

  // ─── 区切り線 ─────────────────────────────────
  divider: {
    height: hairlineWidth,
    backgroundColor: semantic.borderDefault,
    marginVertical: spacing[4],
  },

  // ─── ボトムナビ ───────────────────────────────
  bottomNav: {
    flexDirection: "row" as FlexDirection,
    height: layout.bottomNavHeight,
    backgroundColor: semantic.bgSurface,
    borderTopWidth: hairlineWidth,
    borderTopColor: semantic.borderDefault,
  },

  bottomNavItem: {
    flex: 1,
    alignItems: "center" as AlignItems,
    justifyContent: "center" as JustifyContent,
  },
  bottomNavLabel: { fontSize: fontSize.xs, color: semantic.textMuted },
  bottomNavLabelActive: { fontSize: fontSize.xs, color: colors.primary600 },

  // ─── 空状態 ──────────────────────────────────
  emptyState: {
    alignItems: "center" as AlignItems,
    justifyContent: "center" as JustifyContent,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[6],
  },

  emptyStateTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: semantic.textSecondary,
    textAlign: "center" as TextAlign,
  },
  emptyStateText: {
    fontSize: fontSize.sm,
    color: semantic.textMuted,
    textAlign: "center" as TextAlign,
  },

  // ─── ローディング ─────────────────────────────
  loadingOverlay: {
    flex: 1,
    alignItems: "center" as AlignItems,
    justifyContent: "center" as JustifyContent,
    backgroundColor: semantic.bgPage,
  },
} as const;
