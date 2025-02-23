import React from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { Header } from '../component/Header';
import { GoogleOAuth } from '../component/GoogleOAuth';

import { NODE_API } from '../conf/config';

type Inputs = {
    name: string,
    email: string,
    password: string
}

const SignUp: React.FC = () => {
    const { register, handleSubmit, formState: { errors } } = useForm<Inputs>();
    const navigate = useNavigate();

    const onSubmit = async (data: Inputs) => {
        axios.post(NODE_API.URL + '/signup', data, { headers: NODE_API.HEADERS })
            .then((res) => {
                if (!res.data.err_message) {
                    //仮登録完了ページに遷移
                    navigate('/signup/complete');
                }
            })
            .catch((err) => {
                console.error(err);
            });
    };
    return (
        <div>
            <Header />

            <div className="flex justify-center items-center mt-10 max-md:mt-0">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">
                    <h2 className="text-2xl font-bold text-center text-gray-900">サインアップ</h2>
                    <GoogleOAuth />
                    <div className="text-center text-2xl">or</div>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                            <button
                                type="submit"
                                className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                サインアップ
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SignUp;