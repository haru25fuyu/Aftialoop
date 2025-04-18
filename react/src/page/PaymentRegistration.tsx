import React, { useState, useEffect } from "react";
import { PaymentForm, CreditCard } from "react-square-web-payments-sdk";
import { useNavigate } from "react-router-dom";

import Header from "../component/Header";
import Footer from "../component/Footer";

import api from "../conf/api";

interface Token {
    token: string;
}

const SquarePayment: React.FC = () => {
    const [customerId, setCustomerId] = useState<string | null>(null);
    const navigate = useNavigate();
    useEffect(() => {
        //ユーザーチェック
        const token = localStorage.getItem("token");
        if (!token || token === "undefined") {
            navigate("/login");
        }

        //APIdで顧客IDを取得
        api.post("/customer/data",)
            .then((res) => {
                console.log(res.data);
                if (!res.data.user.ID) {
                    // IDが取れなかったら強制ログアウト
                    localStorage.removeItem("token");
                    localStorage.removeItem("expirationTime");
                    navigate("/login");
                } else {
                    setCustomerId(res.data.user.ID);
                    localStorage.setItem("token", res.data.token); // トークン更新あれば保存
                }
            })
            .catch((err) => {
                console.error(err);
                localStorage.removeItem("token");
                localStorage.removeItem("expirationTime");
                navigate("/login");
            });
    }, []);


    // axios を使用したカード情報保存処理
    const saveCard = async (token: string) => {
        console.log("トークン:", token);
        try {
            const response = await api.post("/api/save-card", { token: token, customerId: customerId });

            // レスポンスが正常であれば customerId を更新
            if (response.data.customerId) {
                alert("カードが保存されました！");
            }
        } catch (error) {
            // axios ではエラーが出た場合、response でエラーの詳細にアクセスできます
            if (api.isAxiosError(error)) {
                console.error("Axiosエラー:", error.response?.data || error.message);
            } else {
                console.error("保存エラー:", error);
            }
            alert("カード保存に失敗しました。後ほど再試行してください。");
        }
    };

    return (
        <>
            <header>
                <Header />
            </header>
            <main>
                <div className="flex justify-center items-center mt-8 max-md:mt-0">
                    <div className="w-full max-w-md p-5space-y-6 bg-white rounded shadow-md">
                        <h2 className="text-2xl font-bold text-center text-gray-900">クレジットカード情報の登録</h2>
                        <PaymentForm
                            applicationId="sandbox-sq0idb-7ZT3Ftv3F_58OmL_12N_yg"
                            locationId="LJ05QCSPT544X"
                            cardTokenizeResponseReceived={(token: Token) => saveCard(token.token)}
                        >
                            <CreditCard />
                        </PaymentForm>

                    </div>
                </div>
            </main>
            <footer>
                <Footer />
            </footer>
        </>
    );
};

export default SquarePayment;
