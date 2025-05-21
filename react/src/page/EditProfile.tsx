import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, UserRound } from "lucide-react";
import axios from 'axios';

import { Header } from '../component/Header';

import api from '../conf/api';
import CONFIG from '../conf/config';

type Inputs = {
    id: string,
    name: string,
    email: string,
    image: string | File,
    password: string
    phone: string,
    bio: string,
    birth: string,
    gender: string
}

type Get = {
    id: string,
    name: string,
    email: string,
    image: string,
    password: string
    phone: string,
    bio: string,
    birth: string,
    gender: string
}

const EditProfile: React.FC = () => {
    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<Inputs>();
    const navigate = useNavigate();
    const [preview, setPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [user, setUser] = useState<Get>({
        id: '',
        name: '',
        email: '',
        image: '',
        password: '',
        phone: '',
        bio: '',
        birth: '',
        gender: ''
    });

    useEffect(() => {
        // ユーザー情報を取得
        setToken(localStorage.getItem('token'));
        if (!token || token === 'undefined') {
            navigate("/login", { state: { page: 'Profile' } });
        }
        api.post('/profile/get', {},)
            .then((res) => {
                if (res.data.IconURL != null && res.data.IconURL !== "") {
                    // 画像URLがある場合はBASE_URLを付加
                    res.data.IconURL = CONFIG.BASE_URL + res.data.IconURL;
                }

                const userData = {
                    id: res.data.ID || "",
                    name: res.data.Name || "",
                    email: res.data.Email || "",
                    image: res.data.IconURL || "",
                    password: "",
                    phone: res.data.PhoneNumber || "",
                    bio: res.data.Bio || "",
                    birth: res.data.DateOfBirth || "",
                    gender: res.data.Gender || ""
                };
                setUser(userData);
                setPreview(userData.image);
                reset(userData);
                setValue("gender", userData.gender);
                console.log(res.data);
            })
            .catch((err) => {
                console.error(err);
                localStorage.removeItem('token');
                localStorage.removeItem('expirationTime');
                navigate("/login", { state: { page: "/profile" } });
            });
        console.log(user);
    }, []);

    // 画像選択のハンドラー
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (data: Inputs) => {
        data.phone = data.phone.replace(/-/g, '');
        data.image = selectedFile || new File([], 'dummy');

        // FormDataオブジェクトを作成
        const formData = new FormData();
        const jsonData = {
            name: data.name,
            email: data.email,
            phone: data.phone,
            bio: data.bio,
            gender: data.gender,
            birth: data.birth,
        };
        // JSONデータをFormDataに追加
        formData.append('data', JSON.stringify(jsonData));
        // 画像をFormDataに追加
        if (selectedFile) {
            formData.append('image', selectedFile);
        }

        axios.post(CONFIG.BASE_URL + '/profile/edit', formData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                // Content-Type は指定しない（axiosが自動で付ける）
            },
            withCredentials: true, // ← Cookieも使ってるなら忘れず
        })
            .then((res) => {
                console.log(res.data);
                navigate('/profile', { replace: true, state: { chenge: true } });
            })
            .catch((err) => {
                console.error(err);
            });
    };
    return (
        <div>
            <Header />

            <div className="flex justify-center items-center mt-8 max-md:mt-0">
                <div className="w-full max-w-md p-5 space-y-6 bg-white rounded shadow-md">
                    <h2 className="text-2xl font-bold text-center text-gray-900">ユーザー情報の設定</h2>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="relative w-32 h-32 mx-auto">
                            <label className="w-full h-full block rounded-full overflow-hidden cursor-pointer group">
                                {/* 画像プレビューがある場合はプレビュー画像、ない場合はアイコンを表示 */}
                                {preview ? (
                                    <img
                                        src={preview.startsWith("http") ? preview + "?t=" + new Date().getTime() : preview}
                                        alt="プレビュー"
                                        className="w-full h-full object-cover transition-opacity group-hover:opacity-70"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full bg-gray-200">
                                        <UserRound className="text-gray-500 w-12 h-12 rounded-full object-cover" />
                                    </div>
                                )}

                                {/* カメラアイコン（常に右下に表示） */}
                                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 p-1 rounded-full">
                                    <Camera className="w-5 h-5 text-white" />
                                </div>

                                {/* ホバー時に「画像を変更する」の文字を表示 */}
                                <div className="absolute inset-0 flex items-center justify-center rounded-full text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50">
                                    画像を変更する
                                </div>

                                {/* ファイル選択 */}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                            </label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ユーザーネーム</label>
                            <input
                                type="name"
                                defaultValue={user.name}
                                {...register('name', { required: 'ユーザーネームは必須です' })}
                                className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                            <input
                                type="email"
                                defaultValue={user.email}
                                {...register('email', { required: 'メールアドレスは必須です' })}
                                className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">電話番号</label>
                            <input
                                type="test"
                                defaultValue={user.phone}
                                {...register('phone', { required: '電話番号は必須です' })}
                                className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">パスワード</label>

                            <Link to="/ResetPassword" className="text-indigo-600 hover:underline">パスワードの変更はこちら</Link>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">自己紹介(オークション用)</label>
                            <textarea
                                defaultValue={user.bio}
                                {...register('bio')}
                                className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">性別</label>
                            <div className="flex gap-4 mt-1">
                                <label className="flex items-center space-x-1">
                                    <input
                                        type="radio"
                                        className="w-4 h-4"
                                        value="1"
                                        {...register('gender')}
                                    />
                                    <span>男性</span>
                                </label>
                                <label className="flex items-center space-x-1">
                                    <input
                                        type="radio"
                                        className="w-4 h-4"
                                        value="2"
                                        {...register('gender')}
                                    />
                                    <span>女性</span>
                                </label>
                                <label className="flex items-center space-x-1">
                                    <input
                                        type="radio"
                                        className="w-4 h-4"
                                        value="3"
                                        {...register('gender')}
                                    />
                                    <span>未回答</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">誕生日</label>
                            <input
                                type="date"
                                {...register('birth')}
                                className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <button
                                type="submit"
                                className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                保存
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditProfile;