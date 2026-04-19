
export const ProhibitedItems = () => {
  return (
    <div className="prose prose-blue max-w-none text-gray-800 leading-relaxed font-sans whitespace-pre-wrap">
      <h2 className="text-3xl font-bold mb-8 border-b-2 border-gray-800 pb-4 text-gray-900">禁止されている出品物</h2>
      <p>
        aftialoopは、誰でも簡単に商品を売ったり買ったりできるフリマサービスです。 <br />
        多くの方々が安心して取引ができるよう、以下の出品を禁止しています。<br />
        これらの出品が確認された場合には、出品停止や利用制限等の措置を取る場合があります。 <br />
        考え方については、下記のページを確認してください。<br />
        利用制限について：アカウントの利用制限<br />
        違反出品・行為の報告について：禁止されている出品物・行為を通報する
      </p>

      <h3 className="text-xl font-bold mt-10 mb-4 bg-gray-100 p-2 border-l-4 border-gray-800">
        「安全であること」を損なう可能性があり、禁止するもの
      </h3>
      <p>自由な取引は、安全に利用できる環境があってはじめて成り立つものです。そのため、法令に違反する取引を禁止することはもちろん、以下のような出品についても禁止し、取引の当事者及び取引の結果影響を受ける第三者の安全を確保します。</p>

      <h4 className="font-bold mt-6 mb-2">法令、条例、その他公的な規制に基づき、取引を禁止しているもの</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>規制薬物・危険ドラッグ類</li>
        <li>医薬品、医療機器</li>
        <li>たばこ</li>
        <li>農薬、肥料</li>
        <li>殺傷能力があり武器として使用されるもの</li>
        <li>許可なく製造した化粧品類や小分けした化粧品類</li>
        <li>法令に抵触するサプリメント類</li>
        <li>象牙および希少野生動植物種の個体などのうち、種の保存法により必要とされている登録がないもの</li>
        <li>外国為替及び外国貿易法（外為法）に抵触する商品について</li>
        <li>盗品など不正な経路で入手した商品</li>
        <li>個人情報を含む出品・投稿、個人情報の不正利用</li>
        <li>児童ポルノやそれに類するとみなされるもの</li>
        <li>使用済みの下着類</li>
        <li>使用済みのスクール水着、体操着、学生服類など</li>
        <li>チケット類</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2">知的財産権を侵害する、またはその可能性が高いもの</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>偽ブランド品、正規品と確証のないもの</li>
        <li>知的財産権を侵害するもの</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2">取引により、違法行為や不正行為を助長する可能性のあるもの</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>犯罪や違法行為に使用される可能性が高いもの</li>
        <li>領収書や公的証明書類</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2">利用者の生命、身体に危害を及ぼす危険性があるもの</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>危険物や安全性に問題があるもの</li>
        <li>安全面、衛生面に問題のある食品類</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2">現金と同等の価値を持ち、マネーロンダリング等に悪用されるリスクがあるもの</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>現金、金券類、カード類</li>
      </ul>

      <h3 className="text-xl font-bold mt-10 mb-4 bg-gray-100 p-2 border-l-4 border-gray-800">
        「信頼できること」を損なう可能性があり、禁止するもの
      </h3>
      <p>マーケットプレイスでは様々なものが取引されています。一つ一つユニークな商品を安心して取引するには、商品や取引に関する正確な情報が提供された上で、誠実に取引される必要があります。そのためaftialoopは、以下のような行為を禁止することによって、多くの人に信頼してご利用いただけるマーケットプレイスを構築します。</p>

      <h4 className="font-bold mt-6 mb-2">手元に物理的な商品がない、または実体がなくトラブルになりやすいもの</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>手元にない商品の出品やECサイト等から直送すること</li>
        <li>サービス・権利など実体のないもの</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2">写真や説明文から商品内容を具体的に確認できないもの</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>商品の内容が不明瞭な詰め合わせ、セット商品</li>
        <li>試作品(商品サンプル)の掲載がないオーダーメイド品</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2">契約や制限により、商品本来の機能が利用できない可能性があるもの</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>利用制限や契約中、支払いが残っている等の携帯端末および全てのSIMカード</li>
      </ul>

      <h3 className="text-xl font-bold mt-10 mb-4 bg-gray-100 p-2 border-l-4 border-gray-800">
        「人道的であること」を損なう可能性があり、禁止するもの
      </h3>
      <p>多様な価値観を持つ人々が参加するマーケットプレイスでは、一人一人の価値観や立場が尊重されることが大切です。また、取引を通じて、人道に反するような行為が助長されることがあってはならないと考えます。そのためaftialoopは、以下のような行為を禁止することによって、多くの人に信頼してご利用いただけるマーケットプレイスを構築します。</p>

      <h4 className="font-bold mt-6 mb-2 text-red-600">法令により取引が禁止されているもの（生体）</h4>
      <ul className="list-disc ml-6 space-y-2">
        <li className="font-bold underline">国内の法令により取引・譲渡が禁止されている生体</li>
        <p className="ml-4 text-sm">特定外来生物（アカミミガメ、一部のクワガタ等、法で飼育・譲渡が禁じられているもの）</p>
        <p className="ml-4 text-sm">登録証のない国内希少野生動植物種（種の保存法）</p>
        <p className="ml-4 text-sm">特定動物（毒蛇、ワニ等の危険動物）</p>
        
        <li className="font-bold underline">法令上の対面義務を無視した取引</li>
        <p className="ml-4 text-sm">哺乳類・鳥類・爬虫類において、第一種動物取扱業者としての現物確認・対面説明を省略して発送のみで行う取引</p>
        
        <li className="font-bold underline">健康状態や安全に問題がある生体</li>
        <p className="ml-4 text-sm">著しく衰弱している、または感染症や寄生虫が明らかな生体</p>
        
        <li className="font-bold underline">配送業者が受け入れを拒否している方法での梱包・発送</li>
        
        <li className="font-bold underline">希少種の卵や部位</li>
        <p className="ml-4 text-sm">親個体の譲渡が禁止されている種の卵や、剥製、骨格など</p>
      </ul>

      <h3 className="text-xl font-bold mt-10 mb-4 bg-gray-100 p-2 border-l-4 border-gray-800">
        aftialoopの運営方針により取り扱わないもの
      </h3>
      
      <h4 className="font-bold mt-6 mb-2">緊急事態において供給が著しく不足している必需品</h4>
      <p className="text-sm italic">※現在禁止しているものはありません</p>

      <h4 className="font-bold mt-6 mb-2">有効性や利用状況の確認が困難なことにより、トラブルを誘発する可能性が高いもの</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>電子チケットや電子クーポン、QRコードなどの電子データ</li>
        <li>ダウンロードコンテンツやデジタルコンテンツなどの電子データ</li>
        <li>ゲームアカウントやゲーム内の通貨、アイテムなどの電子データ</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2">法令等の定めにより、取り扱いが困難であると判断したもの</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>ペダル付き電動バイク、フル電動自転車、ペダル付き原動機付自転車、電動モペットなどの車両</li>
        <li>特定小型原動機付自転車</li>
        <li>マグネットセットおよび給水樹脂ボール</li>
        <li>受け渡しに伴う手続きが複雑なもの</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2">事業方針や提供価値を踏まえ、取り扱いを禁止しているもの</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>18禁、アダルト関連</li>
        <li>ハードウェアウォレット</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2 text-red-700">取引の安全性の観点から取り扱いを一時的に見合わせているもの</h4>
      <ul className="list-disc ml-6 space-y-1 text-sm text-gray-600 italic font-medium">
        <li>日本マクドナルドホールディングス株式会社が発行する株主優待券</li>
        <li>株式会社東横インが発行する無料宿泊券</li>
        <li>株式会社スタジオアリスが発行する株主写真撮影券</li>
      </ul>
      
      <p className="text-right text-gray-500 mt-10">2026年4月18日 改定</p>
    </div>
  );
};