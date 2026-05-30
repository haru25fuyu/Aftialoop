import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { UserRound, LogIn } from "lucide-react";

import { s } from "../styles/component/Header.styles";

export const Header: React.FC = () => {
  const [loginText, setLoginText] = useState("ログイン");
  const [icon, setIcon] = useState<string | null>(null);

  useEffect(() => {
    const SetUser = () => {
      const refreshToken = localStorage.getItem("token");
      if (refreshToken && refreshToken !== "undefined") {
        const decoded = jwtDecode<{
          name: string;
          email: string;
          image: string;
        }>(refreshToken);
        const name = decoded.name ? decoded.name : decoded.email;
        const image = localStorage.getItem("userIcon");
        const userIcon = image && image !== "undefined" ? decoded.image : null;

        setLoginText(name);
        setIcon(userIcon);
      }
    };
    SetUser();
  }, []);

  return (
    <div style={s.header}>
      <div style={{ ...s.headerList, ...s.category }}>
        <span style={s.categoryTitle}>CATEGORY</span>
        <ul style={s.headerList}>
          <li>
            <Link to="/List">カテゴリー１</Link>
          </li>
          <li>
            <Link to="/List">カテゴリー２</Link>
          </li>
          <li>
            <Link to="/List">カテゴリー３</Link>
          </li>
          <li>
            <Link to="/List">カテゴリー４</Link>
          </li>
        </ul>
      </div>
      <div style={s.headerMenu}>
        <img style={s.logo} src="data/Logo.png" alt="ロゴ" />
        <div>
          <span style={s.menuTitle}>MENU</span>
          <ul style={s.headerList}>
            <li>
              <Link to="/">TOP</Link>
            </li>
            <li>
              <Link to="/payment">商品一覧</Link>
            </li>
            <li>
              <Link to="/mypage">マイページ</Link>
            </li>
            <li>
              <Link to="/mypage">お問い合わせ</Link>
            </li>
          </ul>
        </div>
        <div style={s.rightMargin}>
          <div style={s.searchForm}>
            <input
              style={s.searchInput}
              type="text"
              placeholder="キーワードを入力"
            />
            <button type="submit" aria-label="検索"></button>
          </div>
          <div style={s.login}>
            <Link to="/mypage" style={s.loginLink}>
              <span>{loginText}</span>
              {icon ? (
                <img src={icon} alt="プロフィール画像" style={s.avatar} />
              ) : loginText === "ログイン" ? (
                <LogIn style={s.icon} />
              ) : (
                <UserRound style={s.icon} />
              )}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
