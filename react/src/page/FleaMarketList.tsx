import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { FleaListContent } from '../types/Content.ts';

import Header from '../component/Header.tsx';
import MainImage from '../component/MainImage.tsx';

import api from '../conf/api.ts';
import { CONFIG } from '../conf/config.ts';

import '../css/List.css';


const FleaMarketList: React.FC = () => {
    //const search = useLocation().search;
    //const query = new URLSearchParams(search);
    //const type = query.get('type');
    const [contents, setContents] = React.useState<FleaListContent[]>([]);

    useEffect(() => {
        api.post(`/flea-market/list`)
            .then((res) => {
                setContents(res.data);
                console.log(res.data);
            }).catch((err) => {
                console.error(err);
            });
    }, []);
    return (
        <div>
            <header>
                <Header />
                {/*<MainImage image={"/data/IMG_3589.JPG"} title={"GOODS LIST"} />*/}
            </header>
            <main className="w-full">
                <div className="w-[94%] mx-auto grid grid-cols-1 lg:grid-cols-[240px,minmax(0,1fr)] gap-6">

                    {/* サイドバー（PCのみ） */}
                    <aside className="hidden lg:block">
                        <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3 text-sm">
                            <h2 className="font-semibold mb-2">絞り込み一覧</h2>
                            {/* タイプ・価格・地域フィルタなど */}
                        </div>
                    </aside>

                    {/* 商品グリッド */}
                    <section>
                        <div className="grid grid-cols-3 gap-2 md:grid-cols-4 xl:grid-cols-5">
                            {contents.map((item) => (
                                <a
                                    key={item.id}
                                    href={`/item/${item.id}`}
                                    className="block border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                >
                                    {/* 画像 */}
                                    <img
                                        src={
                                            item.main_image_url
                                                ? CONFIG.BASE_URL + item.main_image_url
                                                : "/data/noimage.png"
                                        }
                                        alt={item.name}
                                        className="w-full aspect-[11/12] object-cover"
                                    />

                                    {/* 下部：アイコン + テキストブロック */}
                                    <div className="p-2 flex gap-2">
                                        {/* 出品者アイコン */}
                                        <img
                                            src={
                                                item.seller_icon_url
                                                    ? CONFIG.BASE_URL + item.seller_icon_url + "?t=" + new Date().getTime()
                                                    : "/data/noicon.png"
                                            }
                                            alt={item.seller_name}
                                            className="w-6 h-6 rounded-full object-cover shrink-0"
                                        />

                                        {/* 商品名 & 価格 */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                                                {item.name}
                                            </h3>

                                            <p className="text-red-600 font-bold mt-1 text-sm">
                                                {item.price.toLocaleString()}円
                                            </p>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default FleaMarketList;