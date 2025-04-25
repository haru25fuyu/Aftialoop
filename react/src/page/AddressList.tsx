import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';

import { Header } from '../component/Header';
import { AddressContent } from '../component/Content';

import EditAddress from '../modal/EditAddress';

import api from '../conf/api';
import { Address } from '../types/Content';

const AddressList: React.FC = () => {
    const { register, handleSubmit, setValue, formState: { errors } } = useForm<Address>();
    const navigate = useNavigate();
    const [address, setAddress] = React.useState<Address[]>([])
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [selectedAddressId, setSelectedAddressId] = React.useState<number | null>(null);

    useEffect(() => {
        api.get('/address/list')
            .then((res) => {
                setAddress(res.data.address);
                console.log("住所一覧取得:", address);
            })
            .catch((err) => {
                console.error("住所一覧エラー:", err);
            });
    }, []);

    return (
        <div>
            {isModalOpen && (
                <EditAddress
                    initialId={selectedAddressId}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
            <header>
                <Header />
            </header>
            <main>
                <div className="flex justify-center items-center mt-8 max-md:mt-0">
                    <div className="w-full max-w-md p-5space-y-6 bg-white rounded shadow-md">
                        <h2 className="text-2xl font-bold text-center text-gray-900">お届け先の設定</h2>
                        <div className="space-y-6">
                            <div className="contents-list flex flex-wrap justify-center gap-4">
                                <div
                                    onClick={() => navigate(`/address/edit`)}
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
                                            setSelectedAddressId(item.ID);
                                            setIsModalOpen(true);
                                        }}
                                        className="cursor-pointer contents_item flex flex-col items-start text-left h-[280px] overflow-hidden hover:bg-gray-100 transition"
                                    >
                                        <div className="flex flex-col items-start">
                                            <p>{item.Name}</p>
                                            <p>{item.Phone}</p>
                                            <p>{item.PostCode}</p>
                                            <b>{item.Pref}</b>
                                            <p>{item.Address1}</p>
                                            <p>{item.Address2}</p>
                                            <p>{item.Address3}</p>
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