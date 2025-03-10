import React from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

import { Header } from '../component/Header';

import { NODE_API } from '../conf/config';

type Inputs = {
    name: string,
    email: string,
    password: string
}

const EditProfile: React.FC = () => {
    const { register, handleSubmit, formState: { errors } } = useForm<Inputs>();
    const navigate = useNavigate();

    const onSubmit = async (data: Inputs) => {
        console.log(data);
        axios.post(NODE_API.URL + '/login', data, { headers: NODE_API.HEADERS })
            .then((res) => {
                console.log(res.data);
                const expiresIn = res.data.expires_in;
                // 現在時刻にexpires_in（秒）を加えて、期限を計算
                const expirationTime = Date.now() / 1000 + expiresIn;  // 秒単位で保存

                localStorage.setItem('token', res.data.access_token);
                localStorage.setItem('expirationTime', expirationTime);

                navigate('/');
            })
            .catch((err) => {
                console.error(err);
            });
    };
    return (
        <div>
            <Header />

            <div className="flex justify-center items-center mt-8 max-md:mt-0">
                <div className="w-full max-w-md p-5space-y-6 bg-white rounded shadow-md">
                    <h2 className="text-2xl font-bold text-center text-gray-900">お届け先の設定</h2>
                    <div className="text-center text-l">or</div>
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
                            <Link to="/">パスワード忘れた方</Link>
                            <button
                                type="submit"
                                className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                ログイン
                            </button>
                        </div>
                    </form>
                    <hr />
                    <div className="text-center text-l"><Link to="/SignUp">新規登録はこちら</Link></div>
                </div>
            </div>
        </div>
    );
};

export default EditProfile;