import React from "react";
import { useParams } from "react-router-dom";

import { Header } from "../../component/Header";

const FleaMarketPurchaseRequestsBuyer: React.FC = () => {
    const { id } = useParams<{ id: string }>();


    return (
        <div className="pb-32 md:pb-0">
            <Header />
            <div className="max-w-3xl mx-auto pt-20 px-4">
                <h1 className="text-2xl font-bold mb-4">購入リクエスト詳細 (購入者用)</h1>
                <p>購入リクエストID: {id}</p>
                {/* ここに購入リクエストの詳細情報を表示するコンポーネントを追加 */}
            </div>
            
        </div >
    );
};

export default FleaMarketPurchaseRequestsBuyer; 
