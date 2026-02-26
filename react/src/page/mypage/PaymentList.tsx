import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../component/Header';
import SquarePayment from '../../modal/EditPayment';
import LoginModal from '../../modal/Login';
import api, { getAccessToken } from '../../conf/api';
import { CreditCard, Plus, Trash2, CheckCircle, Settings, Calendar, ChevronLeft } from 'lucide-react';
import { Payment } from '../../types/Payment';
import { Spinner } from '../../component/Spinner';

const PaymentList: React.FC = () => {
    const navigate = useNavigate();

    const [payments, setPayments] = useState<Payment[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPaymentID, setSelectedPaymentID] = useState<string>("");
    const [ModalMode, setModalMode] = useState<string>("");
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
    const [reloadTrigger, setReloadTrigger] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        api.post("/card/list")
            .then((res) => {
                const token = getAccessToken();
                if (!token || token === 'undefined') {
                    setLoginModalOpen(true);
                }
                setPayments(res.data.card || []);
            })
            .catch((err) => {
                console.error(err);
                setLoginModalOpen(true);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [reloadTrigger]);

    const handleLoginSuccess = () => {
        setReloadTrigger(prev => prev + 1);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setReloadTrigger(prev => prev + 1);
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <Header />

            {isModalOpen && (
                <SquarePayment
                    setPayments={setPayments as React.Dispatch<React.SetStateAction<Payment[]>>}
                    id={selectedPaymentID}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    openMode={ModalMode}
                />
            )}

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setLoginModalOpen(false)}
                onLoginSuccess={handleLoginSuccess}
                showCloseButton={false}
            />

            <main className="max-w-2xl mx-auto p-4 space-y-6">
                <div className="flex items-center gap-2 mt-4 mb-4">
                    <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full">
                        <ChevronLeft size={24} className="text-gray-600" />
                    </button>
                    <CreditCard className="text-blue-600" />
                    <h1 className="text-xl font-bold text-gray-800">支払い方法（カード）</h1>
                </div>

                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-400">
                        <Spinner size="lg" />
                        <p className="text-sm font-medium">カード情報を読み込んでいます...</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* 新規追加ボタン (少しコンパクトに) */}
                        <button
                            onClick={() => {
                                setSelectedPaymentID("");
                                setModalMode("card");
                                setIsModalOpen(true);
                            }}
                            className="w-full flex flex-col items-center justify-center min-h-[150px] border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50 text-blue-500 hover:bg-blue-50 hover:border-blue-500 hover:shadow-md transition gap-2 group"
                        >
                            <div className="bg-white p-2.5 rounded-full shadow-sm group-hover:scale-110 transition">
                                <Plus size={28} />
                            </div>
                            <span className="font-bold text-sm">新しいカードを追加</span>
                        </button>

                        {/* カードリスト */}
                        {payments?.map((item) => (
                            <div
                                key={item.id}
                                className={`relative bg-white border rounded-xl shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden
                                ${item.isDefault ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-200"}
                            `}
                            >
                                {/* デフォルトバッジ */}
                                {item.isDefault && (
                                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1 z-10">
                                        <CheckCircle size={12} /> デフォルト
                                    </div>
                                )}

                                {/* カード情報エリア (パディングを p-4 に) */}
                                <div className="p-4 flex-1 flex flex-col justify-center">
                                    {/* ブランド名 (文字サイズを base に) */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="font-bold text-base text-gray-700 uppercase tracking-wider">
                                            {item.cardBrand}
                                        </div>
                                        <CreditCard size={20} className="text-gray-300" />
                                    </div>

                                    {/* カード番号 (文字サイズを xl に) */}
                                    <div className="text-xl font-mono text-gray-800 tracking-widest mb-3">
                                        **** **** **** {item.last4}
                                    </div>

                                    {/* 有効期限 */}
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            <span className="text-xs uppercase">Expires</span>
                                        </div>
                                        <span className="font-bold text-gray-700">
                                            {String(item.expMonth).padStart(2, '0')} / {String(item.expYear).slice(-2)}
                                        </span>
                                    </div>
                                </div>

                                {/* アクションボタン (高さを少し低く py-2.5) */}
                                <div className="bg-gray-50 border-t border-gray-100 flex divide-x divide-gray-200">
                                    <button
                                        onClick={() => {
                                            setSelectedPaymentID(item.id);
                                            setModalMode("customer");
                                            setIsModalOpen(true);
                                        }}
                                        className="flex-1 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition flex items-center justify-center gap-2"
                                    >
                                        <Settings size={16} /> 詳細・設定
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedPaymentID(item.id);
                                            setModalMode("delete");
                                            setIsModalOpen(true);
                                        }}
                                        className="flex-1 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} /> 削除
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default PaymentList;