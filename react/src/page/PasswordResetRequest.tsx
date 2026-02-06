import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Header } from '../component/Header';
import api from '../conf/api';
import { AxiosError } from 'axios';

type Inputs = {
    email: string;
};

const PasswordResetRequest: React.FC = () => {
    const { register, handleSubmit, formState: { errors } } = useForm<Inputs>();
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const onSubmit = async (data: Inputs) => {
        setLoading(true);
        setMessage('');
        setError('');

        try {
            await api.post('/password-reset/request', data);
            setMessage('パスワード再設定用のメールを送信しました。メールボックスをご確認ください。');
        } catch (e) {
            const err = e as AxiosError;
            console.error(err);
            // セキュリティ上、詳細なエラーは出さず、通信エラーなど致命的な場合のみ表示
            setError('送信に失敗しました。時間をおいて再度お試しください。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Header />
            <div className="flex justify-center items-center mt-8 max-md:mt-0">
                <div className="w-full max-w-md p-5 space-y-6 bg-white rounded shadow-md">
                    <h2 className="text-2xl font-bold text-center text-gray-900">パスワード再設定</h2>
                    <p className="text-sm text-gray-600 text-center">
                        ご登録のメールアドレスを入力してください。<br />
                        再設定用のリンクをお送りします。
                    </p>

                    {message ? (
                        <div className="p-4 bg-green-50 text-green-700 rounded-md">
                            {message}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                            <div>
                                <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                                <input
                                    type="email"
                                    {...register('email', {
                                        required: 'メールアドレスは必須です',
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: "正しいメールアドレスを入力してください"
                                        }
                                    })}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="example@animaloop.com"
                                />
                                {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none disabled:bg-gray-400"
                            >
                                {loading ? '送信中...' : 'メールを送信する'}
                            </button>
                        </form>
                    )}

                    <div className="text-center mt-4">
                        <Link to="/login" className="text-sm text-indigo-600 hover:underline">
                            ログイン画面に戻る
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PasswordResetRequest;