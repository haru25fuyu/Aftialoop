export const ProhibitedBehavior = () => {
  return (
    <div className="prose prose-blue max-w-none text-gray-800 leading-relaxed font-sans whitespace-pre-wrap">
      <h2 className="text-3xl font-bold mb-8 border-b-2 border-gray-800 pb-4 text-gray-900">禁止されている行為</h2>
      <p>
        aftialoopは、誰でも簡単に商品を売ったり買ったりできるフリマサービスです。 <br />
        多くの方々が安心して取引ができるよう、以下の行為を禁止しています。 <br />
        「事務局で禁止行為に該当する行為を確認した」または「お客さまからご連絡を受け禁止行為に該当する可能性があると判断した」場合、事務局より警告や、一定期間あるいは無期限の利用制限を行います。 <br />
        利用制限について：アカウントの利用制限 <br />
        違反出品・行為の報告について：禁止されている出品物・行為を通報する
      </p>

      <h3 className="text-xl font-bold mt-10 mb-4 bg-gray-100 p-2 border-l-4 border-gray-800">
        「安全であること」を損なう可能性があり、禁止する行為
      </h3>
      <p>自由な取引は、安全に利用できる環境があってはじめて成り立つものです。そのため、法令に違反する出品を禁止することはもちろん、以下のような取引についても禁止し、取引の当事者及び取引の結果影響を受ける第三者の安全を確保します。</p>

      <h4 className="font-bold mt-6 mb-2">出品・購入</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>製造や販売にあたり、法令上許可・届出・免許等が必要な商品について、許可・届出・免許等なく当該商品を出品すること</li>
        <li>出品者自身や親族など関係者の商品を購入すること</li>
        <li>マネーロンダリングが疑われる行為</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2">発送・受取</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>第三者に取引を代行させること</li>
        <li>購入者の同意なしに、直接受け渡しを強要する行為</li>
        <li>評価に個人情報を記載すること</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2">共通</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>個人情報を含む出品・投稿、個人情報の不正利用</li>
        <li>アカウントの不正利用</li>
        <li>違法行為およびそれを助長する行為</li>
        <li>勧誘活動を行うこと</li>
        <li>特定アカウントへの執拗なコメント、悪意ある侮辱、個人情報の公開</li>
      </ul>

      <h3 className="text-xl font-bold mt-10 mb-4 bg-gray-100 p-2 border-l-4 border-gray-800">
        「信頼できること」を損なう可能性があり、禁止する行為
      </h3>
      <p>マーケットプレイスでは様々なものが取引されています。一つ一つユニークな商品を安心して取引するには、商品や取引に関する正確な情報が提供された上で、誠実に取引される必要があります。そのためaftialoopは、以下のような行為を禁止することによって、多くの人に信頼してご利用いただけるマーケットプレイスを構築します。</p>

      <h4 className="font-bold mt-6 mb-2">出品・購入</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>虚偽の設定をすること、または虚偽の情報もしくは誤解を招くおそれがある情報を記載すること</li>
        <li>他会員が撮影した画像や、aftialoop外にある画像/文章などを無断で使用すること</li>
        <li>出品者とは別の第三者の商品を代理で出品すること</li>
        <li>いたずら出品とみなされるものを出品すること</li>
        <li>商品の状態がわかる画像を掲載しないこと</li>
        <li>商品の詳細がわからない取引</li>
        <li>販売を目的としない出品行為</li>
        <li>aftialoopが提供する機能を利用せずにオークション形式の出品をすること</li>
        <li>購入ボタンを押すだけでは商品が確定しない選択形式の出品</li>
        <li>商品に問題があっても返品に応じないという記載をすること</li>
        <li>交換、半交換</li>
        <li>aftialoopで用意された以外の決済方法を促すこと</li>
        <li>取引中の商品を再出品すること</li>
        <li>購入後に値上げや送料上乗せを要求すること</li>
        <li>出品者の自己都合で取引をキャンセルすること（商品状態、紛失、売り切れなど）</li>
        <li className="font-bold">国内の法令により取引・譲渡が禁止されている生体の出品</li>
        <p className="ml-4 text-sm italic">※特定外来生物、登録証のない国内希少野生動植物種、特定動物（危険動物）など。</p>
        <li className="font-bold">法令により義務付けられた現物確認・対面説明を行わない取引</li>
        <p className="ml-4 text-sm italic">※哺乳類・鳥類・爬虫類の販売において、第一種動物取扱業者が適切な対面手続きを省略すること。</p>
        <li className="font-bold">生体の種類・状態・出自に関する虚偽、または誤解を招く記載</li>
        <p className="ml-4 text-sm italic">※種名、性別、産地（WC/CB等）、給餌状況、欠損の有無などを意図的に隠す、または偽る行為。</p>
        <li className="font-bold">生体の生命を著しく危険にさらす出品・配送設定</li>
        <p className="ml-4 text-sm italic">※適切な梱包がなされない配送、または配送業者が生体の取り扱いを禁止している方法を選択すること。</p>
        <li className="font-bold">繁殖・飼育の個体特定が困難な情報の掲載</li>
        <p className="ml-4 text-sm italic">※著しく古い写真の使用や、お届けする個体とは別個体の写真のみを掲載する行為。</p>
        <li>出品者自身や親族など関係者の商品を購入すること</li>
        <li>落札後に購入を行わないこと</li>
        <li>故意に支払いを行わないでおく購入</li>
        <li>購入後に値引きを持ちかけること</li>
        <li>支払いを行う前に出品者へ発送を促すこと</li>
        <li>購入者の自己都合による取引キャンセル（誤操作、不要になった、送料・サイズ・状態の見落とし、イメージ違い、支払い方法の変更など）</li>
        <li>出品者や第三者に取引・キャンセルを持ちかけること</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2">発送・受取</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>差出人情報を記載せずに発送すること（匿名配送以外）</li>
        <li>梱包不備（緩衝材不足、商品がはみ出すなど）</li>
        <li>送料込の商品を送料別（着払い）で発送すること</li>
        <li>発送前に発送通知を行うこと</li>
        <li>海外へ商品を配送すること</li>
        <li>購入者の同意なしに、直接受け渡しを強要する行為</li>
        <li>評価方法を指定すること（例：「良かった」を強制する）</li>
        <li>進行中の取引放棄（発送遅延、未払い、連絡無視など）</li>
        <li>配送先情報の誤入力</li>
        <li>商品の宛先を郵便局（営業所）留めにすること</li>
        <li>自身の意志で着荷を受け取ることのできない施設を配送先に設定すること</li>
        <li>商品を受け取らないこと</li>
        <li>出品者に確認せず返送すること</li>
        <li>返品合意後に返送や受取を拒否すること</li>
        <li>トラブルがないのに受取評価を行わないこと</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2">共通</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>aftialoopに虚偽の情報を投稿したり、事務局に対し虚偽の報告や申告を行うこと</li>
        <li>取引相手に虚偽の情報を伝えること</li>
        <li>外部サービスなどに誘導する行為</li>
        <li>本サービスが用意した取引の流れに沿わない行為</li>
      </ul>

      <h3 className="text-xl font-bold mt-10 mb-4 bg-gray-100 p-2 border-l-4 border-gray-800">
        「人道的であること」を損なう可能性があり、禁止する行為
      </h3>
      <p>多様な価値観を持つ人々が参加するマーケットプレイスでは、一人一人の価値観や立場が尊重されることが大切です。また、取引を通じて、人道に反するような行為が助長されることがあってはならないと考えます。そのためaftialoopは、以下のような行為を禁止することによって、多くの人に信頼してご利用いただけるマーケットプレイスを構築します。</p>

      <h4 className="font-bold mt-6 mb-2">発送・受取</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>評価コメントに不適切な内容（誹謗中傷、差別、違法誘導、公序良俗違反など）を記載すること</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2">共通</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>迷惑行為</li>
        <li>わいせつ、性的、または低俗な投稿を行うこと</li>
        <li>差別や憎悪を助長したり、またはそれらにつながるもの</li>
        <li>公序良俗に反する行為</li>
        <li>他者の信条に踏み込んだ嫌がらせ行為</li>
      </ul>

      <h3 className="text-xl font-bold mt-10 mb-4 bg-gray-100 p-2 border-l-4 border-gray-800">
        aftialoopの運営方針により禁止する行為
      </h3>
      <p>上記の基本原則には含まれないものの、お客さま間のトラブル発生を未然に防ぎ、マーケットプレイスの円滑な運営を維持するため、また、法令や社会通念上の取り扱いを踏まえ、以下の行為についても禁止しています。</p>

      <h4 className="font-bold mt-6 mb-2">発送・受取</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>予定より早い発送を強要すること</li>
        <li>配送方法を強要すること</li>
        <li>評価変更を繰り返し依頼すること</li>
        <li>自己都合で事務局へ評価依頼を行うこと</li>
      </ul>

      <h4 className="font-bold mt-6 mb-2">共通</h4>
      <ul className="list-disc ml-6 space-y-1">
        <li>キャンセル料・迷惑料の請求</li>
        <li>独自ルール（コメント必須、低評価など）を設けて取引を拒否すること</li>
        <li>その他、不適切と判断される行為</li>
      </ul>

      <p className="text-right text-gray-500 mt-10 italic">2026年4月18日 改定</p>
    </div>
  );
};