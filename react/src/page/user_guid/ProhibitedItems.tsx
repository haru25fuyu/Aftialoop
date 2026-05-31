import { s } from "../../styles/page/user_guid/ProhibitedItems.styles";

export const ProhibitedItems = () => {
  return (
    <div style={{ color: "#2e3128", lineHeight: 1.9, fontFamily: "inherit" }}>
      <h2
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 32,
          borderBottom: "2px solid #1a1a1a",
          paddingBottom: 16,
        }}
      >
        禁止されている出品物
      </h2>
      <p>
        aftialoopは、誰でも簡単に商品を売ったり買ったりできるフリマサービスです。
        <br />
        多くの方々が安心して取引ができるよう、以下の出品を禁止しています。
      </p>

      <h3 style={s.h2}>「安全であること」を損なう可能性があり、禁止するもの</h3>
      <p style={s.p}>
        自由な取引は、安全に利用できる環境があってはじめて成り立つものです。
      </p>

      <h4 style={{ fontWeight: 700, marginTop: 24, marginBottom: 8 }}>
        法令、条例、その他公的な規制に基づき、取引を禁止しているもの
      </h4>
      <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
        <li>規制薬物・危険ドラッグ類</li>
        <li>医薬品、医療機器</li>
        <li>たばこ</li>
        <li>農薬、肥料</li>
        <li>殺傷能力があり武器として使用されるもの</li>
        <li>許可なく製造した化粧品類や小分けした化粧品類</li>
        <li>法令に抵触するサプリメント類</li>
        <li>象牙および希少野生動植物種の個体など（登録なし）</li>
        <li>外為法に抵触する商品</li>
        <li>盗品など不正な経路で入手した商品</li>
        <li>個人情報を含む出品・投稿</li>
        <li>児童ポルノやそれに類するもの</li>
        <li>使用済みの下着類</li>
        <li>使用済みのスクール水着、体操着、学生服類など</li>
        <li>チケット類</li>
      </ul>

      <h4 style={{ fontWeight: 700, marginTop: 24, marginBottom: 8 }}>
        知的財産権を侵害する、またはその可能性が高いもの
      </h4>
      <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
        <li>偽ブランド品、正規品と確証のないもの</li>
        <li>知的財産権を侵害するもの</li>
      </ul>

      <h4 style={{ fontWeight: 700, marginTop: 24, marginBottom: 8 }}>
        利用者の生命、身体に危害を及ぼす危険性があるもの
      </h4>
      <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
        <li>危険物や安全性に問題があるもの</li>
        <li>安全面、衛生面に問題のある食品類</li>
      </ul>

      <h4 style={{ fontWeight: 700, marginTop: 24, marginBottom: 8 }}>
        現金と同等の価値を持ち、マネーロンダリング等に悪用されるリスクがあるもの
      </h4>
      <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
        <li>現金、金券類、カード類</li>
      </ul>

      <h3 style={s.h2}>「信頼できること」を損なう可能性があり、禁止するもの</h3>
      <p style={s.p}>
        マーケットプレイスでは様々なものが取引されています。一つ一つユニークな商品を安心して取引するには、正確な情報の提供と誠実な取引が必要です。
      </p>

      <h4 style={{ fontWeight: 700, marginTop: 24, marginBottom: 8 }}>
        手元に物理的な商品がない、または実体がなくトラブルになりやすいもの
      </h4>
      <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
        <li>手元にない商品の出品やECサイト等から直送すること</li>
        <li>サービス・権利など実体のないもの</li>
      </ul>

      <h3 style={s.h2}>
        「人道的であること」を損なう可能性があり、禁止するもの
      </h3>
      <h4
        style={{
          fontWeight: 700,
          marginTop: 24,
          marginBottom: 8,
          color: "#d63c20",
        }}
      >
        法令により取引が禁止されているもの（生体）
      </h4>
      <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
        <li style={{ fontWeight: 700, textDecoration: "underline" }}>
          国内の法令により取引・譲渡が禁止されている生体
        </li>
        <p style={{ marginLeft: 16, fontSize: 14 }}>
          特定外来生物（アカミミガメ、一部のクワガタ等）
        </p>
        <p style={{ marginLeft: 16, fontSize: 14 }}>
          登録証のない国内希少野生動植物種（種の保存法）
        </p>
        <p style={{ marginLeft: 16, fontSize: 14 }}>
          特定動物（毒蛇、ワニ等の危険動物）
        </p>
        <li style={{ fontWeight: 700, textDecoration: "underline" }}>
          法令上の対面義務を無視した取引
        </li>
        <p style={{ marginLeft: 16, fontSize: 14 }}>
          哺乳類・鳥類・爬虫類において、第一種動物取扱業者としての現物確認・対面説明を省略した取引
        </p>
        <li style={{ fontWeight: 700, textDecoration: "underline" }}>
          健康状態や安全に問題がある生体
        </li>
        <p style={{ marginLeft: 16, fontSize: 14 }}>
          著しく衰弱している、または感染症や寄生虫が明らかな生体
        </p>
        <li style={{ fontWeight: 700, textDecoration: "underline" }}>
          配送業者が受け入れを拒否している方法での梱包・発送
        </li>
        <li style={{ fontWeight: 700, textDecoration: "underline" }}>
          希少種の卵や部位
        </li>
      </ul>

      <h3 style={s.h2}>aftialoopの運営方針により取り扱わないもの</h3>
      <h4 style={{ fontWeight: 700, marginTop: 24, marginBottom: 8 }}>
        有効性や利用状況の確認が困難なことにより、トラブルを誘発する可能性が高いもの
      </h4>
      <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
        <li>電子チケットや電子クーポン、QRコードなどの電子データ</li>
        <li>ダウンロードコンテンツやデジタルコンテンツなどの電子データ</li>
        <li>ゲームアカウントやゲーム内の通貨、アイテムなどの電子データ</li>
      </ul>

      <h4 style={{ fontWeight: 700, marginTop: 24, marginBottom: 8 }}>
        事業方針や提供価値を踏まえ、取り扱いを禁止しているもの
      </h4>
      <ul style={{ paddingLeft: 24, lineHeight: 2 }}>
        <li>18禁、アダルト関連</li>
        <li>ハードウェアウォレット</li>
      </ul>

      <h4
        style={{
          fontWeight: 700,
          marginTop: 24,
          marginBottom: 8,
          color: "#7a1a1a",
        }}
      >
        取引の安全性の観点から取り扱いを一時的に見合わせているもの
      </h4>
      <ul
        style={{
          paddingLeft: 24,
          lineHeight: 2,
          fontSize: 14,
          color: "#5c5a56",
          fontStyle: "italic",
        }}
      >
        <li>日本マクドナルドホールディングス株式会社が発行する株主優待券</li>
        <li>株式会社東横インが発行する無料宿泊券</li>
        <li>株式会社スタジオアリスが発行する株主写真撮影券</li>
      </ul>

      <p style={{ textAlign: "right", color: "#8c8c8c", marginTop: 40 }}>
        2026年4月18日 改定
      </p>
    </div>
  );
};
