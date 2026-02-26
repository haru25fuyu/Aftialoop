import React, { useEffect, useState } from 'react';

// Declare grecaptcha as a global variable
declare const grecaptcha: any;
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Header } from '../component/Header';
import { GoogleOAuth } from '../component/GoogleOAuth';

import api from '../conf/api';
import { LoadingButton } from '../component/LoadingButton';

type Inputs = {
    name: string,
    email: string,
    password: string,
    password2: string // 再入力用
}

const SignUp: React.FC = () => {
    const { register, handleSubmit, formState: { errors }, watch } = useForm<Inputs>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const password = watch('password');
    const password2 = watch('password2');

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://www.google.com/recaptcha/enterprise.js?render=6LfsB0MrAAAAAEUuEF6fsTYOxYTx6dUYxU_cjRX4";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const onSubmit = async (data: Inputs) => {
        if (password !== password2) {
            alert('パスワードが一致しません');
            return;
        }

        setLoading(true); // 3. 通信開始時にくるくるON

        try {
            // reCAPTCHAの実行
            const token = await grecaptcha.enterprise.execute('6LfsB0MrAAAAAEUuEF6fsTYOxYTx6dUYxU_cjRX4', { action: 'LOGIN' });

            // API通信
            const res = await api.post('/signup', {
                email: data.email,
                password: data.password,
                GoogleID: token
            });

            if (!res.data.err_message) {
                navigate('/signup/complete');
            } else {
                setError(res.data.err_message);
            }
        } catch (err) {
            console.error(err);
            setError("サインアップに失敗しました。");
        } finally {
            setLoading(false); // 4. 成功しても失敗してもくるくるOFF
        }
    };

    return (
        <div>
            <Header />

            <div className="flex justify-center items-center mt-10 max-md:mt-0">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
                    <h2 className="text-2xl font-bold text-center text-gray-900">サインアップ</h2>
                    <GoogleOAuth
                        mode="signup"
                        onLoginSuccess={() => { navigate('/signup/complete'); }}
                        onError={(msg) => setError(msg)} />
                    <div className="flex justify-center items-center"><hr className='w-full' /><span className='mx-5'>or</span><hr className='w-full' /></div>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                            <p className="text-sm text-gray-500">※メールアドレスはログインIDとして使用します</p>
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
                            <label className="block text-sm font-medium text-gray-700">パスワード再入力</label>
                            <input
                                type="password"
                                {...register('password2', { required: 'パスワード再入力は必須です' })}
                                className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {password && password2 && password !== password2 && (
                                <p className="mt-2 text-sm text-red-600">パスワードが一致しません</p>
                            )}
                        </div>
                        <div>
                            <LoadingButton
                                type="submit"
                                loading={loading}
                                className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                サインアップ
                            </LoadingButton>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
