import React from "react";
import { FleaPurchaseRequestRow } from "../../../types/FleaMarket";
import { AlertCircle, FileText, XCircle } from "lucide-react";

interface Props {
    pr: FleaPurchaseRequestRow;
    role: "BUYER" | "SELLER";
}

export const RequestCancelledPanel: React.FC<Props> = ({ pr, role }) => {
    const isWithdrawn = pr.status === "WITHDRAWN";
    const isRejected = pr.status === "REJECTED";

    // 文言の出し分け
    let title = "";
    let reason = "";
    let description = "";

    if (isWithdrawn) {
        title = "この購入申請は取り下げられました";
        reason = pr.withdrawal_reason || "理由の記載はありません";
        description = "申請者（購入希望者）により、申請がキャンセルされました。";
    } else if (isRejected) {
        title = "この購入申請は成立しませんでした";
        reason = pr.rejection_reason || "理由の記載はありません";
        description = "出品者により、申請が見送られました（却下）。";
    } else {
        return null; // 通常ありえない
    }

    return (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden">
            {/* ヘッダー */}
            <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex items-center gap-3">
                <XCircle className="text-gray-500" size={24} />
                <div>
                    <h2 className="font-bold text-gray-800 text-lg">{title}</h2>
                    <p className="text-xs text-gray-500">
                        更新日時: {new Date(pr.updated_at).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* 理由エリア */}
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-2">
                        <FileText size={16} />
                        {isWithdrawn ? "取り下げ理由" : "見送り理由"}
                    </h3>
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                        {reason}
                    </p>
                </div>

                {/* 案内エリア */}
                <div className="flex gap-3 text-sm text-gray-600 bg-white p-4 rounded-xl border border-gray-200">
                    <AlertCircle size={20} className="shrink-0 text-gray-400" />
                    <div>
                        <p className="font-bold mb-1">ステータス: {isWithdrawn ? "取り下げ済み" : "却下済み"}</p>
                        <p>{description}</p>
                        <p className="mt-2 text-xs text-gray-400">
                            ※この申請手続きは終了しています。再開することはできません。
                            {role === "BUYER" && " 購入したい場合は、再度申請を行ってください。"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};