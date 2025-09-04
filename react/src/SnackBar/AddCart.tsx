// components/CartAddBar.tsx
import React from 'react';
import { Content } from '../types/Content';

type CartAddBarProps = {
    visible: boolean;
    message?: string;
    onClose: () => void;
    onViewCart: () => void;
    item?: Content | null; // カートに追加されたアイテム情報
};

export const CartAddBar: React.FC<CartAddBarProps> = ({
    visible,
    message = "カートに商品を追加しました！",
    onClose,
    onViewCart,
    item
}) => {
    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full z-50">
            <div className="m-4 px-6 py-4 bg-white border border-gray-300 rounded-lg shadow-lg flex justify-between items-center max-w-2xl mx-auto">
                <span className="text-sm text-gray-800">{message}</span>
                {item && (
                    <div className="flex items-center gap-4">
                        <img src={item.main_image_url} alt={item.name} className="w-12 h-12 object-cover rounded" />
                        <span className="text-sm text-gray-800">{item.name}</span>
                    </div>
                )}
                <div className="flex gap-2 ml-4">
                    <button
                        onClick={onViewCart}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        カートを見る
                    </button>
                    <button
                        onClick={onClose}
                        className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                        閉じる
                    </button>
                </div>
            </div>
        </div>
    );
};
