// src/page/PasswordResetExecute.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Header } from '../component/Header';
import PasswordInput from '../component/PasswordInput'; // 作成したコンポーネント
import api from '../conf/api';
import { AxiosError } from 'axios';

// 今回用の入力型定義 (現在のパスワードは不要)
type ResetInputs = {
    new_password: string;
    new_password_confirm: string;
};

const PasswordResetExecute: React.FC = () => {
    const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetInputs>();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    // 表示切替用のstate
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // パスワード一致確認用
    const newPassword = watch("new_password");

    const onSubmit = async (data: ResetInputs) => {
        if (!token) {
            setError('無効なリンクです。');
            return;
        }
        setLoading(true);
        setError('');

        try {
            // API呼び出し (型は前の回答のExecutePasswordResetInputに合う形)
            await api.post('/password-reset/execute', {
                token: token,
                password: data.new_password
            });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (e) {
            const err = e as AxiosError<{ error: string }>; // 型を適宜調整
            console.error(err);
            setError(err.response?.data?.error || 'パスワード再設定に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div>
                <Header />
                <div className="flex justify-center mt-10">
                    <div className="p-5 bg-red-50 text-red-700 rounded shadow font-bold">
                        無効なアクセスです。メールのリンクをご確認ください。
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Header />
            <div className="flex justify-center items-center mt-8 px-4">
                <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                    <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">新しいパスワードの設定</h2>

                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl font-bold">
                                パスワードを変更しました！<br />
                                ログイン画面へ移動します...
                            </div>
                            <Link to="/login" className="text-indigo-600 underline font-bold block">
                                すぐにログインする
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {error && <p className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-bold text-center">{error}</p>}

                            <PasswordInput
                                label="新しいパスワード"
                                name="new_password"
                                register={register}
                                registerRules={{
                                    required: 'パスワードは必須です',
                                    minLength: { value: 8, message: '8文字以上で入力してください' }
                                }}
                                show={showPass}
                                toggleShow={() => setShowPass(!showPass)}
                                error={errors.new_password}
                            />

                            <PasswordInput
                                label="新しいパスワード（確認）"
                                name="new_password_confirm"
                                register={register}
                                registerRules={{
                                    required: '確認のため再度入力してください',
                                    validate: (value) => value === newPassword || 'パスワードが一致しません'
                                }}
                                show={showConfirm}
                                toggleShow={() => setShowConfirm(!showConfirm)}
                                error={errors.new_password_confirm}
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                {loading ? '設定中...' : 'パスワードを変更する'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PasswordResetExecute;