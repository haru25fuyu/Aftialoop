import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';

import { Header } from '../component/Header';

import EditAddress from '../modal/EditAddress';

import api from '../conf/api';
import { Address } from '../types/Content';

const AddressList: React.FC = () => {
    const [address, setAddress] = React.useState<Address[]>([])
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [selectedAddress, setSelectedAddress] = React.useState<Address>({} as Address);

    useEffect(() => {
        api.post('/address/list')
            .then((res) => {

                setAddress(res.data.address || []);

                console.log("住所一覧取得:", address);
            })
            .catch((err) => {
                console.error("住所一覧エラー:", err);
            });
    }, []);

    return (
        <div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-y-auto max-h-screen p-6">
                        <EditAddress
                            setAddress={setAddress}
                            address={selectedAddress}
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                        />
                    </div>
                </div>
            )}
            <header>
                <Header />
            </header>
            <main>
                <div className="flex justify-center items-center mt-8 max-md:mt-0">
                    <div className="w-full max-w-md p-5space-y-6 bg-white rounded shadow-md">
                        <h2 className="text-2xl font-bold text-center text-gray-900">アドレス帳</h2>
                        <div className="space-y-6">
                            <div className="contents-list flex flex-wrap justify-center gap-4">
                                <div
                                    onClick={() => {
                                        setSelectedAddress({} as Address);
                                        setIsModalOpen(true);
                                    }}
                                    className="cursor-pointer contents_item flex flex-col items-start text-left h-[280px] overflow-hidden hover:bg-gray-100 transition"
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
                                            setIsModalOpen(true);
                                        }}
                                        className="cursor-pointer flex flex-col items-start p-4 bg-white border rounded-lg shadow-sm hover:bg-gray-100 transition"
                                    >
                                        <div className="w-full text-left space-y-1">
                                            <div className="font-semibold">{item.Name}</div>
                                            <div className="text-sm">{item.Phone}</div>
                                            <div className="text-sm">{item.PostCode}</div>
                                            <div className="text-sm">{item.Pref}</div>
                                            <div className="text-sm">{item.Address1}</div>
                                            {item.Address2 && <div className="text-sm">{item.Address2}</div>}
                                            {item.Address3 && <div className="text-sm">{item.Address3}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                        <hr />
                    </div>
                </div>
            </main >
        </div>

    );
};

export default AddressList;