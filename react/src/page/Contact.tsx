import React from "react";

import Header from "../component/Header";
//import Footer from "../component/Footer";

const Contact: React.FC = () => {
    return (
        <>
            <header>
                <Header />
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto p-6 space-y-8">
                    <h1 className="text-2xl font-bold">お問い合わせ</h1>

                    <p>
                        ご不明な点がありましたら、以下の方法でお気軽にお問い合わせください。
                    </p>

                    <div className="space-y-4">
                        <div className="border rounded-xl p-4 shadow-md">
                            <h2 className="text-lg font-semibold mb-2">LINEでお問い合わせ</h2>
                            <p className="mb-4">
                                すぐに返事が欲しい方はこちらからLINEでお問い合わせください。
                            </p>
                            <a
                                href="https://lin.ee/KZXAcfL" // ← LINE公式URLに置き換えてください
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-600 transition"
                            >
                                友だち追加はこちら
                            </a>
                        </div>

                        <div className="border rounded-xl p-4 shadow-md">
                            <h2 className="text-lg font-semibold mb-2">フォームでお問い合わせ</h2>
                            <p className="mb-4">
                               メールでのお問い合わせをご希望の方は、以下のフォームをご利用ください。
                            </p>
                            <a
                                href="/contact/form" // ← フォームページへのパス
                                className="inline-block bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition"
                            >
                                フォームはこちら
                            </a>
                        </div>
                    </div>

                    <div className="text-sm text-gray-500">
                        ※お問い合わせ内容によっては、返信までにお時間をいただく場合があります。
                    </div>
                </div>

            </main>

            <footer>
                {/*<Footer />*/}
            </footer>
        </>
    );
};

export default Contact;
