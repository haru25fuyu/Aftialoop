import React from 'react';
import { Link } from 'react-router-dom';
import '../css/Header.css';


export const Header: React.FC = () => {

    return (
        <div className="BackGround">
            <img className='logo' src="/../data/Logo.JPG"></img>
            <div className="list">
                <span className='title'>MENU</span>
                <ul>
                    <li><Link to="/">TOP</Link></li>
                    <li><Link to="/payment">商品一覧</Link></li>
                    <li><Link to="/mypage">マイページ</Link></li>
                    <li><Link to="/mypage">お問い合わせ</Link></li>
                </ul>
            </div>

            <div className="list">
                <span className='title'>CATWGORY</span>
                <ul>
                    <li><Link to="/">カテゴリー１</Link></li>
                    <li><Link to="/payment">カテゴリー２</Link></li>
                    <li><Link to="/mypage">カテゴリー３</Link></li>
                    <li><Link to="/mypage">カテゴリー４</Link></li>
                </ul>
            </div>

            <div className='right-margin'>
                <div className='search-form'>
                    <input type="text" name="search" placeholder="SEARCH"></input>
                    <button><img className='search' src="/../data/serch.png" /></button>
                </div>
                <div className='login'>
                    <Link to="/login">ログイン</Link>
                    <img src="/../data/login.jpeg" />
                </div>
            </div>
        </div>
    );
}

export default Header;