import { useEffect, useState } from "react";

import Header from "../../component/Header.tsx";
import { Content } from "../../types/Content.ts";
import api from "../../conf/api.ts";

import "../../css/List.css";

const List: React.FC = () => {
  const [contents, setContents] = useState<Content[]>([]);

  // ✅ async/await に統一・console.log 削除・コメントアウト除去
  useEffect(() => {
    api
      .post<{ items: Content[] }>("item/list", {})
      .then((res) => setContents(res.data.items ?? res.data ?? []))
      .catch(console.error);
  }, []);

  return (
    <div>
      <header>
        <Header />
      </header>
      <main className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-[90%] mx-auto">
          {contents.map((item) => (
            <div
              key={item.id}
              className="flex flex-row md:flex-col border rounded shadow-sm bg-white p-4"
            >
              <img
                src={item.main_image_url}
                alt={item.name}
                className="w-24 h-32 object-cover rounded md:w-full md:h-auto"
              />

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
                    {item.point}ポイント{" "}
                    <span className="text-red-500">(3%)</span>
                  </div>
                  <div className="text-xs text-gray-500">無料配送</div>
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

export default List;
