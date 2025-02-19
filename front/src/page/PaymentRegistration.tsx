import React, { useState, useEffect } from "react";
import { PaymentForm, CreditCard } from "react-square-web-payments-sdk";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import Header from "../component/Header";
import Footer from "../component/Footer";

import { NODE_API } from "../conf/config";

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
        axios.post(NODE_API.URL + "/get-customer",{},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        ...NODE_API.HEADERS,
                    },
                }
            )
            .then((res) => {
                console.log(res.data);
                setCustomerId(res.data.customerId);
            })
            .catch((err) => {
                console.error(err);
                navigate("/login");
            });
    }, []);


    // axios を使用したカード情報保存処理
    const saveCard = async (token: string) => {
        console.log("トークン:", token);
        try {
            const response = await axios.post(NODE_API.URL + "/api/save-card", { token: token, customerId: customerId });

            // レスポンスが正常であれば customerId を更新
            if (response.data.customerId) {
                alert("カードが保存されました！");
            }
        } catch (error) {
            // axios ではエラーが出た場合、response でエラーの詳細にアクセスできます
            if (axios.isAxiosError(error)) {
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
                            applicationId="sq0idp-Ah717xTCqVPpRZf3qjUGcg"
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
