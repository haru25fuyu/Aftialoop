import React from 'react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { jwtDecode } from "jwt-decode";
import '../css/Header.css';


export const Header: React.FC = () => {
    const [loginText, setLoginText] = useState("ログイン");
    const [loginImage, setLoginImage] = useState("/../data/login.jpeg");
    const [URL, setURL] = useState("/login");
    useEffect(() => {
        const refreshToken = localStorage.getItem('token');
        if (refreshToken && refreshToken !== "undefined") {
            //トークンをでコードして、ユーザー情報を取得
            const decoded = jwtDecode<{ sub: string }>(refreshToken);
            const name = decoded.name ? decoded.name : decoded.email;
            const image = localStorage.getItem('userIcon')
            const icon = (image && image !== "undefined") ? decoded.image : "/../data/user.png";
            setLoginText(name);
            setLoginImage(icon);
            setURL("/mypage");
        }
    }, []);
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
                    <li><Link to="/List">カテゴリー１</Link></li>
                    <li><Link to="/List">カテゴリー２</Link></li>
                    <li><Link to="/List">カテゴリー３</Link></li>
                    <li><Link to="/List">カテゴリー４</Link></li>
                </ul>
            </div>

            <div className='right-margin'>
                <div className='search-form'>
                    <input type="text" placeholder="キーワードを入力" />
                    <button type="submit" aria-label="検索"></button>
                </div>
                <div className='login'>
                    <Link to={URL} className='login-link'>
                        <span>{loginText}</span><img src={loginImage} />
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Header;