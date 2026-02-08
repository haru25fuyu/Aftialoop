import { FleaThreadResponse } from "../../../types/FleaMarket";
import { Clock, AlertTriangle, CreditCard } from "lucide-react"; // アイコン用
import { TransactionChat } from "../../TransactionChat";

import { CancelTransactionButton } from "../../CancelTransactionButton";

//const cn = (...xs: Array<string | false | undefined | null>) => xs.filter(Boolean).join(" ");

export default function WaitPaymentPanel({
    data,
    myUserId,
    onChanged,
}: {
    data: FleaThreadResponse;
    myUserId: string;
    onChanged: () => void;
}) {
    const { transaction } = data;

    console.log(data)

    // 金額計算
    const itemPrice = transaction?.price_item ?? 0;
    const shippingPrice = transaction?.price_shipping ?? 0;
    const isShippingIncluded = transaction?.shipping_fee_type === "INCLUDED";
    const total = itemPrice + shippingPrice;

    return (
        <div className="flex flex-col gap-4">
            {/* 1. ステータスバナー: 状況を色とアイコンで伝える */}
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-800 shadow-sm">
                <div className="flex items-start gap-3">
                    <Clock className="mt-1 h-6 w-6 flex-shrink-0 text-yellow-600" />
                    <div>
                        <h3 className="font-bold text-lg">購入者の支払い待ちです</h3>
                        <p className="text-sm mt-1 opacity-90">
                            購入者が支払い手続きを進めています。<br />
                            支払いが完了するまで、商品の発送はお待ちください。
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. 取引内容の確認パネル */}
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b px-4 py-3">
                    <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> 取引情報の確認
                    </h4>
                </div>

                <div className="p-4 space-y-3">
                    {/* 商品価格 */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">商品価格</span>
                        <span className="font-medium">¥{itemPrice.toLocaleString()}</span>
                    </div>

                    {/* 送料 (込みの場合や別の場合で出し分け) */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">送料 ({isShippingIncluded ? "送料込み" : "着払い"})</span>
                        <span className="font-medium">
                            {shippingPrice > 0 ? `¥${shippingPrice.toLocaleString()}` : "¥0"}
                        </span>
                    </div>

                    <div className="border-t border-dashed my-2"></div>

                    {/* 合計金額 */}
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-700">合計金額</span>
                        <span className="text-xl font-bold text-gray-900">
                            ¥{total.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. 注意喚起エリア: 間違って発送しないように強めに警告 */}
            <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-600">
                        <p className="font-bold text-red-600 mb-1">ご注意ください</p>
                        <p>
                            支払いが完了する前に商品を発送してしまうと、トラブルの原因となります。
                            必ず<strong>「支払い完了」の通知が来てから</strong>発送作業を行ってください。
                        </p>
                    </div>
                </div>
            </div>

            {/* チャットエリアを追加 */}
            {data.transaction && myUserId && (
                <div className="mt-8">
                    <TransactionChat
                        purchase_request_id={data.transaction.purchase_request_id.toString()}
                        myUserId={myUserId}
                    />
                </div>
            )}

            {/* おまけ: 取引キャンセルなどの動線が必要ならここに置く */}
            <div className="text-center">
                <CancelTransactionButton
                    transactionId={transaction?.id || 0}
                    onSuccess={onChanged}
                    className="w-full" // 幅いっぱいにしたい場合
                />
            </div>
        </div>
    );
}