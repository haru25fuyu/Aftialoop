import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import axios from 'axios';

import { GoogleOAuth } from '../component/GoogleOAuth';
import api, { afterLogin } from '../conf/api';

type Inputs = {
    name: string,
    email: string,
    password: string
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
    showCloseButton?: boolean;
};

const LoginModal: React.FC<Props> = ({ isOpen, onClose, onLoginSuccess, showCloseButton = false }) => {
    const { register, handleSubmit, formState: { errors } } = useForm<Inputs>();
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            window.scrollTo({ top: 0, behavior: 'instant' } as ScrollToOptions);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const onSubmit = async (data: Inputs) => {
        try {
            const res = await api.post("/login", data);

            await afterLogin(res.data.access_token);
            onLoginSuccess();
            onClose();
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.err_message ?? "ログインに失敗しました");
            } else {
                setError("予期しないエラーが発生しました");
            }
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50">
            {/* ログイン必須時に画面外右上に表示する全体閉じるボタン */}
            {showCloseButton && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white text-2xl focus:outline-none pointer-events-auto"
                >
                    ×
                </button>
            )}
            <div className="w-full max-w-md p-5 space-y-6 bg-white rounded shadow-md relative">
                <h2 className="text-2xl font-bold text-center text-gray-900">ログイン</h2>
                <GoogleOAuth
                    mode="login"
                    onLoginSuccess={() => {
                        onLoginSuccess();
                        onClose();
                    }} />
                <div className="flex justify-center items-center">
                    <hr className='w-full' /><span className='mx-5'>or</span><hr className='w-full' />
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                        <input
                            type="email"
                            {...register('email', { required: 'メールアドレスは必須です' })}
                            className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">パスワード</label>
                        <input
                            type="password"
                            {...register('password', { required: 'パスワードは必須です' })}
                            className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
                    </div>
                    <div>
                        <Link to="/password-reset" onClick={onClose}>パスワード忘れた方</Link>
                        <button
                            type="submit"
                            className="w-full px-4 py-2 mt-3 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
                        >
                            ログイン
                        </button>
                    </div>
                </form>
                <hr />
                <div className="text-center text-l">
                    <Link
                        to="/SignUp"
                        onClick={() => { onClose(); }}
                    >
                        新規登録はこちら
                    </Link></div>
            </div>
        </div>
    );
};

export default LoginModal;