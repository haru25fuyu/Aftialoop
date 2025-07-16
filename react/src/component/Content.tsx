import '../css/BasicContent.css';
import React from 'react';

import { Content } from '../types/Content';
import { useNavigate } from 'react-router-dom';

type Props = {
    item: Content;
    function: (item: Content) => void; // オプションの関数
};

const BasicContent: React.FC<Props> = ({ item }) => {
    const navigate = useNavigate();
    const navigator = (id: string) => {
        navigate("/payment?id=" + id);
    }
    return (
        <div
            key={item.id}
            className="contents_item flex flex-col items-center text-left h-[280px] overflow-hidden"
            onClick={() => navigator(item.id.toString())}
        >
            <h3 className="text-center">{item.name}</h3>
            <img src={item.main_image_url} alt={item.name} className="w-full max-w-xs h-[100px] object-contain" />
            <div className="w-full grid grid-cols-2 gap-2">
                <p className="text-gray-600">価格：</p>
                <p>{item.price}円</p>
                <p className="text-gray-600">ポイント：</p>
                <p>{item.point}</p>
            </div>

        </div>

    )

}

const LinkContent: React.FC<Props> = ({ item }) => {
    const navigate = useNavigate();
    const navigator = () => {
        navigate(item.main_image_url);
    }
    return (
        <div key={item.id} className="contents_item" onClick={() => navigator()}>
            {item.name}
        </div >
    )

}

const ImageContent: React.FC<Props> = ({ item }) => {
    return (
        <div key={item.id} className="flex flex-col items-start">
            <img src={item.main_image_url} alt={item.name} className="w-25 h-25 object-cover mb-4" />
            <div className="flex flex-col items-start">
                <b>{item.name}</b>
                <p>価格: {item.price}円</p>
                <p>ポイント: {item.point}</p>
            </div>
        </div>
    )
}

const CartContent: React.FC<Props> = ({ item, function: handleQuantityChange }) => {
    const navigate = useNavigate();
    const navigator = (id: string) => {
        navigate("/item?id=" + id);
    }
    const ChangeQuantity = (item: Content, quantity: number) => {
        if (quantity && quantity > 0) {
            item.quantity = quantity; // 数量を更新
            handleQuantityChange(item);
        } else {
            alert("数量は1以上を指定してください。");
        }
    }

    const ChangeCheck = (item: Content, is_selected: boolean) => {
        item.is_selected = is_selected; // チェック状態を更新
        handleQuantityChange(item);
    }

    return (
        <div
            key={item.id}
            className="w-full mx-auto relative flex items-center gap-6 p-6 shadow-md rounded-2xl bg-white transition hover:shadow-lg cursor-pointer"
        >
            {/* 左上：チェックボックス */}
            <input
                type="checkbox"
                checked={item.is_selected}
                onChange={(e) => ChangeCheck(item, e.target.checked)}
                className="absolute top-20 left-2 w-5 h-5"
            />

            {/* 左：画像 */}
            <div className="flex-shrink-0 w-40 h-40" onClick={() => navigator(item.id.toString())}>
                <img
                    src={item.main_image_url}
                    alt={item.name}
                    className="w-full h-full object-contain"
                />
            </div>

            {/* 右：情報 */}
            <div className="flex-1 flex flex-col justify-between space-y-2 text-gray-800">
                <div onClick={() => navigator(item.id.toString())}>
                    <h3 className="text-xl font-semibold">{item.name}</h3>
                </div>
                <p className="text-left">価格：<span className="font-medium">{item.price}円</span></p>
                <p className="text-left">ポイント：<span className="font-medium">{item.point}pt</span></p>
                <p className="text-left">
                    数量：
                    <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => ChangeQuantity(item, Number(e.target.value))}
                        className="w-16 ml-2 px-2 py-1 border border-gray-300 rounded text-right"
                    />
                </p>
            </div>
        </div>
    )

}

export default BasicContent;
export { LinkContent, ImageContent, CartContent };