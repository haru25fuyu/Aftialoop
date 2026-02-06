import React from "react";
import { Link } from "react-router-dom";
import Header from "../component/Header";

const ContactComplete: React.FC = () => {
    return (
        <>
            <Header />
            <main className="container mx-auto px-4 py-16 max-w-2xl text-center">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
                        ✓
                    </div>

                    <h1 className="text-2xl font-bold text-gray-800">送信が完了しました</h1>

                    <p className="text-gray-600 leading-relaxed">
                        お問い合わせありがとうございます。<br />
                        ご入力いただいたメールアドレスへ自動返信メールをお送りしました。<br />
                        <br />
                        内容を確認次第、担当者より順次ご連絡させていただきますので、<br />
                        今しばらくお待ちください。
                    </p>

                    <div className="pt-6">
                        <Link
                            to="/"
                            className="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition shadow-sm"
                        >
                            トップページへ戻る
                        </Link>
                    </div>
                </div>
            </main>
        </>
    );
};

export default ContactComplete;