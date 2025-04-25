import React, { useState, useEffect } from 'react';
import { set, useForm } from 'react-hook-form';
import { useNavigate, Link, useLocation } from 'react-router-dom';

import { Header } from '../component/Header';
import { Content } from '../types/Content';
import { ContentsList } from '../component/ContentsList';
import BasicContent from '../component/Content';

import api from '../conf/api';


const Cart: React.FC = () => {
    const { register, handleSubmit, formState: { errors } } = useForm<Inputs>();
    const navigate = useNavigate();
    const location = useLocation();
    const [cart, setCart] = useState<Content[]>(JSON.parse(localStorage.getItem('cart') || '[]'));
    const [totalPrice, setTotalPrice] = useState(0);
    const [totalPoints, setTotalPoints] = useState(0);
    const [point, setPoint] = useState(0);

    useEffect(() => {
        //　トークンが存在するか確認
        const token = localStorage.getItem('token');
        if (!token) {
            const storedCart = localStorage.getItem('cart');
            if (storedCart) {
                setCart(JSON.parse(storedCart));
            }
        } else {
            // トークンが存在する場合、APIを呼び出してカート情報を取得する処理を追加
            api.post('/cart/get', { token: token })
                .then((res) => {
                    console.log(res.data);
                    if (res.data.cart) {
                        setCart(res.data.cart);
                        setPoint(res.data.point);
                        //　トークン保存
                        localStorage.setItem('token', res.data.token);
                        // ローカルストレージのカート情報は削除
                        localStorage.removeItem('cart');
                    }
                })
                .catch((err) => {
                    console.error(err);
                });
        }

        // 合計金額とポイントを計算する処理を追加
        setTotalPrice(cart.reduce((acc, item) => acc + item.price * (item.quantity || 1), 0));
        setTotalPoints(cart.reduce((acc, item) => acc + item.point * (item.quantity || 1), 0));
    }, [cart]);

    const onSubmit = async () => {
        //　チェックアウトとしてローカルストレージに保存
        localStorage.setItem('checkout', JSON.stringify(cart));
        //　カートを空にする
        localStorage.removeItem('cart');
        //　チェックアウト画面に遷移
        navigate('/checkout');
    };
    return (
        <div>
            <header>
                <Header />
            </header>

            <div className="flex justify-center items-center mt-8 max-md:mt-0">
                <div className="w-full max-w-md p-5 space-y-6 bg-white rounded shadow-md">
                    <h2 className="text-2xl font-bold text-center text-gray-900">買い物かご</h2>
                    <div className="flex flex-col items-center space-y-4">
                        <ContentsList
                            contents={cart}
                            Component={BasicContent}
                            slider={false}
                            vertical={true}
                            show_num={3}
                        />
                    </div>
                    <div className="flex justify-center mt-4">
                        <p className="text-lg font-semibold">合計金額: ¥{totalPrice}</p>
                        <p className="text-lg font-semibold ml-4">合計ポイント: {totalPoints}pt</p>
                        所持ポイント: {point}pt
                    </div>
                    <div className="flex justify-center mt-4 space-x-4">
                        <button
                            type="button"
                            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                            onClick={handleSubmit(onSubmit)}
                        >
                            購入手続きへ進む
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;