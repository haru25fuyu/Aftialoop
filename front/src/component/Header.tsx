import React from 'react';
import { Link } from 'react-router-dom';
import '../css/Header.css';


export const Header: React.FC = () => {

    return (
        <div className="Header">
            <img className='logo' src="/../data/Logo.JPG"></img>
            <div className="list">
                <span className='title'>MENU</span>
                <ul className='header-list'>
                    <li><Link to="/">TOP</Link></li>
                    <li><Link to="/payment">商品一覧</Link></li>
                    <li><Link to="/mypage">マイページ</Link></li>
                    <li><Link to="/mypage">お問い合わせ</Link></li>
                </ul>
            </div>

            <div className="list">
                <span className='title'>CATWGORY</span>
                <ul className='header-list'>
                    <li><Link to="/">カテゴリー１</Link></li>
                    <li><Link to="/payment">カテゴリー２</Link></li>
                    <li><Link to="/mypage">カテゴリー３</Link></li>
                    <li><Link to="/mypage">カテゴリー４</Link></li>
                </ul>
            </div>

            <div className='right-margin'>
                <div className='search-form'>
                    <input type="text" placeholder="キーワードを入力" />
                    <button type="submit" aria-label="検索"></button>
                </div>
                <div className='login'>
                    <Link to="/login" className='login-link'>
                        <span>ログイン</span><img src="/../data/login.jpeg" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Header;