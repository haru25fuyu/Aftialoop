#!/bin/bash
# =============================================================
# ANIMALOOP — Tailwind カラー一括置換スクリプト
#
# 使い方:
#   chmod +x migrate-colors.sh
#   ./migrate-colors.sh
#
# 対象: react/src/**/*.tsx
# バックアップ: .bak ファイルを同階層に作成
# =============================================================

TARGET_DIR="./react/src"
DRY_RUN=false  # true にすると変更せず差分だけ表示

# 引数で --dry-run を受け付ける
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY RUN モード（ファイルは変更しません）"
fi

echo "🎨 カラークラス置換を開始します..."
echo "対象ディレクトリ: $TARGET_DIR"
echo ""

# sed の in-place オプション（macOS と Linux で異なる）
if [[ "$OSTYPE" == "darwin"* ]]; then
  SED_INPLACE="sed -i .bak"
else
  SED_INPLACE="sed -i.bak"
fi

# 置換を実行する関数
replace() {
  local from="$1"
  local to="$2"
  local files

  files=$(grep -rl "$from" "$TARGET_DIR" --include="*.tsx" --include="*.ts" 2>/dev/null)

  if [[ -z "$files" ]]; then
    return
  fi

  echo "  $from → $to"

  if [[ "$DRY_RUN" == "false" ]]; then
    echo "$files" | xargs $SED_INPLACE "s/$from/$to/g"
  else
    echo "$files" | while read -r f; do
      grep -n "$from" "$f" | head -3 | sed "s/^/    [$f] /"
    done
  fi
}

# =============================================================
# テキストカラー
# =============================================================
echo "📝 テキストカラー..."

# グレー系 → ニュートラル
replace "text-gray-900"  "text-neutral-900"
replace "text-gray-800"  "text-neutral-800"
replace "text-gray-700"  "text-neutral-700"
replace "text-gray-600"  "text-neutral-600"
replace "text-gray-500"  "text-neutral-500"
replace "text-gray-400"  "text-neutral-400"
replace "text-gray-300"  "text-neutral-300"

# イエロー・アンバー・オレンジ → プライマリ
replace "text-yellow-700"  "text-primary-700"
replace "text-yellow-600"  "text-primary-600"
replace "text-yellow-500"  "text-primary-500"
replace "text-amber-600"   "text-primary-600"
replace "text-amber-500"   "text-primary-500"
replace "text-orange-600"  "text-primary-600"
replace "text-orange-500"  "text-primary-500"

# レッド → アクセント（ダークレッド）
replace "text-red-700"  "text-accent-700"
replace "text-red-600"  "text-accent-600"
replace "text-red-500"  "text-accent-500"
replace "text-red-400"  "text-accent-400"

# ブルー → インフォ（セマンティック）
replace "text-blue-700"    "text-info-700"
replace "text-blue-600"    "text-info-600"
replace "text-blue-500"    "text-info-500"
replace "text-indigo-600"  "text-info-600"
replace "text-indigo-500"  "text-info-500"

# グリーン・エメラルド → サクセス
replace "text-green-600"    "text-success-600"
replace "text-green-500"    "text-success-500"
replace "text-emerald-700"  "text-success-700"
replace "text-emerald-600"  "text-success-600"
replace "text-emerald-500"  "text-success-500"

# ピンク → アクセント
replace "text-pink-600"  "text-accent-600"
replace "text-pink-500"  "text-accent-500"

# =============================================================
# 背景カラー
# =============================================================
echo "🎨 背景カラー..."

# グレー系
replace "bg-gray-100"  "bg-neutral-100"
replace "bg-gray-50"   "bg-neutral-50"

# イエロー・アンバー・オレンジ → プライマリ
replace "bg-yellow-500"  "bg-primary-500"
replace "bg-yellow-400"  "bg-primary-400"
replace "bg-yellow-100"  "bg-primary-100"
replace "bg-yellow-50"   "bg-primary-50"
replace "bg-amber-500"   "bg-primary-500"
replace "bg-amber-400"   "bg-primary-400"
replace "bg-amber-100"   "bg-primary-100"
replace "bg-amber-50"    "bg-primary-50"
replace "bg-orange-500"  "bg-primary-500"
replace "bg-orange-400"  "bg-primary-400"
replace "bg-orange-100"  "bg-primary-100"
replace "bg-orange-50"   "bg-primary-50"

# レッド → アクセント
replace "bg-red-600"  "bg-accent-600"
replace "bg-red-500"  "bg-accent-500"
replace "bg-red-100"  "bg-accent-100"
replace "bg-red-50"   "bg-accent-50"

# ブルー → インフォ
replace "bg-blue-700"    "bg-info-700"
replace "bg-blue-600"    "bg-info-600"
replace "bg-blue-100"    "bg-info-100"
replace "bg-blue-50"     "bg-info-50"
replace "bg-indigo-100"  "bg-info-100"
replace "bg-indigo-50"   "bg-info-50"

# グリーン・エメラルド → サクセス
replace "bg-green-600"    "bg-success-600"
replace "bg-green-100"    "bg-success-100"
replace "bg-green-50"     "bg-success-50"
replace "bg-emerald-700"  "bg-success-700"
replace "bg-emerald-600"  "bg-success-600"
replace "bg-emerald-100"  "bg-success-100"
replace "bg-emerald-50"   "bg-success-50"

# ピンク → アクセント
replace "bg-pink-100"  "bg-accent-100"
replace "bg-pink-50"   "bg-accent-50"

# イエロー・アンバー warning 系
replace "bg-yellow-200"  "bg-warning-200"
replace "bg-amber-200"   "bg-warning-200"

# =============================================================
# ボーダーカラー
# =============================================================
echo "🔲 ボーダーカラー..."

replace "border-gray-200"  "border-neutral-200"
replace "border-gray-100"  "border-neutral-100"

replace "border-yellow-400"  "border-primary-400"
replace "border-yellow-300"  "border-primary-300"
replace "border-yellow-200"  "border-primary-200"
replace "border-amber-400"   "border-primary-400"
replace "border-amber-200"   "border-primary-200"
replace "border-orange-400"  "border-primary-400"

replace "border-red-500"  "border-accent-500"
replace "border-red-400"  "border-accent-400"
replace "border-red-300"  "border-accent-300"
replace "border-red-200"  "border-accent-200"

replace "border-blue-600"    "border-info-600"
replace "border-blue-500"    "border-info-500"
replace "border-indigo-400"  "border-info-400"

replace "border-green-500"    "border-success-500"
replace "border-emerald-500"  "border-success-500"
replace "border-emerald-100"  "border-success-100"

# =============================================================
# hover・focus 状態
# =============================================================
echo "🖱️  hover / focus..."

replace "hover:bg-yellow-500"   "hover:bg-primary-500"
replace "hover:bg-yellow-400"   "hover:bg-primary-400"
replace "hover:bg-orange-500"   "hover:bg-primary-500"
replace "hover:bg-red-600"      "hover:bg-accent-600"
replace "hover:bg-blue-700"     "hover:bg-info-700"
replace "hover:bg-emerald-700"  "hover:bg-success-700"
replace "hover:text-blue-500"   "hover:text-info-500"
replace "hover:text-red-600"    "hover:text-accent-600"

replace "focus:ring-yellow-400"   "focus:ring-primary-400"
replace "focus:ring-emerald-500"  "focus:ring-success-500"
replace "focus:ring-blue-500"     "focus:ring-info-500"
replace "focus:border-blue-500"   "focus:border-info-500"

# =============================================================
# ring カラー
# =============================================================
echo "💍 ring カラー..."

replace "ring-yellow-400"   "ring-primary-400"
replace "ring-orange-400"   "ring-primary-400"
replace "ring-red-500"      "ring-accent-500"
replace "ring-blue-500"     "ring-info-500"
replace "ring-emerald-500"  "ring-success-500"

# =============================================================
# animate（pulse の色）
# =============================================================
echo "✨ アニメーション..."

replace "bg-red-500 rounded-full animate-pulse"  "bg-accent-500 rounded-full animate-pulse"

# =============================================================
# 完了
# =============================================================
echo ""
if [[ "$DRY_RUN" == "true" ]]; then
  echo "✅ DRY RUN 完了（ファイルは変更されていません）"
  echo "   実際に適用するには: ./migrate-colors.sh"
else
  echo "✅ 置換完了！"
  echo ""
  echo "📋 バックアップファイル（.bak）が作成されています。"
  echo "   確認後、不要なら以下で削除できます："
  echo "   find $TARGET_DIR -name '*.bak' -delete"
  echo ""
  echo "⚠️  次のステップ："
  echo "   1. tailwind.config.ts に primary/accent/info/success カラーを登録する"
  echo "   2. ブラウザで表示確認（クラスが未定義の場合は色が消えます）"
fi
