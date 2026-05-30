import React from "react";
import { Link } from "react-router-dom";
import { s } from "../styles/component/Footer.styles";

export const Footer: React.FC = () => (
  <footer style={s.footer}>
    <div style={s.categoryList as any}>
      <span style={s.categoryItem}>昆虫</span>
      <span style={s.categoryItem}>爬虫類</span>
      <span style={s.categoryItem}>両生類</span>
      <span style={s.categoryItem}>小動物</span>
      <span style={s.categoryItem}>飼育用品</span>
    </div>
    <div style={s.menuContent}>
      <img src="/data/Logo.png" alt="Aftialoop" style={s.footerLogo} />
      <div style={s.menu}>
        <ul style={s.menuList}>
          <li style={s.menuItem}><Link to="/guide" style={{ textDecoration: "none", color: "inherit" }}>ご利用ガイド</Link></li>
          <li style={s.menuItem}><Link to="/contact" style={{ textDecoration: "none", color: "inherit" }}>お問い合わせ</Link></li>
        </ul>
        <ul style={s.menuList}>
          <li style={s.menuItemGray}><Link to="/tos" style={{ textDecoration: "none", color: "inherit" }}>利用規約</Link></li>
          <li style={s.menuItemGray}><Link to="/privacy" style={{ textDecoration: "none", color: "inherit" }}>プライバシーポリシー</Link></li>
          <li style={s.menuItemGray}><Link to="/tokutei" style={{ textDecoration: "none", color: "inherit" }}>特定商取引法</Link></li>
        </ul>
      </div>
    </div>
    <div style={s.copyright}>
      <p style={s.copyrightText}>© 2026 Aftialoop. All rights reserved.</p>
    </div>
  </footer>
);
