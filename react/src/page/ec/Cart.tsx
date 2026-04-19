import React, { useState, useEffect } from 'react';
//import {  useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Header } from '../../component/Header';
import { Content } from '../../types/Content';
import { ContentsList } from '../../component/ContentsList';
import { CartContent } from '../../component/Content';

import api,{getAccessToken} from '../../conf/api';
//import { Input } from '../types/Input';


const Cart: React.FC = () => {
    //const { handleSubmit } = useForm<Inputs>();
    const navigate = useNavigate();
    //const location = useLocation();
    const [cart, setCart] = useState<Content[]>(JSON.parse(localStorage.getItem('cart') || '[]'));
    const [totalPrice, setTotalPrice] = useState(0);
    const [totalPoints, setTotalPoints] = useState(0);
    const [point, setPoint] = useState(0);

    useEffect(() => {
        // トークンが存在するか確認
        const token = getAccessToken();
        if (!token) {
            const storedCart = localStorage.getItem('cart');
            if (storedCart) {
                setCart(JSON.parse(storedCart));
            }
        } else {
            //ローカルストレージにカート情報がある場合はそれを追加する
            const storedCart = localStorage.getItem('cart');
            if (storedCart) {
                const localCart: Content[] = JSON.parse(storedCart);
                // ローカルストレージのカート情報をサーバーに送信
                api.post('/cart/add', localCart)
                    .then(() => {
                        // 2. ローカルのデータはもう不要
                        localStorage.removeItem('cart');
                    })
                    .catch((err) => {
                        console.error(err);
                    });
                setCart(localCart);
            }

            // トークンが存在する場合、APIを呼び出してカート情報を取得する処理を追加
            api.post('/cart',)
                .then((res) => {
                    console.log("カート情報:", res.data);
                    if (res.data) {
                        setCart(res.data.cart || []);
                        setPoint(res.data.point);
                        // ローカルストレージのカート情報は削除
                        localStorage.removeItem('cart');
                    }
                })
                .catch((err) => {
                    console.error(err);
                });
        }

    }, []);

    // 2. cart が変わったら計算する（別useEffectにする！）
    useEffect(() => {
        if (!cart || cart.length === 0) return;

        const totalPrice = cart
            .filter(item => item.is_selected)
            .reduce((acc, item) => {
                const qty = item.quantity ?? 1;
                const price = Number(item.price) || 0;
                return acc + price * qty;
            }, 0);

        const totalPoints = cart
            .filter(item => item.is_selected)
            .reduce((acc, item) => {
                const qty = item.quantity ?? 1;
                const point = Number(item.point) || 0;
                return acc + point * qty;
            }, 0);

        setTotalPrice(totalPrice);
        setTotalPoints(totalPoints);
    }, [cart]); // ← cart が変わったときだけ再計算

    const handleQuantityChange = (item: Content) => {

        // 数量を変更する処理
        if (!item || !item.id) {
            console.error("無効なアイテム:", item);
            return;
        }

        console.log("数量XXS:", item);
        api.post('/cart/edit', item)
            .then((res) => {
                console.log("数量更新:", res.data);
                // 更新後のカート情報を取得
                const updatedCart = res.data || [];
                setCart(updatedCart);
            }
            )
            .catch((err) => {
                console.error("数量更新エラー:", err);
            }
            );
    };

    const onSubmit = async () => {
        // チェックアウトとしてローカルストレージに保存
        const selectedItems = cart.filter(item => item.is_selected);
        localStorage.setItem('checkout', JSON.stringify(selectedItems));
        // カートを空にする
        localStorage.removeItem('cart');
        // チェックアウト画面に遷移
        navigate('/checkout');
    };
    return (
        <div>
            {/* 固定ヘッダー */}
            <header className="fixed top-0 left-0 w-full z-50 bg-white shadow">
                <Header />
            </header>

            {/* タイトル：買い物かご */}
            <div className="fixed top-[64px] w-full z-40 bg-white border-b px-6 py-3 shadow">
                <h2 className="text-2xl font-bold text-center text-gray-900">買い物かご</h2>
            </div>

            {/* メインボディ */}
            <main className="pt-[128px] pb-[220px] w-full max-w-3xl mx-auto px-4">
                <ContentsList
                    contents={cart}
                    Component={(props) => <CartContent {...props} function={handleQuantityChange} />}
                    slider={false}
                    vertical={false}
                    show_num={1}
                    wrapperClassName='grid-cols-1'
                />
            </main>

            {/* 下固定 合計 & 購入ボタン */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t px-6 py-4 shadow-lg z-30">
                <div className="text-center space-y-1">
                    <p className="text-lg font-semibold">合計金額: ¥{totalPrice}</p>
                    <p className="text-lg font-semibold">合計ポイント: {totalPoints}pt</p>
                    <p className="text-sm text-gray-500">所持ポイント: {point}pt</p>
                </div>

                <button
                    type="button"
                    onClick={onSubmit}
                    className="mt-3 w-full px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                    購入手続きへ進む
                </button>
            </div>
        </div> 

    )
};

export default Cart;