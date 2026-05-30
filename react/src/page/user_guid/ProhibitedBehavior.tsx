import React from "react";
import { s } from "../../styles/page/user_guid/ProhibitedBehavior.styles";

export const ProhibitedBehavior = () => {
  return (
    <div style={{ color: "#2e3128", lineHeight: 1.9, fontFamily: "inherit" }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 32, borderBottom: "2px solid #1a1a1a", paddingBottom: 16 }}>禁止されている行為</h2>
      <p>aftialoopは、誰でも簡単に商品を売ったり買ったりできるフリマサービスです。<br />多くの方々が安心して取引ができるよう、以下の行為を禁止しています。</p>

      <h3 style={s.h2}>「安全であること」を損なう可能性があり、禁止する行為</h3>
      <p style={s.p}>自由な取引は、安全に利用できる環境があってはじめて成り立つものです。</p>

      <h4 style={{ fontWeight: 700, marginTop: 24, marginBottom: 8 }}>出品・購入</h4>
      <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
        <li>製造や販売にあたり、法令上許可・届出・免許等が必要な商品について、許可等なく出品すること</li>
        <li>出品者自身や親族など関係者の商品を購入すること</li>
        <li>マネーロンダリングが疑われる行為</li>
      </ul>

      <h4 style={{ fontWeight: 700, marginTop: 24, marginBottom: 8 }}>発送・受取</h4>
      <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
        <li>第三者に取引を代行させること</li>
        <li>購入者の同意なしに、直接受け渡しを強要する行為</li>
        <li>評価に個人情報を記載すること</li>
      </ul>

      <h4 style={{ fontWeight: 700, marginTop: 24, marginBottom: 8 }}>共通</h4>
      <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
        <li>個人情報を含む出品・投稿、個人情報の不正利用</li>
        <li>アカウントの不正利用</li>
        <li>違法行為およびそれを助長する行為</li>
        <li>勧誘活動を行うこと</li>
        <li>特定アカウントへの嫌がらせや誹謗中傷</li>
      </ul>

      <h3 style={s.h2}>「信頼できること」を損なう可能性があり、禁止する行為</h3>
      <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
        <li>虚偽・誇大な商品説明や写真の掲載</li>
        <li>他人の写真や説明文を無断で転用すること</li>
        <li>同一商品の重複出品</li>
        <li>取引のキャンセルを繰り返す行為</li>
      </ul>

      <h3 style={s.h2}>「人道的であること」を損なう可能性があり、禁止する行為</h3>
      <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
        <li>差別的・侮辱的な内容を含む出品・メッセージ</li>
        <li>性的・暴力的なコンテンツの投稿</li>
        <li>生体の不適切な取り扱いに関する出品</li>
      </ul>

      <p style={{ textAlign: "right", color: "#8c8c8c", marginTop: 40 }}>2026年4月18日 改定</p>
    </div>
  );
};
