
import React from 'react';
import { Link } from 'react-router-dom';
import '../css/Footer.css';


export const Footer: React.FC = () => {

    return (
        <footer className="flex items-center justify-between w-full bg-white py-4 px-6">
            {/* ロゴ */}
            <div className="w-24 h-24 flex-shrink-0">
                <img src="/data/Logo.JPG" alt="ロゴ" className="w-full h-full object-contain" />
            </div>

            {/* ナビゲーション */}
            <nav className="flex space-x-6 text-gray-700 text-lg">
                <Link to="/" className="hover:text-black">TOP</Link>
                <Link to="/payment" className="hover:text-black">商品一覧</Link>
                <Link to="/mypage" className="hover:text-black">マイページ</Link>
                <Link to="/contact" className="hover:text-black">お問い合わせ</Link>
            </nav>

            {/* SNS & カート */}
            <div className="flex items-center space-x-4">
                <img src="/data/Instagram_Glyph_Black.png" alt="Instagram" className="w-8 h-8" />
                <img src="/data/cart.png" alt="カート" className="w-8 h-8" />
            </div>
        </footer>
    );
}

export default Footer;