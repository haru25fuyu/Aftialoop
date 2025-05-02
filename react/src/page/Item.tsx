import React, { useEffect, useState } from 'react';

import { useLocation } from 'react-router-dom';

import { Header } from '../component/Header';
import { Footer } from '../component/Footer.tsx';
import DirectCheckoutModal from '../component/DirectCheckoutModal';

import { Content } from '../types/Content';

import api from '../conf/api';

const AddlocalCart = (item: Content) => {
    const cart: Content[] = JSON.parse(localStorage.getItem('cart') || '[]');

    const existingIndex = cart.findIndex((cartItem) => cartItem.id === item.id);

    if (existingIndex !== -1) {
        // すでにあれば quantity を増やす
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
    } else {
        // なければ quantity: 1 をつけて追加
        cart.push({ ...item, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
};

const Item: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [selectQuantity, setSelectQuantity] = useState(1);
    const [item, setItem] = useState<Content>({
        id: '0',
        name: "テスト",
        discription: "テストの商品",
        price: 1000,
        point: 500,
        image_url: "/data/IMG_3589.JPG",
        quantity: 10,
    });
    const location = useLocation();
    useEffect(() => {
        // URL から ID を取得

        const params = new URLSearchParams(location.search);
        const id = params.get('id');
        if (!id) {
            console.error("IDが取得できませんでした。");
            return;
        }
        setItem({
            id: "1",
            name: "テスト",
            discription: "テストの商品",
            price: 1000,
            point: 500,
            image_url: "/data/IMG_3589.JPG",
            quantity: 10,
        });
        console.log(id);
        // 商品情報を取得するAPIを呼び出す
        // api.post('/item/get', { id: id })
        //     .then((res) => {
        //         console.log(res.data);
        //         // 商品情報を表示する処理を追加
        //     })
        //     .catch((err) => {
        //         console.error(err);
        //     });

    }, []);

    //数量が変更されたときの処理
    const handleQuantityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value, 10);
        if (!isNaN(value) && value > 0 && value <= item.quantity!) {
            setSelectQuantity(value);
        } else {
            setSelectQuantity(1); // デフォルト値に戻す
        }
    };


    const AddCart = () => {
        var addItem = item;
        addItem.quantity = selectQuantity; // 選択した数量をセット
        console.log(addItem);
        // カートに商品を追加する処理を実装
        //　ローカルストレージにトークンが保存されているか確認
        const token = localStorage.getItem('token');
        if (!token) {
            AddlocalCart(item);
        } else {
            // APIを呼び出してカートに追加する処
            // 
            // 理を実装            
            api.post('/cart/add', { item })
                .then((res) => {
                    console.log("カートに追加しました:", res.data);
                })
                .catch((err) => {                    
                    console.error(err);
                    AddlocalCart(item);
                });
        }
        console.log("カートに追加");
    };

    const Purchase = () => {
        // 購入手続きへ遷移する処理を実装
        console.log("購入手続きへ遷移");
    };
    return (
        <div>
            <header>
                <Header />
            </header>

            <main>
                <h1>商品詳細</h1>
                <div className='item-detail'>
                    <img src="/data/IMG_3589.JPG" alt="商品画像" />
                    <div className='item-info'>
                        <h2>{item.name}</h2>
                        <p>{item.discription}</p>
                        <p>価格: ¥{item.price}</p>
                        <p>ポイント: {item.point}</p>
                        {//ポイント決済の見せ方を考える
                        }
                        <p>在庫: {item.quantity}</p>
                        数量：<input type="number" min="1"  max={item.quantity} defaultValue="1" id="quantityInput" onChange={handleQuantityChange} /> 
                        <button onClick={() => { AddCart(); }}>カートに入れる</button>
                        <button onClick={() => { setShowModal(true); Purchase(); }}>購入手続きへ</button>
                    </div>
                </div>
                <div className='item-reviews'>
                    <h2>レビュー</h2>
                    <div className='review-item'>
                        <p>ユーザー名</p>
                        <p>レビュー内容</p>
                    </div>
                </div>
                {// 横スライダーで類似商品を表示 (予定)
                }

                <DirectCheckoutModal
                    item={item}
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                />
            </main>


            <footer>
                <Footer />
            </footer>
        </div>
    );
};

export default Item;