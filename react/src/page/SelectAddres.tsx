import React, { useEffect } from 'react';
//import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Header } from '../component/Header';

import EditAddress from '../modal/EditAddress';

import api from '../conf/api';
import { Address } from '../types/Content';
import { set } from 'react-hook-form';

const SelectAddress: React.FC = () => {
    const [address, setAddress] = React.useState<Address[]>([])
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [selectedAddress, setSelectedAddress] = React.useState<Address>({} as Address);
    const navigate = useNavigate();

    useEffect(() => {
        GetAddressList();
    }, []);

    const GetAddressList = () => {
        api.post('/address/list')
            .then((res) => {
                const newAddress = res.data.address || [];
                setAddress(newAddress);

                const defaultAddress = newAddress.find((addr: Address) => addr.Status === 1);
                if (defaultAddress) {
                    setSelectedAddress(defaultAddress);
                }
            })
            .catch((err) => {
                console.error("住所一覧エラー:", err);
            });
    }

    return (
        <div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="w-full max-w-full bg-white rounded-lg shadow-lg overflow-y-auto max-h-screen p-6">
                        <EditAddress
                            setAddress={setAddress}
                            address={selectedAddress}
                            isOpen={isModalOpen}
                            onClose={() => {
                                setIsModalOpen(false)
                                GetAddressList();
                            }}
                        />
                    </div>
                </div>
            )}
            <header>
                <Header />
            </header>
            <div className="w-full px-4 md:px-8 mt-8">
                <div className="w-full p-5 space-y-6 bg-white rounded shadow-md">
                    <h2 className="text-2xl font-bold text-center text-gray-900">アドレス帳</h2>
                    <div className="flex flex-wrap justify-center gap-4">
                        <div
                            onClick={() => {
                                setSelectedAddress({} as Address);
                                setIsModalOpen(true);
                            }}
                            className="w-full h-[100px] cursor-pointer flex flex-col items-start p-4 bg-white border rounded-lg shadow-sm hover:bg-gray-100 transition"
                        >
                            <div className="flex flex-col items-start">
                                <p className="text-gray-500">新しいお届け先を追加</p>
                            </div>
                        </div>
                        {address.map((item) => (
                            <div
                                key={item.ID}
                                onClick={() => {
                                    setSelectedAddress(item);
                                    //setIsModalOpen(true);
                                }}
                                className="w-full cursor-pointer flex flex-col items-start p-4 bg-white border rounded-lg shadow-sm hover:bg-gray-100 transition space-y-2"
                            >

                                {/* カード全体をクリックでラジオをトリガー */}
                                <label
                                    htmlFor={`address-${item.ID}`}
                                    className="w-full cursor-pointer flex flex-row items-center space-x-4 hover:bg-gray-100 transition p-2 rounded-lg"
                                >
                                    <input
                                        id={`address-${item.ID}`}
                                        type="radio"
                                        name="address"
                                        value={item.ID}
                                        checked={selectedAddress.ID === item.ID}
                                        onChange={() => setSelectedAddress(item)}
                                        className="w-5 h-5 accent-blue-600"
                                    />

                                    <div className="flex-1 text-left space-y-1">
                                        <div className="font-semibold">{item.Name}</div>
                                        <div className="text-sm">{item.Phone}</div>
                                        <div className="text-sm">{item.PostCode}</div>
                                        <div className="text-sm">{item.Pref}{item.Address1}{item.Address2 && <>{item.Address2}</>}{item.Address3 && <>{item.Address3}</>}</div>
                                    </div>
                                </label>
                                {selectedAddress?.ID === item.ID && (
                                    <div className="flex flex-col items-center space-y-2 mt-4 w-full">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log("この住所を使います:", item);
                                                // ローカルストレージに選択した住所を保存する処理を追加
                                                localStorage.setItem('selectedAddress', JSON.stringify(item));
                                                navigate('/checkout');
                                            }}
                                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                        >
                                            この住所を使う
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log("編集ボタン押された:", item);
                                                setIsModalOpen(true);
                                            }}
                                            className="px-4 py-2 text-sm bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                                        >
                                            編集する
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}


                    </div>
                    <hr />
                </div>
            </div>

        </div>

    );
};

export default SelectAddress;