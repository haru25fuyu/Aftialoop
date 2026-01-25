import React, { useEffect } from 'react';
import { Header } from '../component/Header';
import EditAddress from '../modal/EditAddress';
import api from '../conf/api';
import { Address } from '../types/Address';
import { Plus, MapPin, CheckCircle, Phone, Edit2 } from 'lucide-react'; // アイコン追加

const AddressList: React.FC = () => {
    const [address, setAddress] = React.useState<Address[]>([])
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [selectedAddress, setSelectedAddress] = React.useState<Address>({} as Address);

    useEffect(() => {
        GetAddressList();
    }, []);

    const GetAddressList = () => {
        api.post('/address/list')
            .then((res) => {
                setAddress(res.data.address || []);
            })
            .catch((err) => {
                console.error("住所一覧エラー:", err);
            });
    }

    // モーダルを閉じてデータを再取得する処理
    const handleCloseModal = () => {
        setIsModalOpen(false);
        GetAddressList();
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <Header />

            {/* モーダル */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <EditAddress
                            setAddress={setAddress}
                            address={selectedAddress}
                            isOpen={isModalOpen}
                            onClose={handleCloseModal}
                        />
                    </div>
                </div>
            )}

            <main className="max-w-3xl mx-auto p-4 space-y-6">
                <div className="flex items-center gap-2 mt-4 mb-6">
                    <MapPin className="text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-800">お届け先住所の管理</h1>
                </div>

                {/* --- 住所リスト (Grid Layout) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* 1. 新規追加カード (破線で目立たせる) */}
                    <button
                        onClick={() => {
                            setSelectedAddress({} as Address);
                            setIsModalOpen(true);
                        }}
                        className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-blue-300 rounded-xl bg-blue-50/50 text-blue-500 hover:bg-blue-50 hover:border-blue-500 hover:shadow-md transition gap-3 group"
                    >
                        <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition">
                            <Plus size={32} />
                        </div>
                        <span className="font-bold text-sm">新しいお届け先を追加</span>
                    </button>

                    {/* 2. 登録済み住所カード */}
                    {address.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => {
                                setSelectedAddress(item);
                                setIsModalOpen(true);
                            }}
                            className={`relative p-5 bg-white border rounded-xl shadow-sm hover:shadow-md hover:border-blue-400 transition cursor-pointer group flex flex-col justify-between
                                ${item.status ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-200"}
                            `}
                        >
                            {/* デフォルトバッジ */}
                            {item.status && (
                                <div className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle size={12} /> デフォルト
                                </div>
                            )}

                            {/* 住所情報 */}
                            <div className="space-y-3">
                                <div>
                                    <div className="text-xs text-gray-400 mb-0.5">お名前</div>
                                    <div className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                        {item.name}
                                        <Edit2 size={14} className="text-gray-300 group-hover:text-blue-500 transition" />
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-gray-400 mb-0.5">住所</div>
                                    <div className="text-sm text-gray-700 leading-relaxed">
                                        〒{item.post_code}<br />
                                        {item.pref} {item.address1}<br />
                                        {item.address2} {item.address3}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-2 rounded-lg">
                                    <Phone size={14} />
                                    <span>{item.phone}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default AddressList;