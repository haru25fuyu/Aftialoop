import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, SubmitHandler } from "react-hook-form";
import Header from "../component/Header";
import api from "../conf/api";

type ContactInput = {
    name: string;
    email: string;
    category: string;
    body: string;
};

const ContactForm: React.FC = () => {
    const navigate = useNavigate();
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContactInput>();
    const [sendError, setSendError] = useState<string | null>(null);

    const onSubmit: SubmitHandler<ContactInput> = async (data) => {
        setSendError(null);
        try {
            await api.post("/contact/send", data);
            alert("お問い合わせを送信しました。");
            navigate("/"); // 送信後はトップや完了画面へ
        } catch (error) {
            console.error(error);
            setSendError("送信に失敗しました。時間をおいて再度お試しください。");
        }
    };

    return (
        <>
            <Header />
            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <h1 className="text-2xl font-bold mb-6 text-center">お問い合わせフォーム</h1>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        
                        {/* お名前 */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                お名前 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? "border-red-500" : "border-gray-300"}`}
                                placeholder="例：動物 太郎"
                                {...register("name", { required: "お名前は必須です" })}
                            />
                            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                        </div>

                        {/* メールアドレス */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                メールアドレス <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? "border-red-500" : "border-gray-300"}`}
                                placeholder="例：taro@example.com"
                                {...register("email", { 
                                    required: "メールアドレスは必須です",
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: "正しいメールアドレス形式で入力してください"
                                    }
                                })}
                            />
                            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                        </div>

                        {/* お問い合わせ種別 */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                お問い合わせ種別 <span className="text-red-500">*</span>
                            </label>
                            <select
                                className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.category ? "border-red-500" : "border-gray-300"}`}
                                {...register("category", { required: "種別を選択してください" })}
                            >
                                <option value="">選択してください</option>
                                <option value="service">サービスに関するお問い合わせ</option>
                                <option value="account">アカウント・ログインについて</option>
                                <option value="item">商品・取引について</option>
                                <option value="bug">不具合の報告</option>
                                <option value="other">その他</option>
                            </select>
                            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>}
                        </div>

                        {/* お問い合わせ内容 */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                お問い合わせ内容 <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                rows={6}
                                className={`w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.body ? "border-red-500" : "border-gray-300"}`}
                                placeholder="具体的な内容をご記入ください"
                                {...register("body", { 
                                    required: "内容は必須です",
                                    minLength: { value: 10, message: "10文字以上で入力してください" }
                                })}
                            />
                            {errors.body && <p className="text-red-500 text-sm mt-1">{errors.body.message}</p>}
                        </div>

                        {sendError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                {sendError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "送信中..." : "送信する"}
                        </button>
                    </form>
                </div>
            </main>
        </>
    );
};

export default ContactForm;