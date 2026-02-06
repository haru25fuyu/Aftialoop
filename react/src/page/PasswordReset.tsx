import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { Header } from '../component/Header';
import api from '../conf/api';
import { CONFIG } from '../conf/config';
import { AxiosError } from 'axios';
import PasswordInput from '../component/PasswordInput';

type Inputs = {
    current_password: string;
    new_password: string;
    new_password_confirm: string;
};

const PasswordReset: React.FC = () => {
    const { register, handleSubmit, formState: { errors }, watch } = useForm<Inputs>();
    const navigate = useNavigate();
    const [serverError, setServerError] = useState<string | null>(null);

    // パスワードの表示/非表示状態管理
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // 確認用パスワードのバリデーション用
    const newPassword = watch("new_password");

    const [hasPassword, setHasPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        api.post('/profile/get', {})
            .then((res) => {
                console.log(res.data);
                setHasPassword(!!res.data.has_password);
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    const onSubmit = async (data: Inputs) => {
        setServerError(null);

        try {
            await api.post(CONFIG.BASE_URL + '/user/password/change', {
                current_password: data.current_password,
                new_password: data.new_password
            });

            // 成功したらマイページへ戻りつつ、トースト等を出すフラグを渡す
            navigate('/mypage/profile', {
                replace: true,
                state: { changed: true, message: "パスワードを変更しました" }
            });
        } catch (e) {
            const err = e as AxiosError<{ err_message: string }>;
            console.error(err);

            if (err.response?.data?.err_message) {
                setServerError(err.response.data.err_message);
            } else {
                setServerError("パスワードの変更に失敗しました。時間をおいて再度お試しください。");
            }
        }
    };

    if (isLoading) return <div className="p-10 text-center">読み込み中...</div>;

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <Header />

            <div className="flex justify-center items-start pt-6 px-4">
                <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                    {/* ヘッダー */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">パスワード変更</h2>
                        <button
                            onClick={() => navigate(-1)}
                            className="text-sm font-bold text-gray-500 hover:text-gray-800"
                        >
                            キャンセル
                        </button>
                    </div>

                    <div className="p-6">
                        {/* 状況に応じたメッセージを表示 */}
                        {!hasPassword && (
                            <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-sm font-bold">
                                ℹ️ パスワードが未設定です。新しく設定してください。
                            </div>
                        )}

                        {serverError && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
                                <span>⚠️</span>
                                <span>{serverError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                            {/* ★現在のパスワード: hasPassword が true の時だけ表示・必須にする */}
                            {hasPassword && (
                                <>
                                    <PasswordInput
                                        label="現在のパスワード"
                                        name="current_password"
                                        register={register}
                                        registerRules={{ required: '現在のパスワードを入力してください' }}
                                        show={showCurrent}
                                        toggleShow={() => setShowCurrent(!showCurrent)}
                                        error={errors.current_password}
                                    />
                                    <div className="text-right mt-1">
                                        <Link
                                            to="/password-reset"
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                                        >
                                            現在のパスワードを忘れた方はこちら
                                        </Link>
                                    </div>
                                </>
                            )}

                            <div className="border-t border-gray-100 my-4"></div>

                            {/* 新しいパスワード */}
                            <PasswordInput
                                label="新しいパスワード"
                                name="new_password"
                                register={register}
                                registerRules={{
                                    required: '新しいパスワードを入力してください',
                                    minLength: { value: 8, message: '8文字以上で入力してください' }
                                }}
                                show={showNew}
                                toggleShow={() => setShowNew(!showNew)}
                                error={errors.new_password}
                            />

                            {/* 新しいパスワード(確認) */}
                            <PasswordInput
                                label="新しいパスワード（確認）"
                                name="new_password_confirm"
                                register={register}
                                registerRules={{
                                    required: '確認のためもう一度入力してください',
                                    validate: (value: string) => value === newPassword || 'パスワードが一致しません'
                                }}
                                show={showConfirm}
                                toggleShow={() => setShowConfirm(!showConfirm)}
                                error={errors.new_password_confirm}
                            />

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600 shadow-md hover:bg-emerald-700 hover:shadow-lg transform active:scale-[0.98] transition-all"
                                >
                                    パスワードを変更する
                                </button>
                            </div>

                            <p className="text-xs text-gray-400 text-center leading-relaxed">
                                ※セキュリティのため、他のサービスと同じパスワードの使い回しはお控えください。
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PasswordReset;