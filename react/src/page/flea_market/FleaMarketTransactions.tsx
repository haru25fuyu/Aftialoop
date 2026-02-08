import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

// ↓ 追加: API関数と型定義
import { fetchFleaTransactionDetail, calcTxPhase, TxPhase } from "../../conf/FleaMarket";
//import { ShippingMethod, ShippingFeePref } from "../../conf/FleaMarket"; // 型定義の場所に合わせてください
import api from '../../conf/api'; // user check api

import { FleaThreadResponse } from "../../types/FleaMarket";

//import { acceptPurchaseRequest } from "../../function/FleaMarket";

import TxHeader from "../../component/TxHeader";
import TxTimeline from "../../component/TxTimeline";
import PhasePanel from "../../component/FleaMarket/FleaMarketPhases/PhasePanel";
import SellerSetTerms from "../../component/FleaMarket/FleaMarketPhases/SellerSetTerms";

import Header from "../../component/Header";
import LoginModal from '../../modal/Login'; // Import LoginModal

export default function FleaTransactionPage() {
    const { id } = useParams();
    const [data, setData] = useState<FleaThreadResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [isLoginModalOpen, setLoginModalOpen] = useState(false); // State for Login Modal
    const [isLoggedIn, setIsLoggedIn] = useState(false); // State to track login status
    const [myUserId, setMyUserId] = useState<string | null>(null); // State to store logged-in user ID

    // Function to check user login status
    const checkLoginStatus = async () => {
        try {
            const res = await api.post("customer"); // Using your existing customer check endpoint
            console.log("User check response:", res.data);
            if (!res.data.user || !res.data.user.id) {
                setLoginModalOpen(true);
                setIsLoggedIn(false);
                setMyUserId(null);
            } else {
                setIsLoggedIn(true);
                setMyUserId(res.data.user.id);
                // If logged in, proceed to load data
                load();
            }
        } catch (err) {
            console.error("Login check failed:", err);
            // Depending on your API behavior, an error might also mean not logged in
            setLoginModalOpen(true);
            setIsLoggedIn(false);
        }
    };

    const handleLoginSuccess = () => {
        setLoginModalOpen(false);
        setIsLoggedIn(true);
        load(); // Load data after successful login
    };


    async function load() {
        if (!id) return;
        setLoading(true);
        setErr(null);
        try {
            const d = await fetchFleaTransactionDetail(id);
            setData(d);
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "failed");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        checkLoginStatus(); // Check login on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const phase: TxPhase | null = useMemo(() => {
        if (!data) return null;
        if (data.kind === "purchase_request") {
            return "SELLER_SET_TERMS";
        }
        if (!data.transaction) return null;
        return calcTxPhase(data.transaction, data.role);
    }, [data]);


    // Display Login Modal if open
    if (isLoginModalOpen) {
        return (
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => { /* Optionally handle close action, maybe redirect or just close modal */ setLoginModalOpen(false); }}
                onLoginSuccess={handleLoginSuccess}
                showCloseButton={false} // Force login to view page
            />
        );
    }

    // Only render main content if logged in
    if (!isLoggedIn) {
        return null; // Or a loading spinner while checking auth
    }

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

    // 申請（条件提示）フェーズの場合
    if (data.kind === "purchase_request") {
        return (
            <>
                <Header />
                <div className="mx-auto w-full max-w-[600px] p-4">

                    <SellerSetTerms
                        pr={data.purchase_request}
                        myUserId={myUserId!}
                        role={data.role}
                        item={data.item}
                        buyer_address={data.address}
                        onChanged={load}
                    />
                </div>

            </>
        );
    }

    // 取引開始後の表示
    return (
        <>
            <Header />
            <div className="mx-auto w-full max-w-[900px] p-4 sm:p-6 space-y-4">
                <TxHeader data={data} phase={phase} />
                <TxTimeline phase={phase} />
                <PhasePanel data={data} myUserId={myUserId!} phase={phase} onChanged={load} />
            </div>
        </>
    );
}