import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, AlertTriangle } from 'lucide-react';

import { REPORT_REASON_OPTIONS } from '../conf/Report';

type ReportInputs = {
    reason: string;
    details: string;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    userName: string; // 通報対象のユーザー名
    onSubmit: (reason: string, details: string) => Promise<void>; // 送信時の処理
};

const ReportUserModal: React.FC<Props> = ({ isOpen, onClose, userName, onSubmit }) => {
    const { register, handleSubmit, formState: { errors }, reset } = useForm<ReportInputs>();
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const onFormSubmit = async (data: ReportInputs) => {
        setLoading(true);
        try {
            await onSubmit(data.reason, data.details);
            reset(); // フォームをリセット
            onClose(); // 成功したら閉じる
        } catch (error) {
            console.error(error);
            alert("送信に失敗しました。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 背景オーバーレイ */}
            <div
                className="absolute inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            ></div>

            {/* モーダル本体 */}
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* ヘッダー */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2 text-red-600 font-bold">
                        <AlertTriangle size={20} />
                        <h2>ユーザーを通報する</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-6">
                        <span className="font-bold text-gray-800">{userName}</span> さんの問題点を報告してください。<br />
                        この報告は相手には通知されません。
                    </p>

                    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
                        {/* 通報理由（必須） */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                通報理由 <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    {...register('reason', { required: '理由を選択してください' })}
                                    className="w-full appearance-none px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-red-500 focus:ring-red-200 focus:ring-2 outline-none transition-all text-sm"
                                >
                                    <option value="">選択してください</option>
                                    {REPORT_REASON_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                {/* セレクトボックスの矢印アイコンなどを入れるならここ */}
                            </div>
                            {errors.reason && <p className="mt-1 text-xs text-red-500 font-bold">{errors.reason.message}</p>}
                        </div>

                        {/* 詳細（任意） */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                詳細（任意）
                            </label>
                            <textarea
                                {...register('details')}
                                rows={4}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-red-500 focus:ring-red-200 focus:ring-2 outline-none transition-all text-sm resize-none"
                                placeholder="具体的な内容をご記入ください"
                            ></textarea>
                        </div>

                        {/* アクションボタン */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? '送信中...' : '通報する'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ReportUserModal;