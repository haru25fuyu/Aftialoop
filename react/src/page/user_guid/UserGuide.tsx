import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { GUIDE_DATA } from './GuideData';

const UserGuide: React.FC = () => {
  // URLの /guide/:guideId の部分を取得
  const { guideId } = useParams<{ guideId: string }>();

  // 該当するデータを探す
  const activeContent = GUIDE_DATA.find((item) => item.id === guideId);

  // もしURLが無効なら、最初のページにリダイレクト
  if (!activeContent) {
    return <Navigate to={`/guide/${GUIDE_DATA[0].id}`} replace />;
  }

  return (
    <div className="flex w-full min-h-screen bg-white">
      {/* サイドメニュー */}
      <nav className="w-64 bg-gray-50 border-r py-8 flex flex-col">
        <div className="px-6 mb-4 text-xs font-bold text-gray-400 uppercase">ガイドメニュー</div>
        {GUIDE_DATA.map((item) => (
          <Link
            key={item.id}
            to={`/guide/${item.id}`} // URLを変更
            className={`px-6 py-3 text-sm transition-colors ${
              guideId === item.id
                ? 'bg-blue-600 text-white font-bold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {item.title}
          </Link>
        ))}
      </nav>

      {/* コンテンツエリア */}
      <main className="flex-1 p-12 overflow-y-auto">
        <article className="max-w-3xl">
          <h1 className="text-3xl font-bold mb-8 border-b pb-4 text-gray-800">
            {activeContent.title}
          </h1>
          <div className="prose prose-blue text-gray-700 leading-relaxed">
            {activeContent.content}
          </div>
        </article>
      </main>
    </div>
  );
};

export default UserGuide;