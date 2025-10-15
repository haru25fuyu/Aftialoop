import React, { useEffect } from 'react';

import { Content } from '../types/Content.ts';

import Header from '../component/Header.tsx';
import MainImage from '../component/MainImage.tsx';

import api from '../conf/api.ts';
import { CONFIG } from '../conf/config.ts';

import '../css/List.css';


const FleaMarketList: React.FC = () => {
    //const search = useLocation().search;
    //const query = new URLSearchParams(search);
    //const type = query.get('type');
    const [contents, setContents] = React.useState<Content[]>([]);

    useEffect(() => {
        api.post(`/flea-market/list`)
            .then((res) => {
                setContents(res.data);
                console.log(contents[0]?.is_selected);
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
            <main className=" w-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-[90%] mx-auto">
                    {contents.map((item) => (
                        console.log(item.main_image_url),
                        <div
                            key={item.id}
                            className="flex flex-row md:flex-col border rounded shadow-sm bg-white p-4"
                        >
                            {/* 画像 */}
                            <img
                                src={item.main_image_url ? CONFIG.BASE_URL + item.main_image_url : "/data/noimage.png"}
                                alt={item.name}
                                className="w-24 h-32 object-cover rounded md:w-full md:h-auto"
                            />

                            {/* 詳細情報 */}
                            <div className="flex flex-col justify-between flex-1 ml-3 md:ml-0 md:mt-3 text-sm">
                                <div>
                                    <h3 className="font-semibold text-gray-800 text-sm md:text-base line-clamp-2">
                                        {item.name}
                                    </h3>

                                    <div className="text-yellow-500 text-xs mt-1">
                                        ★ 5.0 <span className="text-gray-500">({100})</span>
                                    </div>

                                    <div className="text-red-600 font-bold text-lg mt-1">
                                        {item.price.toLocaleString()}円
                                    </div>

                                    <div className="text-xs text-pink-600 mt-1">
                                        {item.point}ポイント <span className="text-red-500">(3%)</span>
                                    </div>

                                    <div className="text-xs text-blue-600 mt-1">prime 翌日配送</div>
                                    {/*<div className="text-xs text-gray-500">無料配送 {item.arrivalDate} にお届け</div>*/}
                                </div>

                                <button className="bg-yellow-400 hover:bg-yellow-500 text-black text-sm font-semibold py-2 w-full rounded mt-3">
                                    カートに入れる
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

        </div>
    );
};

export default FleaMarketList;