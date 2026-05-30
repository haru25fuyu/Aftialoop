import { colors, semantic, spacing, radius, fontSize } from "../styles/tokens";

export function Banner({
  canPublish,
  done,
  total,
}: {
  canPublish: boolean;
  done: number;
  total: number;
}) {
  const style = {
    borderRadius: radius.md,
    border: `1px solid ${canPublish ? colors.success : semantic.borderDefault}`,
    backgroundColor: canPublish ? colors.successBg : semantic.bgSurfaceAlt,
    color: canPublish ? colors.success : semantic.textSecondary,
    padding: `${spacing[2]}px ${spacing[3]}px`,
    fontSize: fontSize.sm,
  };
  return (
    <div style={style}>
      {!canPublish ? (
        <>
          出品準備中：必須{" "}
          <b>
            {done}/{total}
          </b>{" "}
          完了。あと<b>{total - done}</b>項目で公開できます。
        </>
      ) : (
        <>出品可能になりました。今すぐ公開できます。詳細はあとから追加OK。</>
      )}
    </div>
  );
}
