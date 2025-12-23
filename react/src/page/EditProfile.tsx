import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, UserRound } from "lucide-react";
import axios from 'axios';

import { Header } from '../component/Header';
import LoginModal from '../modal/Login'; // ← ここ忘れず

import api,{getAccessToken} from '../conf/api';
import { CONFIG } from '../conf/config';

type Inputs = {
    id: string,
    name: string,
    email: string,
    image: string | File,
    password: string,
    phone: string,
    bio: string,
    birth: string,
    gender: string
};

type Get = Omit<Inputs, 'image'> & { image: string };

const EditProfile: React.FC = () => {
    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<Inputs>();
    const navigate = useNavigate();
    const [preview, setPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [user, setUser] = useState<Get>({
        id: '', name: '', email: '', image: '', password: '', phone: '',
        bio: '', birth: '', gender: ''
    });

    const [showLoginModal, setShowLoginModal] = useState(false);
    const [reloadTrigger, setReloadTrigger] = useState(0);

    const handleLoginSuccess = () => {
        setShowLoginModal(false);
        setReloadTrigger(prev => prev + 1);
    };

    useEffect(() => {
        const token = getAccessToken();
        if (!token || token === 'undefined') {
            setShowLoginModal(true);
            return;
        }

        api.post('/profile/get', {})
            .then((res) => {
                if (res.data.IconURL) {
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
            })
            .catch((err) => {
                console.error(err);
                setShowLoginModal(true);
            });
    }, [reloadTrigger]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (data: Inputs) => {
        data.phone = data.phone.replace(/-/g, '');
        data.image = selectedFile || new File([], 'dummy');

        const formData = new FormData();
        const jsonData = {
            name: data.name,
            email: data.email,
            phone: data.phone,
            bio: data.bio,
            gender: data.gender,
            birth: data.birth,
        };
        formData.append('data', JSON.stringify(jsonData));
        if (selectedFile) formData.append('image', selectedFile);

        api.post(CONFIG.BASE_URL + '/profile/edit', formData)
            .then((res) => {
                console.log(res.data);
                navigate('/profile', { replace: true, state: { change: true } });
            })
            .catch((err) => {
                console.error(err);
            });
    };

    return (
        <div>
            <Header />

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => { }} // 閉じれない
                onLoginSuccess={handleLoginSuccess}
            />

            {!showLoginModal && (
                <div className="flex justify-center items-center mt-8 max-md:mt-0">
                    <div className="w-full max-w-md p-5 space-y-6 bg-white rounded shadow-md">
                        <h2 className="text-2xl font-bold text-center text-gray-900">ユーザー情報の設定</h2>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="relative w-32 h-32 mx-auto">
                                <label className="w-full h-full block rounded-full overflow-hidden cursor-pointer group">
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
                                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 p-1 rounded-full">
                                        <Camera className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center rounded-full text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50">
                                        画像を変更する
                                    </div>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ユーザーネーム</label>
                                <input
                                    type="text"
                                    {...register('name', { required: 'ユーザーネームは必須です' })}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
                            </div>
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
                                <label className="block text-sm font-medium text-gray-700">電話番号</label>
                                <input
                                    type="text"
                                    {...register('phone', { required: '電話番号は必須です' })}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                {errors.phone && <p className="mt-2 text-sm text-red-600">{errors.phone.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">パスワード</label>
                                <Link to="/ResetPassword" className="text-indigo-600 hover:underline">パスワードの変更はこちら</Link>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">自己紹介(オークション用)</label>
                                <textarea
                                    {...register('bio')}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">性別</label>
                                <div className="flex gap-4 mt-1">
                                    <label className="flex items-center space-x-1">
                                        <input type="radio" value="1" {...register('gender')} />
                                        <span>男性</span>
                                    </label>
                                    <label className="flex items-center space-x-1">
                                        <input type="radio" value="2" {...register('gender')} />
                                        <span>女性</span>
                                    </label>
                                    <label className="flex items-center space-x-1">
                                        <input type="radio" value="3" {...register('gender')} />
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
            )}
        </div>
    );
};

export default EditProfile;
