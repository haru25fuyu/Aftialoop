import React, { useState, useEffect } from "react";
import { PaymentForm, CreditCard } from "react-square-web-payments-sdk";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel, Scrollbar, FreeMode } from "swiper/modules";
import "swiper/swiper-bundle.css";

import api from "../conf/api";
import axios from "axios";

import { Address } from '../types/Content';
import { Payment } from '../types/Content';



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
    if (!isOpen) return null; // Ensure the component returns null when not open
    const [address, setAddress] = React.useState<Address[]>([])
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [mode, setMode] = useState(MODE.Customer);
    const [cardId, setCardId] = useState<string | null>(null);
    const [defaultCard, setDefaultCard] = useState<string | null>(null);
    const [selectAddressID, setSelectAddressID] = useState<string | null>(null);
    const [makeDefault, setMakeDefault] = useState(false);
    const [created, setCreated] = useState(false);

    const navigate = useNavigate();


    useEffect(() => {
        //ユーザーチェック
        const token = localStorage.getItem("token");
        if (!token || token === "undefined") {
            navigate("/login");
        }
        console.log("id:", id);
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

                    console.log("住所一覧取得:", address);
                })
                .catch((err) => {
                    console.error("住所一覧エラー:", err);
                });

            api.post("/api/card/address/get", { cardId: id })
                .then((res) => {
                    console.log(res.data);
                    setSelectAddressID(res.data.address.ID);
                }
                )
                .catch((err) => {
                    console.error(err);
                }
                );
        }

        //APIdで顧客IDを取得
        api.post("/customer/data",)
            .then((res) => {
                console.log(res.data);
                setCustomerId(res.data.user.id);
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

    }, []);


    // axios を使用したカード情報保存処理
    const saveCard = async (token: any, verificationToken: any) => {
        console.log("トークン:", token);
        if (!token || token === "undefined") {
            alert("カード入力に問題があります。全ての項目を正しく入力してください。");
            return;
        }
        try {
            const response = await api.post("/api/card/save", { token: token, customerId: customerId, verificationToken: verificationToken });

            setMode(MODE.Customer);
            setCardId(response.data.card);
            // レスポンスが正常であれば 成功メッセージを表示
            console.log("カード保存成功:", response.data);
            setCreated(true);
            api.post('/address/list')
                .then((res) => {

                    setAddress(res.data.address || []);

                    console.log("住所一覧取得:", address);
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

    //カードに住所を登録
    const saveAddress = async () => {
        if (!selectAddressID) {
            alert("住所が選択されていません。");
            return;
        }
        try {
            const response = await api.post("/api/card/address", { address: selectAddressID, cardId: cardId });

            // レスポンスが正常であれば 成功メッセージを表示
            console.log("住所登録成功:", response.data);
            setPayments(response.data.card);
            if (makeDefault) {
                const res = await api.post("/api/card/default", { cardID: cardId });
                setPayments(res.data.card);
            }

            onClose();
        } catch (error) {
            // axios ではエラーが出た場合、response でエラーの詳細にアクセスできます
            if (axios.isAxiosError(error)) {
                console.error("Axiosエラー:", error.response?.data || error.message);
            } else {
                console.error("保存エラー:", error);
            }
            alert("住所保存に失敗しました。後ほど再試行してください。");
        }
    }

    //モーダルの外側をクリックしたときにモーダルを閉じる
    const handleModalClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {

            onClose();
        }
    };

    const Close = () => {
        if (mode === MODE.Customer && created) {
            // カード情報が登録されている場合、カード情報を削除
            api.post("/api/card/delete", { cardId: cardId })
                .then((res) => {
                    console.log(res.data);
                    setPayments(res.data.card);
                })
                .catch((err) => {
                    console.error(err);
                    alert("カード情報の削除に失敗しました。後ほど再試行してください。");
                });
        };
        onClose();
    }

    return (
        <>
            {/* 閉じるボタンを左上に配置 */}
            <button
                onClick={Close}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 transition"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            <div className="space-y-6" onClick={handleModalClick}>
                {mode === MODE.CARD && (
                    <>
                        <h2 className="text-2xl font-bold text-center text-gray-900">クレジットカード情報の登録</h2>
                        <PaymentForm
                            applicationId="sandbox-sq0idb-7ZT3Ftv3F_58OmL_12N_yg"
                            locationId="LJ05QCSPT544X"
                            cardTokenizeResponseReceived={(token, verificationToken) => {
                                saveCard(token, verificationToken);
                            }}
                        >
                            <CreditCard />

                        </PaymentForm>
                    </>
                )}
                {mode === MODE.Customer && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-center text-gray-900">
                            支払先住所
                        </h2>

                        <div className="h-[400px] overflow-hidden">
                            <Swiper
                                modules={[Mousewheel, Scrollbar, FreeMode]}
                                className="swiper-container"
                                direction="vertical"
                                spaceBetween={0}
                                slidesPerView="auto"
                                freeMode={true}
                                mousewheel={true}
                                scrollbar={{ draggable: true }}
                                loop={false}
                                speed={500}
                            >
                                {address.map((item, index) => (
                                    <SwiperSlide className="swiper-slide !w-full !h-auto" key={item.ID} >
                                        <label
                                            key={item.ID}
                                            className="cursor-pointer flex items-center p-2 w-[300px] bg-white border rounded-lg shadow-sm hover:bg-gray-100 transition space-x-4"
                                        >
                                            <input
                                                type="radio"
                                                name="address"
                                                value={index}
                                                className="mt-1"
                                                checked={selectAddressID === item.ID}
                                                onChange={() => {
                                                    setSelectAddressID(item.ID);
                                                }}
                                            />
                                            <div className="w-full text-left space-y-1">
                                                <div className="font-semibold">{item.Name}</div>
                                                <div className="text-sm">{item.Phone}</div>
                                                <div className="text-sm">{item.PostCode}</div>
                                                <div className="text-sm">{item.Pref}</div>
                                                <div className="text-sm">{item.Address1}</div>
                                                {item.Address2 && <div className="text-sm">{item.Address2}</div>}
                                                {item.Address3 && <div className="text-sm">{item.Address3}</div>}
                                            </div>
                                        </label>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="makeDefault"
                                checked={makeDefault}
                                onChange={(e) => setMakeDefault(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                            />
                            <label htmlFor="makeDefault" className="text-sm text-gray-700">
                                このカードをデフォルトにする
                            </label>
                        </div>
                        <button
                            onClick={() => saveAddress()}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            保存して終了
                        </button>
                    </div>
                )}
                {mode === MODE.Delete && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-center text-gray-900">
                            お支払い方法を削除
                        </h2>

                        {id === defaultCard ? (
                            <div className="rounded-md bg-red-50 p-4 border border-red-200">
                                <p className="text-sm text-red-600 text-center">
                                    デフォルトの支払い方法は削除できません。<br />
                                    デフォルトを変更してから再度お試しください。
                                </p>
                            </div>
                        ) : (
                            <p className="text-center text-gray-700 text-sm">
                                本当に削除しますか？<br />
                                削除後は再度の登録が必要です。
                            </p>
                        )}

                        <div className="space-y-2">
                            {id !== defaultCard && (
                                <button
                                    onClick={() => {
                                        api
                                            .post("/api/card/delete", { cardId: id })
                                            .then((res) => {
                                                console.log(res.data);
                                                setPayments(res.data.card);
                                                alert("削除が完了しました。");
                                                onClose();
                                            })
                                            .catch((err) => {
                                                console.error(err);
                                                alert("削除に失敗しました。後ほど再試行してください。");
                                            });
                                    }}
                                    className="w-full px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    削除する
                                </button>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                )}
            </div >
        </>
    );
};

export default SquarePayment;
