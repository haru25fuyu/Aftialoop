// src/modal/PublishCompleteDialog.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
    open: boolean;
    itemId: number | null;
    onClose: () => void;
    onContinue: () => void;
};

export function PublishCompleteDialog({ open, itemId, onClose, onContinue }: Props) {
    const nav = useNavigate();
    const [copied, setCopied] = useState(false);

    const itemUrl = itemId ? `/flea-market/item/${itemId}` : "";
    const fullUrl = typeof window !== "undefined" ? window.location.origin + itemUrl : "";
    const editUrl = itemId ? `/flea-market/${itemId}/edit` : "";
    const myPageUrl = "/mypage/selling/list";

    const handleCopy = async () => {
        if (!itemId) return;
        try {
            await navigator.clipboard.writeText(fullUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    const handleShare = async () => {
        if (!itemId) return;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "出品しました | Animaloop",
                    text: "商品ページをチェックしてね",
                    url: fullUrl,
                });
            } else {
                handleCopy();
            }
        } catch {
            // ignore
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Success Header */}
                <div className="pt-8 pb-6 px-6 flex flex-col items-center text-center bg-gradient-to-b from-green-50 to-white">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 ring-8 ring-green-50 animate-bounce-short">
                        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">出品完了！</h3>
                    <p className="text-sm text-gray-500 mt-1">商品の公開が始まりました</p>
                </div>

                <div className="px-6 pb-6 space-y-6">

                    {/* Share Section */}
                    <div className="bg-gray-50 rounded-xl p-1 border border-gray-200 flex items-center">
                        <div className="flex-1 px-3 py-2 overflow-hidden">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">商品リンク</p>
                            <p className="text-sm text-gray-600 truncate">{fullUrl}</p>
                        </div>
                        <div className="flex gap-1 pr-1">
                            <button
                                onClick={handleCopy}
                                className={`
                                    p-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1
                                    ${copied
                                        ? "bg-green-500 text-white shadow-md"
                                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-sm"
                                    }
                                `}
                            >
                                {copied ? (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        <span className="hidden sm:inline">コピー</span>
                                    </>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                )}
                            </button>
                            <button
                                onClick={handleShare}
                                className="p-2 rounded-lg bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 shadow-sm transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Primary Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={onContinue}
                            className="w-full h-12 rounded-xl bg-black text-white font-bold text-base shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all active:scale-[0.98]"
                        >
                            続けて出品する
                        </button>

                        <button
                            onClick={() => itemId && nav(itemUrl)}
                            disabled={!itemId}
                            className="w-full h-12 rounded-xl border-2 border-gray-100 text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-200 transition-colors flex items-center justify-center gap-2 group"
                        >
                            商品ページを見る
                            <svg className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>
                    </div>

                    {/* Secondary Links */}
                    <div className="flex items-center justify-center gap-6 pt-2">
                        <button onClick={() => nav(myPageUrl)} className="text-xs text-gray-500 hover:text-gray-800 font-medium underline-offset-4 hover:underline">
                            出品した商品一覧へ
                        </button>
                        {itemId && (
                            <button onClick={() => nav(editUrl)} className="text-xs text-gray-500 hover:text-gray-800 font-medium underline-offset-4 hover:underline">
                                編集する
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}