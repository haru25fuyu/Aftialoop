import React from 'react';
import { Link } from 'react-router-dom';
import '../css/Footer.css';


export const Footer: React.FC = () => {

    return (
        <>
            <div className="category">
                <ul>
                    <li><Link to="/">TOP</Link></li>
                    <li><Link to="/payment">商品一覧</Link></li>
                    <li><Link to="/mypage">マイページ</Link></li>
                    <li><Link to="/mypage">お問い合わせ</Link></li>
                    <li><Link to="/mypage">お問い合わせ</Link></li>
                </ul>
            </div>
            <div className="footer">
                <img className='fotter-logo' src="/../data/Logo.JPG"></img>
                <div className="fotter-list">
                    <ul>
                        <li><Link to="/">TOP</Link></li>
                        <li><Link to="/payment">商品一覧</Link></li>
                        <li><Link to="/mypage">マイページ</Link></li>
                        <li><Link to="/mypage">お問い合わせ</Link></li>
                    </ul>
                    <br />
                    <ul>
                        <li><Link to="/">TOP</Link></li>
                        <li><Link to="/payment">商品一覧</Link></li>
                        <li><Link to="/mypage">マイページ</Link></li>
                        <li><Link to="/mypage">お問い合わせ</Link></li>
                    </ul>
                </div>

            </div>
        </>
    );
}

export default Footer;