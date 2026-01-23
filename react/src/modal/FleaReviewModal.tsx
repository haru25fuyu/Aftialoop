import React from "react";
import { Star, X, Check } from "lucide-react";
import { REVIEW_TEMPLATES } from "../conf/FleaMarket";

type FleaReviewModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => Promise<void>; // 完了時の処理（非同期）
};

export default function FleaReviewModal({
    isOpen,
    onClose,
    onSubmit,
}: FleaReviewModalProps) {
    // モーダル内で管理するState
    const [rating, setRating] = React.useState(5);
    const [comment, setComment] = React.useState("");
    const [isChecked, setIsChecked] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // モーダルが開くたびに初期化したい場合は useEffect を使う
    React.useEffect(() => {
        if (isOpen) {
            setRating(5);
            setComment("");
            setIsChecked(false);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!isChecked) return;
        setIsSubmitting(true);
        try {
            await onSubmit(rating, comment);
            // 成功したら親側で閉じたりリロードしたりする想定
        } catch (e) {
            console.error(e);
            alert("送信に失敗しました");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* モーダル本体 */}
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* ヘッダー */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Star className="fill-black text-black" size={20} />
                        受取評価
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-200 transition"
                        disabled={isSubmitting}
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* コンテンツ */}
                <div className="p-6 space-y-6">
                    {/* 星評価 */}
                    <div className="text-center">
                        <p className="text-sm font-bold text-gray-700 mb-3">今回の取引はいかがでしたか？</p>
                        <div className="flex justify-center gap-3 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="transition-transform hover:scale-110 focus:outline-none"
                                >
                                    <Star
                                        size={36}
                                        className={star <= rating ? "fill-black text-black" : "text-gray-200"}
                                        strokeWidth={star <= rating ? 0 : 2}
                                    />
                                </button>
                            ))}
                        </div>
                        <div className="text-sm font-bold text-black h-5">
                            {rating === 5 && "最高！"}
                            {rating === 4 && "良かった"}
                            {rating === 3 && "普通"}
                            {rating === 2 && "不満"}
                            {rating === 1 && "悪い"}
                        </div>
                    </div>

                    {/* コメント */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            コメント <span className="text-xs font-normal text-gray-400">任意</span>
                        </label>
                        <textarea
                            className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black focus:border-black outline-none text-sm min-h-[100px] resize-none"
                            placeholder="スムーズな取引ありがとうございました。梱包も丁寧で安心しました！"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />

                        {/* 定型文チップ */}
                        <div className="mt-3">
                            <div className="text-xs text-gray-400 mb-2 font-bold">定型文を挿入:</div>
                            <div className="flex flex-wrap gap-2">
                                {REVIEW_TEMPLATES.map((tmpl, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setComment(tmpl.text)}
                                        className="text-xs border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 rounded-full px-3 py-1.5 text-gray-600 transition-colors"
                                    >
                                        {tmpl.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 確認チェック */}
                    <label className={`
                        flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer
                        ${isChecked ? "bg-black/5 border-black" : "bg-gray-50 border-gray-200 hover:bg-gray-100"}
                    `}>
                        <input
                            type="checkbox"
                            className="mt-1 w-5 h-5 accent-black cursor-pointer"
                            checked={isChecked}
                            onChange={(e) => setIsChecked(e.target.checked)}
                        />
                        <div className="text-xs text-gray-600">
                            <span className={`font-bold block text-sm mb-0.5 ${isChecked ? "text-black" : "text-gray-700"}`}>
                                中身を確認しました
                            </span>
                            商品に不備がないことを確認しました。評価を送信して取引を完了します。
                        </div>
                    </label>

                    {/* 送信ボタン */}
                    <button
                        onClick={handleSubmit}
                        disabled={!isChecked || isSubmitting}
                        className={`
                            w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all
                            ${isChecked
                                ? "bg-black text-white hover:bg-gray-800 shadow-lg"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"}
                        `}
                    >
                        {isSubmitting ? "送信中..." : (
                            <>
                                <Check size={20} strokeWidth={3} />
                                評価を確定して完了する
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}