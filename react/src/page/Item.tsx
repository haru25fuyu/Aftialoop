import React, { useEffect,useState } from 'react';

import { Link, useLocation } from 'react-router-dom';

import { Header } from '../component/Header';
import { Footer } from '../component/Footer.tsx';
import  DirectCheckoutModal  from '../component/DirectCheckoutModal';

import { Content } from '../types/Content';

const Item: React.FC = () => {
    const [showModal, setShowModal] = useState(false);
    const [item, setItem] = useState<Content>({
        id: 0,
        name: "テスト",
        discription: "テストの商品",
        price: 1000,
        point: 500,
        image_url: "/../data/IMG_3589.JPG"
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



    const AddCart = () => {
        // カートに商品を追加する処理を実装
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
                    <img src="/../data/IMG_3589.JPG" alt="商品画像" />
                    <div className='item-info'>
                        <h2>{item.name}</h2>
                        <p>{item.discription}</p>
                        <p>価格: ¥{item.price}</p>
                        <p>ポイント: {item.point}</p> 
                        {//ポイント決済の見せ方を考える
                        }
                        <p>在庫: 10</p>
                        <button onClick={AddCart}>カートに入れる</button>
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