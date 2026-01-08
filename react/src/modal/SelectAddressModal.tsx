import React, { useEffect } from "react";
import { createPortal } from "react-dom";

import EditAddress from "../modal/EditAddress";
import api from "../conf/api";
import { Address } from "../types/Content";

type Props = {
    isOpen: boolean;
    onClose: () => void;

    // 親で選択を受け取りたいなら使う（不要なら消してOK）
    onSelect?: (address: Address) => void;
};

const SelectAddressModal: React.FC<Props> = ({ isOpen, onClose, onSelect }) => {
    const [address, setAddress] = React.useState<Address[]>([]);
    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
    const [selectedAddress, setSelectedAddress] = React.useState<Address>({} as Address);

    useEffect(() => {
        if (!isOpen) return;

        // モーダル開いた時だけ取得
        GetAddressList();

        // スクロール固定（任意）
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, onClose]);

    const GetAddressList = () => {
        api
            .post("/address/list")
            .then((res) => {
                const newAddress = res.data.address || [];
                setAddress(newAddress);

                const defaultAddress = newAddress.find((addr: Address) => addr.status === 1);
                if (defaultAddress) setSelectedAddress(defaultAddress);
                else if (newAddress[0]) setSelectedAddress(newAddress[0]);
            })
            .catch((err) => {
                console.error("住所一覧エラー:", err);
            });
    };

    const handleUseAddress = (item: Address) => {
        localStorage.setItem("selectedAddress", JSON.stringify(item));
        onSelect?.(item);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            {/* ここをクリックした時は閉じない */}
            <div
                className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ヘッダー */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-bold text-gray-900">アドレス帳</h2>
                    <button
                        onClick={onClose}
                        className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200"
                    >
                        閉じる
                    </button>
                </div>

                {/* 本体 */}
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {/* 編集モーダル（住所編集） */}
                    {isEditModalOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
                            <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-y-auto max-h-[90vh] p-6">
                                <EditAddress
                                    setAddress={setAddress}
                                    address={selectedAddress}
                                    isOpen={isEditModalOpen}
                                    onClose={() => {
                                        setIsEditModalOpen(false);
                                        GetAddressList();
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap justify-center gap-4">
                        {/* 新規追加 */}
                        <div
                            onClick={() => {
                                setSelectedAddress({} as Address);
                                setIsEditModalOpen(true);
                            }}
                            className="w-full h-[100px] cursor-pointer flex flex-col items-start p-4 bg-white border rounded-lg shadow-sm hover:bg-gray-100 transition"
                        >
                            <p className="text-gray-500">新しいお届け先を追加</p>
                        </div>

                        {/* 住所一覧 */}
                        {address.map((item) => (
                            <div
                                key={item.id}
                                className="w-full flex flex-col items-start p-4 bg-white border rounded-lg shadow-sm space-y-2"
                            >
                                <label
                                    htmlFor={`address-${item.id}`}
                                    className="w-full cursor-pointer flex flex-row items-center space-x-4 hover:bg-gray-100 transition p-2 rounded-lg"
                                >
                                    <input
                                        id={`address-${item.id}`}
                                        type="radio"
                                        name="address"
                                        value={item.id}
                                        checked={selectedAddress?.id === item.id}
                                        onChange={() => setSelectedAddress(item)}
                                        className="w-5 h-5 accent-blue-600"
                                    />

                                    <div className="flex-1 text-left space-y-1">
                                        <div className="font-semibold">{item.name}</div>
                                        <div className="text-sm">{item.phone}</div>
                                        <div className="text-sm">{item.post_code}</div>
                                        <div className="text-sm">
                                            {item.pref}
                                            {item.address1}
                                            {item.address2 && <>{item.address2}</>}
                                            {item.address3 && <>{item.address3}</>}
                                        </div>
                                    </div>
                                </label>

                                {selectedAddress?.id === item.id && (
                                    <div className="flex flex-col items-center space-y-2 mt-2 w-full">
                                        <button
                                            onClick={() => handleUseAddress(item)}
                                            className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                        >
                                            この住所を使う
                                        </button>

                                        <button
                                            onClick={() => setIsEditModalOpen(true)}
                                            className="w-full px-4 py-2 text-sm bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                                        >
                                            編集する
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SelectAddressModal;
