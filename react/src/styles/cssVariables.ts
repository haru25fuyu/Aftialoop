/**
 * Web 用 CSS 変数を tokens.ts から自動生成するユーティリティ
 *
 * これを使うと theme.css を手書きせず、
 * tokens.ts を変えるだけで Web 側にも反映できる。
 *
 * 使い方（Web の main.tsx 等で呼ぶ）：
 *   import { injectCSSVariables } from "../styles/cssVariables";
 *   injectCSSVariables();
 */

import { colors, spacing, radius, fontSize, shadow, semantic, layout } from "./tokens";

export function injectCSSVariables(): void {
  const root = document.documentElement;
  const set = (key: string, value: string) =>
    root.style.setProperty(key, value);

  // カラー
  set("--color-primary-50",  colors.primary50);
  set("--color-primary-100", colors.primary100);
  set("--color-primary-200", colors.primary200);
  set("--color-primary-300", colors.primary300);
  set("--color-primary-400", colors.primary400);
  set("--color-primary-500", colors.primary500);
  set("--color-primary-600", colors.primary600);
  set("--color-primary-700", colors.primary700);
  set("--color-primary-800", colors.primary800);
  set("--color-primary-900", colors.primary900);

  set("--color-accent-50",  colors.accent50);
  set("--color-accent-100", colors.accent100);
  set("--color-accent-200", colors.accent200);
  set("--color-accent-400", colors.accent400);
  set("--color-accent-500", colors.accent500);
  set("--color-accent-600", colors.accent600);
  set("--color-accent-800", colors.accent800);

  set("--color-neutral-0",   colors.neutral0);
  set("--color-neutral-50",  colors.neutral50);
  set("--color-neutral-100", colors.neutral100);
  set("--color-neutral-200", colors.neutral200);
  set("--color-neutral-300", colors.neutral300);
  set("--color-neutral-400", colors.neutral400);
  set("--color-neutral-600", colors.neutral600);
  set("--color-neutral-800", colors.neutral800);
  set("--color-neutral-900", colors.neutral900);

  // セマンティック
  set("--bg-page",        semantic.bgPage);
  set("--bg-surface",     semantic.bgSurface);
  set("--bg-surface-alt", semantic.bgSurfaceAlt);
  set("--bg-header",      semantic.bgHeader);

  set("--text-primary",   semantic.textPrimary);
  set("--text-secondary", semantic.textSecondary);
  set("--text-muted",     semantic.textMuted);
  set("--text-inverse",   semantic.textInverse);
  set("--text-link",      semantic.textLink);

  set("--border-color",       semantic.borderDefault);
  set("--border-color-focus", semantic.borderFocus);

  // スペーシング
  Object.entries(spacing).forEach(([k, v]) =>
    set(`--space-${k}`, `${v}px`)
  );

  // 半径
  set("--border-radius-sm",   `${radius.sm}px`);
  set("--border-radius-md",   `${radius.md}px`);
  set("--border-radius-lg",   `${radius.lg}px`);
  set("--border-radius-xl",   `${radius.xl}px`);
  set("--border-radius-full", `${radius.full}px`);

  // フォントサイズ
  Object.entries(fontSize).forEach(([k, v]) =>
    set(`--font-size-${k}`, `${v}px`)
  );

  // レイアウト
  set("--header-height",      `${layout.headerHeight}px`);
  set("--bottom-nav-height",  `${layout.bottomNavHeight}px`);
  set("--content-padding",    `${layout.contentPaddingH}px`);
  set("--content-max-width",  `${layout.maxWidth}px`);
}
