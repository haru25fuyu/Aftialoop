import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchFleaTransactionDetail,calcTxPhase, TxPhase } from "../../conf/FleaMarket";

import { FleaTransactionDetailResponse } from "../../types/FleaMarket";

import TxHeader from "../../component/TxHeader";
import TxTimeline from "../../component/TxTimeline";
import PhasePanel from "../../component/FleaMarketPhases/PhasePanel";

export default function FleaTransactionPage() {
    const { txId } = useParams();
    const [data, setData] = useState<FleaTransactionDetailResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function load() {
        if (!txId) return;
        setLoading(true);
        setErr(null);
        try {
            const d = await fetchFleaTransactionDetail(txId);
            setData(d);
        } catch (e: any) {
            setErr(e?.message ?? "failed");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [txId]);

    const phase: TxPhase | null = useMemo(() => {
        if (!data) return null;
        return calcTxPhase(data.tx, data.viewer_role);
    }, [data]);

    if (loading) {
        return <div className="p-6 text-sm text-gray-600">読み込み中…</div>;
    }
    if (err) {
        return (
            <div className="p-6">
                <div className="text-sm text-red-600">取引の取得に失敗: {err}</div>
                <button className="mt-3 rounded-xl border px-4 py-2 text-sm" onClick={load}>
                    再読み込み
                </button>
            </div>
        );
    }
    if (!data || !phase) {
        return <div className="p-6 text-sm text-gray-600">データなし</div>;
    }

    return (
        <div className="mx-auto w-full max-w-[900px] p-4 sm:p-6 space-y-4">
            <TxHeader data={data} phase={phase} />
            <TxTimeline phase={phase} />
            <PhasePanel data={data} phase={phase} onChanged={load} />
        </div>
    );
}
