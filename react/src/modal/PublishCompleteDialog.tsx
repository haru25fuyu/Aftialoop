import React from "react";
import { useNavigate } from "react-router-dom";

type Props = {
    open: boolean;
    itemId: number | null;
    onClose: () => void;
    onContinue: () => void;
};

export function PublishCompleteDialog({ open, itemId, onClose, onContinue }: Props) {
    const nav = useNavigate();

    const itemUrl = itemId ? `/flea-market/item/${itemId}` : "";
    const editUrl = itemId ? `/flea-market/${itemId}/edit` : "";
    const myPageUrl = "/mypage/items";

    const copy = async () => {
        if (!itemId) return;
        try {
            await navigator.clipboard.writeText(location.origin + itemUrl);
        } catch { }
    };

    const share = async () => {
        if (!itemId) return;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "出品しました",
                    text: "商品ページをチェックしてね",
                    url: location.origin + itemUrl,
                });
            } else {
                await copy();
            }
        } catch { }
    };

    // ここで早期returnしてOK（フックは既に呼んでいる）
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/30"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="w-full md:max-w-md md:rounded-2xl bg-white shadow-xl border md:m-0 m-0 rounded-t-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5">
                    <h3 className="text-lg font-semibold">出品が完了しました 🎉</h3>
                    {itemId && <p className="mt-1 text-sm text-gray-600">商品ID: {itemId}</p>}

                    <div className="mt-4 grid gap-2">
                        <button className="h-11 rounded-xl bg-black text-white" onClick={onContinue}>
                            続けて出品する
                        </button>

                        <button onClick={() => nav(myPageUrl)} className="h-11 rounded-xl border grid place-items-center">
                            出品マイページへ
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => itemId && nav(editUrl)}
                                disabled={!itemId}
                                className="h-11 rounded-xl border grid place-items-center disabled:opacity-50"
                            >
                                この商品を編集
                            </button>
                            <button
                                onClick={() => itemId && nav(itemUrl)}
                                disabled={!itemId}
                                className="h-11 rounded-xl border grid place-items-center disabled:opacity-50"
                            >
                                商品ページを開く
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button className="h-11 rounded-xl border" onClick={copy} disabled={!itemId}>
                                リンクをコピー
                            </button>
                            <button className="h-11 rounded-xl border" onClick={share} disabled={!itemId}>
                                共有する
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
