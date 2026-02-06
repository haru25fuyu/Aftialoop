import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, UserRound } from "lucide-react";

import { Header } from '../../component/Header';

import api from '../../conf/api';
import { CONFIG } from '../../conf/config';

type Inputs = {
    id: string,
    name: string,
    email: string,
    icon_url: string | File,
    password: string,
    phone: string,
    bio: string,
    birth: string,
    gender: string
};

const EditProfile: React.FC = () => {
    const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<Inputs>();
    const navigate = useNavigate();
    const [preview, setPreview] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // 現在の入力値を監視
    const currentEmail = watch("email");
    const currentPhone = watch("phone");

    useEffect(() => {
        api.post('/profile/get', {})
            .then((res) => {
                if (res.data.icon_url) {
                    res.data.icon_url = CONFIG.BASE_URL + res.data.icon_url;
                }
                setPreview(res.data.icon_url);
                reset(res.data);
                setValue("gender", res.data.gender);
                setValue("birth", res.data.date_of_birth);
            })
            .catch((err) => console.error(err));
    }, [reset, setValue]);

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
        const formData = new FormData();
        // メールと電話番号は別画面で変更するため、ここでの送信データからは除外するか、
        // もしくはバックエンド側で無視するようにします
        const jsonData = {
            name: data.name,
            bio: data.bio,
            gender: data.gender,
            birth: data.birth,
        };

        formData.append('data', JSON.stringify(jsonData));
        if (selectedFile) formData.append('icon_url', selectedFile);

        api.post(CONFIG.BASE_URL + '/profile/edit', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
            .then(() => {
                navigate('/mypage/profile', { replace: true, state: { changed: true } });
            })
            .catch((err) => console.error(err));
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20"> {/* 背景色をつけて画面全体を明るく */}
            <Header />

            <div className="flex justify-center items-start pt-6 px-4">
                <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                    {/* ヘッダー部分 */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">プロフィール編集</h2>
                        <button
                            onClick={() => navigate(-1)}
                            className="text-sm font-bold text-gray-500 hover:text-gray-800"
                        >
                            キャンセル
                        </button>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                            {/* アイコン変更エリア */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative group cursor-pointer w-28 h-28">
                                    <label className="block w-full h-full rounded-full overflow-hidden border-4 border-gray-50 shadow-sm cursor-pointer relative">
                                        {preview ? (
                                            <img
                                                src={preview.startsWith("http") ? preview + "?t=" + new Date().getTime() : preview}
                                                alt="プレビュー"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full bg-gray-100">
                                                <UserRound className="text-gray-400 w-12 h-12" />
                                            </div>
                                        )}
                                        {/* オーバーレイ */}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="text-white w-8 h-8" />
                                        </div>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                    </label>
                                    <div className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow border border-gray-200 pointer-events-none">
                                        <Camera className="w-4 h-4 text-gray-600" />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">タップして画像を変更</p>
                            </div>

                            {/* 入力フィールド群 */}
                            <div className="space-y-5">
                                {/* 名前 */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">ユーザーネーム <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        {...register('name', { required: '必須です' })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-gray-50 focus:bg-white"
                                    />
                                    {errors.name && <p className="mt-1 text-sm text-red-500 font-bold">{errors.name.message}</p>}
                                </div>

                                {/* 自己紹介 */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">自己紹介</label>
                                    <textarea
                                        {...register('bio')}
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-gray-50 focus:bg-white resize-none"
                                    />
                                </div>

                                {/* 性別 (ボタン風ラジオボタン) */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">性別</label>
                                    <div className="flex bg-gray-100 p-1 rounded-xl">
                                        {[
                                            { val: "1", label: "男性" },
                                            { val: "2", label: "女性" },
                                            { val: "3", label: "未回答" }
                                        ].map((option) => (
                                            <label key={option.val} className="flex-1 cursor-pointer">
                                                <input type="radio" value={option.val} {...register('gender')} className="hidden peer" />
                                                <div className="text-center py-2 text-sm font-bold text-gray-500 rounded-lg peer-checked:bg-white peer-checked:text-emerald-600 peer-checked:shadow-sm transition-all">
                                                    {option.label}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* 非公開情報セクション */}
                                <div className="pt-4 border-t border-gray-100 space-y-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">非公開情報</h3>

                                    {/* メールアドレス変更リンク化 */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold">メールアドレス</p>
                                            <p className="text-sm font-medium text-gray-700">{currentEmail || '未設定'}</p>
                                        </div>
                                        <Link to="/mypage/settings/email" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">
                                            変更
                                        </Link>
                                    </div>

                                    {/* 電話番号変更リンク化 */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold">電話番号</p>
                                            <p className="text-sm font-medium text-gray-700">{currentPhone || '未設定'}</p>
                                        </div>
                                        <Link to="/mypage/settings/phone" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">
                                            変更
                                        </Link>
                                    </div>

                                    {/* 誕生日（誕生日は変更不可にするケースが多いですが、一応そのまま） */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 pl-1">誕生日</label>
                                        <input type="date" {...register('birth')} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50" />
                                    </div>
                                </div>

                                {/* パスワード変更 */}
                                <div className="text-right">
                                    <Link to="/mypage/password" className="text-sm font-bold text-emerald-600 hover:underline">
                                        パスワードを変更する
                                    </Link>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600 shadow-md hover:bg-emerald-700 hover:shadow-lg transform active:scale-[0.98] transition-all"
                                >
                                    変更を保存する
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfile;
