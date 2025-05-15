import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import { UserRound, LogIn } from "lucide-react";
import '../css/Header.css';

export const Header: React.FC = () => {
    const [loginText, setLoginText] = useState("ログイン");
    const [URL, setURL] = useState("/login");
    const [icon, setIcon] = useState<string | null>(null); // ✅ useState で管理

    useEffect(() => {
        const SetUser = () => {
            const refreshToken = localStorage.getItem('token');
            if (refreshToken && refreshToken !== "undefined") {
                const decoded = jwtDecode<{ name: string, email: string, image: string }>(refreshToken);
                const name = decoded.name ? decoded.name : decoded.email;
                const image = localStorage.getItem('userIcon');
                const userIcon = image && image !== "undefined" ? decoded.image : null;

                setLoginText(name);
                //setLoginImage(userIcon || "/../data/login.jpeg");
                setIcon(userIcon); // ✅ useState にセット
                setURL("/mypage");
            }
        };
        SetUser();
    }, []);

    return (
        <div className="Header">
            <img className='logo' src="/../data/animaloop_logo.jpg" alt="ロゴ" />

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
                <span className='title'>CATEGORY</span>
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
                        <span>{loginText}</span>
                        {icon ? (
                            <img src={icon} alt="プロフィール画像" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                            loginText === "ログイン" ? <LogIn className="text-gray-500 w-12 h-12 rounded-full object-cover" /> : <UserRound className="text-gray-500 w-12 h-12 rounded-full object-cover" />
                        )}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Header;
