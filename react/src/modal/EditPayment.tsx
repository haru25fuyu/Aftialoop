import React, { useState, useEffect } from "react";
import { PaymentForm, CreditCard } from "react-square-web-payments-sdk";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel, Scrollbar, FreeMode } from "swiper/modules";
import "swiper/swiper-bundle.css";
import { X, Save, Trash2, MapPin } from "lucide-react"; // ★アイコンを追加
import axios from "axios";

import api from "../conf/api";
import { Address } from '../types/Address';
import { Payment } from '../types/Payment';
import { LoadingButton } from "../component/LoadingButton"; // ★LoadingButtonを追加

type EditPaymentProps = {
    setPayments: React.Dispatch<React.SetStateAction<Payment[]>>;
    id: string;
    isOpen: boolean;
    onClose: () => void;
    openMode?: string;
};

const MODE = {
    CARD: "card",
    Customer: "customer",
    Delete: "delete"
}

const SquarePayment: React.FC<EditPaymentProps> = ({ id, isOpen, onClose, setPayments, openMode }) => {
    const [address, setAddress] = React.useState<Address[]>([])
    const [userId, setUserId] = useState<string | null>(null);
    const [mode, setMode] = useState(MODE.Customer);
    const [cardId, setCardId] = useState<string | null>(null);
    const [defaultCard, setDefaultCard] = useState<string | null>(null);
    const [selectAddressID, setSelectAddressID] = useState<string | null>(null);
    const [makeDefault, setMakeDefault] = useState(false);
    const [created, setCreated] = useState(false);

    // ★通信中を判定するためのStateを追加
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = '15px'; // スクロールバー分の隙間埋め
        } else {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }

        setMode(openMode || MODE.Customer);

        if (openMode === MODE.Customer) {
            setCardId(id);
            setCreated(false);
            api.post('/address/list')
                .then((res) => {
                    setAddress(res.data.address || []);
                })
                .catch((err) => {
                    console.error("住所一覧エラー:", err);
                });

            api.post("/card/address/get", { cardId: id })
                .then((res) => {
                    setSelectAddressID(res.data.address.ID);
                })
                .catch((err) => {
                    console.error(err);
                });
        }

        api.post("/customer/data")
            .then((res) => {
                setUserId(res.data.user.id);
                setDefaultCard(res.data.user.defaultCard);
                setMakeDefault(res.data.user.defaultCard === id);
            })
            .catch((err) => {
                console.error(err);
            });

        return () => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        };
    }, [id, isOpen, openMode]);

    // axios を使用したカード情報保存処理 (SquareのSDKが呼ぶ)
    const saveCard = async (token: string | undefined, verificationToken: string) => {
        if (!token || token === "undefined") {
            alert("カード入力に問題があります。全ての項目を正しく入力してください。");
            return;
        }
        try {
            const response = await api.post("/card/save", { token: token, userId: userId, verificationToken: verificationToken });

            setMode(MODE.Customer);
            setCardId(response.data.card);
            setCreated(true);
            api.post('/address/list')
                .then((res) => {
                    setAddress(res.data.address || []);
                })
                .catch((err) => {
                    console.error("住所一覧エラー:", err);
                });

        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Axiosエラー:", error.response?.data || error.message);
            } else {
                console.error("保存エラー:", error);
            }
            alert("カード保存に失敗しました。後ほど再試行してください。");
        }
    };

    // カードに住所を登録
    const saveAddress = async () => {
        if (!selectAddressID) {
            alert("住所が選択されていません。");
            return;
        }

        setIsSubmitting(true); // ★通信開始

        try {
            const response = await api.post("/card/address", { addressID: selectAddressID, cardID: cardId });
            setPayments(response.data.card);

            if (makeDefault) {
                const res = await api.post("/card/default", { cardID: cardId });
                setPayments(res.data.card);
            }

            onClose();
        } catch (error) {
            console.error("保存エラー:", error);
            alert("住所保存に失敗しました。後ほど再試行してください。");
        } finally {
            setIsSubmitting(false); // ★通信終了
        }
    }

    // カード削除処理
    const handleDelete = async () => {
        setIsSubmitting(true); // ★通信開始
        try {
            const res = await api.post("/card/delete", { cardId: id });
            setPayments(res.data.card);
            onClose();
        } catch (error) {
            console.error(error);
            alert("削除に失敗しました。後ほど再試行してください。");
        } finally {
            setIsSubmitting(false); // ★通信終了
        }
    };

    // モーダルの外側をクリックしたときにモーダルを閉じる
    const handleModalClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isSubmitting) {
            Close();
        }
    };

    const Close = () => {
        if (mode === MODE.Customer && created) {
            // カード情報が登録されている場合、カード情報を削除
            api.post("/card/delete", { cardId: cardId })
                .then((res) => {
                    setPayments(res.data.card);
                })
                .catch((err) => {
                    console.error(err);
                    alert("カード情報の削除に失敗しました。後ほど再試行してください。");
                });
        }
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200" onMouseDown={handleModalClick}>
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] relative flex flex-col animate-in zoom-in-95 duration-200">
                {/* 閉じるボタン (右上に配置してモダンに) */}
                <button
                    onClick={Close}
                    disabled={isSubmitting}
                    className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500 z-10 disabled:opacity-50"
                    aria-label="閉じる"
                >
                    <X size={20} />
                </button>

                <div className="p-6 sm:p-8 overflow-y-auto flex-1">
                    {mode === MODE.CARD && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900 pr-8">クレジットカード情報の登録</h2>
                            <PaymentForm
                                applicationId="sandbox-sq0idb-yy0CGDaAdgYJQzH0n8Uj4A"
                                locationId="LN0P8AEE480X5"
                                cardTokenizeResponseReceived={({ token, verificationToken }) => {
                                    saveCard(token, verificationToken);
                                }}
                            >
                                <CreditCard />
                            </PaymentForm>
                        </div>
                    )}

                    {mode === MODE.Customer && (
                        <div className="flex flex-col h-full max-h-[75vh]">
                            {/* ヘッダー */}
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                <h2 className="text-xl font-bold text-gray-900 mx-auto mb-0">支払先住所</h2>
                            </div>

                            {/* 住所リストエリア (スクショの薄グレーの枠) */}
                            <div className="flex-1 overflow-y-auto bg-gray-50/50 border border-gray-100 rounded-3xl p-4 space-y-4 custom-scrollbar min-h-[300px]">
                                {address.map((item) => (
                                    <label
                                        key={item.id}
                                        className={`group cursor-pointer flex items-start p-5 bg-white border-2 rounded-2xl shadow-sm transition-all active:scale-[0.98] ${selectAddressID === item.id
                                            ? "border-black ring-1 ring-black"
                                            : "border-transparent hover:border-gray-200"
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="address"
                                            className="mt-1 h-5 w-5 accent-black shrink-0 cursor-pointer"
                                            checked={selectAddressID === item.id}
                                            onChange={() => setSelectAddressID(item.id)}
                                        />
                                        <div className="ml-4 w-full text-left">
                                            <div className="font-bold text-gray-900 text-lg mb-1">{item.name}</div>
                                            <div className="text-xs text-gray-400 font-medium mb-2 tracking-tighter">
                                                〒{item.post_code}
                                            </div>
                                            <div className="text-sm text-gray-600 leading-relaxed font-medium">
                                                {item.pref} {item.address1} {item.address2} {item.address3}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            {/* 下部固定エリア：デフォルト設定と保存ボタン */}
                            <div className="shrink-0 pt-6 space-y-4">
                                <label className="flex items-center gap-4 p-5 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                                    <input
                                        type="checkbox"
                                        checked={makeDefault}
                                        onChange={(e) => setMakeDefault(e.target.checked)}
                                        className="h-6 w-6 accent-black rounded-lg border-gray-300 cursor-pointer"
                                    />
                                    <span className="text-sm font-bold text-gray-800">
                                        このカードをデフォルトにする
                                    </span>
                                </label>

                                <LoadingButton
                                    onClick={saveAddress}
                                    loading={isSubmitting}
                                    className="w-full py-4.5 bg-black hover:bg-gray-800 text-white font-bold rounded-2xl shadow-lg disabled:bg-gray-200 disabled:text-gray-400 transition-all flex items-center justify-center gap-2 text-base"
                                >
                                    <Save size={20} />
                                    保存して終了
                                </LoadingButton>
                            </div>
                        </div>
                    )}

                    {mode === MODE.Delete && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900 pr-8">
                                お支払い方法を削除
                            </h2>

                            {id === defaultCard ? (
                                <div className="rounded-xl bg-red-50 p-5 border border-red-200">
                                    <p className="text-sm font-bold text-red-600 text-center leading-relaxed">
                                        デフォルトの支払い方法は削除できません。<br />
                                        デフォルトを変更してから再度お試しください。
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-xl bg-gray-50 p-5 border border-gray-200 text-center">
                                    <p className="text-sm font-bold text-gray-700 leading-relaxed">
                                        本当にこのカードを削除しますか？<br />
                                        <span className="text-xs text-gray-500 font-normal">削除後は再度の登録が必要になります。</span>
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3 pt-2">
                                {id !== defaultCard && (
                                    <LoadingButton
                                        onClick={handleDelete}
                                        loading={isSubmitting}
                                        className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={18} />
                                        削除する
                                    </LoadingButton>
                                )}

                                <button
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all disabled:opacity-50"
                                >
                                    キャンセル
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SquarePayment;