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
        api.post("/api/card/list",)
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
            <header>
                <Header />
            </header>
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => { setLoginModalOpen(false); }} // 閉じられないので空関数 or 固定表示
                onLoginSuccess={handleLoginSuccess}
            />
            <main>
                <div className="flex justify-center items-center mt-8 max-md:mt-0">
                    <div className="w-full max-w-md p-5space-y-6 bg-white rounded shadow-md">
                        <h2 className="text-2xl font-bold text-center text-gray-900">カードの設定</h2>
                        <div className="space-y-6">
                            <div className="contents-list flex flex-wrap justify-center gap-4">
                                <div
                                    onClick={() => {
                                        setSelectedPaymentID("");
                                        setModalMode("card");
                                        setIsModalOpen(true);
                                    }}
                                    className="cursor-pointer contents_item flex flex-col items-start text-left h-auot overflow-hidden hover:bg-gray-100 transition"
                                >
                                    <div className="flex flex-col items-start">
                                        <p className="text-gray-500">新しいカードの追加</p>
                                    </div>
                                </div>
                                {payments?.map((item) => (
                                    <div
                                        key={item.ID}
                                        className="cursor-pointer flex flex-col items-start text-left h-auto overflow-hidden rounded-lg border border-gray-200 p-4 transition"
                                    >
                                        <div className="space-y-1 w-full">
                                            {item.IsDefault && (
                                                <div className="text-sm font-medium text-green-500">デフォルト</div>
                                            )}
                                            <div className="text-sm font-medium">{item.CardBrand}</div>
                                            <div className="text-sm">末尾 **** {item.Last4}</div>
                                            <div className="text-sm">
                                                {item.ExpMonth}/{item.ExpYear}
                                            </div>
                                            {item.Name && <div className="text-sm">{item.Name}</div>}
                                        </div>

                                        <div className="mt-3 flex space-x-4">
                                            <button
                                                onClick={() => {
                                                    setSelectedPaymentID(item.ID);
                                                    setModalMode("customer");
                                                    setIsModalOpen(true);
                                                }}
                                                className="text-sm text-blue-600 hover:underline"
                                            >
                                                編集
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setSelectedPaymentID(item.ID);
                                                    setModalMode("delete");
                                                    setIsModalOpen(true);
                                                }}
                                                className="text-sm text-red-500 hover:underline"
                                            >
                                                削除
                                            </button>
                                        </div>
                                    </div>
                                ))}

                            </div>
                        </div>
                        <hr />
                    </div>
                </div>
            </main>
        </div >

    );
};

export default PaymentList;