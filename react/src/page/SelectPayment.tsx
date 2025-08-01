import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Header } from '../component/Header';

import SquarePayment from '../modal/EditPayment';
import LoginModal from '../modal/Login';

import api from '../conf/api';

import { Payment } from '../types/Content';

const PaymentList: React.FC = () => {
    const [payments, setPayments] = React.useState<Payment[]>([])
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [selectedPaymentID, setSelectedPaymentID] = React.useState<string>("");
    const [ModalMode, setModalMode] = React.useState<string>("");
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
    const [reloadTrigger, setReloadTrigger] = useState(0);

    useEffect(() => {
        api.post("card/list", {})
            .then((res) => {
                console.log(res.data);
                if (!res.data.token) {
                    // IDが取れなかったら強制ログアウト
                    localStorage.removeItem("token");
                    localStorage.removeItem("expirationTime");
                    setLoginModalOpen(true);
                } else {
                    localStorage.setItem("token", res.data.token); // トークン更新あれば保存
                }
                setPayments(res.data.card);
                console.log("カード一覧取得:", res.data.card);
            })
            .catch((err) => {
                console.error(err);
                localStorage.removeItem("token");
                localStorage.removeItem("expirationTime");
                setLoginModalOpen(true);
            });

    }, [reloadTrigger]);

    const handleLoginSuccess = () => {
        setReloadTrigger(prev => prev + 1); // トリガーを変えることでuseEffect再発火
    };

    return (
        <div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-y-auto max-h-[80vh] p-4 relative">
                        <SquarePayment
                            setPayments={setPayments}
                            id={selectedPaymentID}
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            openMode={ModalMode}
                        />
                    </div>
                </div>
            )
            }

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => { setLoginModalOpen(false); }} // 閉じられないので空関数 or 固定表示
                onLoginSuccess={handleLoginSuccess}
            />

            <div className="w-full px-4 md:px-8 mt-8">
                <div className="w-full p-5 space-y-6 bg-white rounded shadow-md">
                    <h2 className="text-2xl font-bold text-center text-gray-900">カードの設定</h2>
                    <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
                        <div
                            onClick={() => {
                                setSelectedPaymentID("");
                                setModalMode("card");
                                setIsModalOpen(true);
                            }}
                            className="w-full h-[100px] cursor-pointer flex flex-col items-start p-4 bg-white border rounded-lg shadow-sm hover:bg-gray-100 transition"
                        >
                            <div className="flex flex-col items-start">
                                <p className="text-gray-500">新しいカードの追加</p>
                            </div>
                        </div>
                        {payments?.map((item) => (
                            <div
                                key={item.ID}
                                className="w-full cursor-pointer flex flex-col items-start p-4 bg-white border rounded-lg shadow-sm hover:bg-gray-100 transition space-y-2"                            >
                                <div className="space-y-1 w-full">
                                    {item.IsDefault && (
                                        <div className="text-sm font-medium text-green-500">デフォルト</div>
                                    )}
                                    <div className="text-sm font-medium">{item.CardBrand}</div>
                                    <div className="text-sm">末尾 **** {item.Last4}</div>
                                    <div className="text-sm">
                                        有効期限は{item.ExpYear}/{item.ExpMonth}です
                                    </div>
                                    {item.Name && <div className="text-sm">{item.Name}</div>}
                                </div>

                                <div className="flex flex-col items-center space-y-2 mt-4 w-full">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            console.log("この住所を使います:", item);
                                            // ここで選択した住所を使う処理を追加
                                        }}
                                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                    >
                                        この支払いカードを使う
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPaymentID(item.ID);
                                            setModalMode("customer");
                                            setIsModalOpen(true);
                                            console.log("編集ボタン押された:", item.ID);
                                        }}
                                        className="px-4 py-2 text-sm bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                                    >
                                        請求先を編集する
                                    </button>
                                </div>
                            </div>
                        ))}

                    </div>
                </div>
                <hr />
            </div>

        </div >

    );
};

export default PaymentList;