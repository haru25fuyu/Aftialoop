import React from 'react';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-bold mt-10 mb-4 bg-gray-100 p-2 border-l-4 border-gray-800">
    {children}
  </h2>
);

const TableRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <tr className="border-b border-gray-200">
    <th className="w-1/3 py-4 px-6 text-left bg-gray-50 font-bold text-gray-700 text-sm">{label}</th>
    <td className="py-4 px-6 text-gray-800 text-sm leading-relaxed">{children}</td>
  </tr>
);

export const SpecifiedCommercialTransaction = () => {
  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-sm border border-gray-200 my-10 font-sans">
      <h1 className="text-2xl font-bold mb-8 border-b-2 pb-4 text-center">
        特定商取引に関する表記・古物営業法に基づく表示
      </h1>

      <table className="w-full border-collapse border border-gray-200">
        <tbody>
          <TableRow label="事業者">aftialoop事務局</TableRow>
          <TableRow label="代表者">大久保  悠冬</TableRow>
          <TableRow label="ホームページ">https://aftialoop.com/</TableRow>
          <TableRow label="メールアドレス">support@aftialoop.com</TableRow>
          <TableRow label="所在地">
            〒000-0000 兵庫県（※）<br />
            <span className="text-xs text-gray-500">※所在地および電話番号については、メールアドレス宛にご請求いただければ、遅滞なく開示いたします。</span>
          </TableRow>
          <TableRow label="電話番号">000-0000-0000（※上記参照）</TableRow>
          {/*
          <TableRow label="古物商許可番号">（※取得済みであれば記載。未取得なら項目ごと削除）</TableRow>
          */}
        </tbody>
      </table>

      <SectionTitle>[ aftialoopについて ]</SectionTitle>
      
      <table className="w-full border-collapse border border-gray-200">
        <tbody>
          <TableRow label="役務の内容">
            ユーザー間の物品（生体および飼育用品）の売買の場・機会を提供します。
          </TableRow>
          
          <TableRow label="役務の提供時期">
            <div className="space-y-2">
              <p><strong>出品者：</strong>「出品する」ボタンを押したら、即時に出品となります。</p>
              <p><strong>購入者：</strong>会員登録後、直ちにご利用いただけます。</p>
            </div>
          </TableRow>

          <TableRow label="役務の対価及びその支払い方法・支払時期">
            <div className="space-y-2">
              <p><strong>出品者：</strong>販売手数料として販売価格の10%</p>
              <p className="text-xs">出品した商品が購入され取引が完了した時に、販売手数料として販売価格から差し引かれます。</p>
              <p><strong>購入者：</strong>料金はかかりません。</p>
            </div>
          </TableRow>

          <TableRow label="上記販売手数料以外に必要な費用">
            <ul className="list-disc ml-4 space-y-1">
              <li>商品を購入する際、支払い方法により所定の支払手数料</li>
              <li>商品の配送費用（送料）</li>
              <li>売上を引き出す際、所定の振込手数料</li>
            </ul>
          </TableRow>

          <TableRow label="代金の支払方法">
            クレジットカード払い、その他本サービスが定める決済方法
          </TableRow>

          <TableRow label="代金の支払時期">
            <p>クレジットカード払いの場合は即日。コンビニ払い等の場合は、購入手続き後の指定期限（翌々日23時59分等）まで。</p>
          </TableRow>

          <TableRow label="返品・交換について">
            <p>
              ユーザー都合による返品・交換は受け付けておりません。
            </p>
            <p className="mt-2 text-xs">
              到着した商品に不良・不足、または生体の死着等があった場合は、商品状態を明記のうえ、取引メッセージおよびお問い合わせフォームよりご連絡ください。
            </p>
          </TableRow>
        </tbody>
      </table>

      <p className="text-right text-gray-400 mt-12 text-xs italic">
        2026年4月19日 制定
      </p>
    </div>
  );
};