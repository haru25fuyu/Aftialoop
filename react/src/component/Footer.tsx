
import React from 'react';
import { Link } from 'react-router-dom';
import '../css/Footer.css';


export const Footer: React.FC = () => {

    return (
        <footer>
            <ul className="category-list footer-category">
                <li>カテゴリー１</li>
                <li>カテゴリー２</li>
                <li>カテゴリー３</li>
                <li>カテゴリー４</li>
                <li>カテゴリー５</li>
            </ul>
            <div className="menu-content">
                <img className='footer-logo' src="/../data/Logo.png" alt="ロゴ" />
                <div className="menu">
                    <ul>
                        <li>TOP</li>
                        <li>商品一覧</li>
                        <li>虫好きのペット部屋</li>
                        <li>お問い合わせ</li>
                    </ul>
                    <ul className="gray">
                        <li>お知らせ一覧</li>
                        <li>プライバシーポリシー</li>
                    </ul>
                </div>
            </div>
            <div className="copyright">
                <p>© 2025 aftia</p>
            </div>
        </footer>
    );
}

export default Footer;