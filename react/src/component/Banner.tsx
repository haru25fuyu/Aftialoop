// Banner.tsx
export function Banner({ canPublish, done, total }: { canPublish: boolean; done: number; total: number }) {
    return (
        <div className={[
            "rounded-md border px-3 py-2 text-sm",
            canPublish ? "border-green-300 bg-green-50 text-green-800" : "border-gray-300 bg-gray-50 text-gray-700"
        ].join(" ")}>
            {!canPublish
                ? <>出品準備中：必須 <b>{done}/{total}</b> 完了。あと<b>{total - done}</b>項目で公開できます。</>
                : <>出品可能になりました。今すぐ公開できます。詳細はあとから追加OK。</>
            }
        </div>
    );
}