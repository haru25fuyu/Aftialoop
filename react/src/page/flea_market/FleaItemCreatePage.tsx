import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

import InlineSortableImages from "../../component/InlineSortableImages";
import ToastProvider from "../../component/ToastProvider";
import { Stepper } from "../../component/Stepper";
import TinySavedPopup from "../../component/TinySavedPopup";
import { Labeled } from "../../component/Labeled";
import ShipFromSelect from "../../component/ShipFromSelect";

import AddImagesModal from "../../modal/AddImagesModal";
import { ConfirmDialog } from "../../modal/ConfirmDialog";
import { PublishCompleteDialog } from "../../modal/PublishCompleteDialog";

import { CONFIG } from "../../conf/config";
import { useToast } from "../../conf/function";
import { upsertAnimalDetails, upsertSupplyDetails } from "../../conf/fleaDetails";

import { FleaItemType } from "../../types/Content";

const FEE_BASE = 0.10; // 標準手数料率 10%
const FEE_PER_PLUS_PCT = 0.01; // 追加割引 +1%ごとに +1%
const FEE_MAX = 0.25; // 上限（任意）

// ---------- ラッパ ----------
export default function FleaItemCreatePageWrapper() {
    return (
        <ToastProvider>
            <FleaItemCreatePage />
        </ToastProvider>
    );
}

// ---------- 本体 ----------
type SaveDraftResponse = { draft_id: number; saved_at: string };
type PublishResponse = { itemId: number };
type ApiErrorBag = { errors: Array<{ field: string; msg: string }> };

// ★ 2ステップ構成：メイン（必須） / 詳細（任意）
type StepKey = "main" | "details";

function FleaItemCreatePage() {
    const toast = useToast();

    // ===== seller_plus_pct（追加割引%）設定 =====
    // フロントは「追加割引%」しか持たない（ベース倍率はサーバーの責務）
    const MIN_PLUS_PCT = 0;
    const MAX_PLUS_PCT = 8; // 例：+0%〜+8%（= 1.02〜1.10相当をサーバー側で解釈）
    const STEP_PLUS_PCT = 1;

    // --------- フォーム状態 ---------
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");

    // ★ 変更：sellerRate をやめて sellerPlusPct（0..8）だけ持つ
    const [sellerPlusPct, setSellerPlusPct] = useState<number>(0);

    const [quantity, setQuantity] = useState(1);
    const [isMultiPurchasable, setIsMultiPurchasable] = useState(false);
    const [type, setType] = useState<FleaItemType>("ANIMAL");
    const [description, setDescription] = useState("");
    const [shippingFeeType, setShippingFeeType] = useState<0 | 1>(0);
    const [shipFromId, setShipFromId] = useState<number | null>(null);
    const [shipsWithinDays, setShipsWithinDays] = useState<number | "">(2);

    const [images, setImages] = useState<File[]>([]);
    const [mainIndex, setMainIndex] = useState<number>(0);

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [savedOpen, setSavedOpen] = useState(false);

    const [completeOpen, setCompleteOpen] = useState(false);
    const [lastItemId, setLastItemId] = useState<number | null>(null);

    const priceNum = Number(price) || 0;

    // 追加割引（%）: 0,1,2...
    const plusPct = Math.max(MIN_PLUS_PCT, Math.min(MAX_PLUS_PCT, Math.floor(sellerPlusPct)));

    // 手数料率
    const feeRate = Math.min(FEE_MAX, FEE_BASE + plusPct * FEE_PER_PLUS_PCT);

    // 手数料（円）と入金見込み（円）
    // 端数は「切り捨て」が無難（サーバーと合わせる）
    const feeYen = Math.floor(priceNum * feeRate);
    const payoutYen = Math.max(0, Math.floor(priceNum - feeYen));

    // 購入者の「追加で」最大お得（上乗せ分の目安）
    const maxExtraOffYen = Math.max(0, Math.floor(priceNum * (plusPct / 100)));

    const [feeOpen, setFeeOpen] = useState(false);

    // 詳細ステップ用状態（任意）
    const [liveDetails, setLiveDetails] = useState({
        locality: "",
        hatch_date: "",
        generation: "",
        size: "",
        sex: "unknown" as "male" | "female" | "unknown" | "pair",
    });

    const [supplyDetails, setSupplyDetails] = useState({
        brand: "",
        sku: "",
        net_weight_g: "",
    });

    // フォーム初期化関数（続けて出品）
    const [draftId, setDraftId] = useState<number | null>(null);

    // --------- ステップ管理（2ページ） ---------
    const [current, setCurrent] = useState<StepKey>("main");

    const resetForm = () => {
        setName("");
        setPrice("");
        setSellerPlusPct(0);
        setQuantity(1);
        setIsMultiPurchasable(false);
        setType("ANIMAL");
        setDescription("");
        setShippingFeeType(0);
        setShipFromId(null);
        setShipsWithinDays(2);
        setImages([]);
        setMainIndex(0);
        setDraftId(null);
        setCurrent("main");
        setLiveDetails({
            locality: "",
            hatch_date: "",
            generation: "",
            size: "",
            sex: "unknown",
        });
        setSupplyDetails({
            brand: "",
            sku: "",
            net_weight_g: "",
        });
        localStorage.removeItem("flea_item_draft");
    };

    // 必須系の充足判定
    const stepBasicDone = !!name.trim() && Number(price) > 0 && quantity >= 1 && (type === "ANIMAL" || type === "SUPPLY");
    const stepImagesDone = images.length > 0;
    const stepShippingDone = !!shipFromId && shipsWithinDays !== "";

    // メインステップ完了条件（これが満たされれば公開OK）
    const stepMainDone = stepBasicDone && stepImagesDone && stepShippingDone;

    // 詳細ステップは「どこか入っていれば complete 表示」するだけ
    const stepDetailsDone =
        (type === "ANIMAL" &&
            (liveDetails.locality || liveDetails.hatch_date || liveDetails.generation || liveDetails.size)) ||
        (type === "SUPPLY" && (supplyDetails.brand || supplyDetails.sku || supplyDetails.net_weight_g));

    // ★ 公開条件はメインだけ
    const canPublish = stepMainDone;

    const goNext = () => {
        if (current === "main") {
            if (!validateStep("main")) {
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }
            setCurrent("details");
        }
    };

    const goPrev = () => {
        if (current === "details") setCurrent("main");
    };

    // --------- 自動下書き保存 ---------
    type SavingState = "idle" | "saving" | "saved" | "error";
    const [saving, setSaving] = useState<SavingState>("idle");
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const AUTOSAVE_MS = 1500;
    const autosaveTimerRef = useRef<number | null>(null);

    // --------- バリデーション（全体） ---------
    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = "商品名を入力してください";
        const p = Number(price);
        if (!price || isNaN(p) || p <= 0) e.price = "価格は 1 以上の数値で入力してください";
        if (!isMultiPurchasable && quantity !== 1) e.quantity = "単品出品では数量は 1 固定です";
        if (quantity < 1) e.quantity = "数量は 1 以上";
        if (images.length === 0) e.images = "商品画像を 1 枚以上追加してください";
        if (shipFromId === null) e.shipFrom = "発送元を選択してください";
        if (shipsWithinDays === "") e.shipsWithinDays = "発送目安を選択してください";

        // sellerPlusPct は範囲制限
        if (!(plusPct >= MIN_PLUS_PCT && plusPct <= MAX_PLUS_PCT)) {
            e.sellerPlusPct = `追加割引は ${MIN_PLUS_PCT}%〜${MAX_PLUS_PCT}% の範囲で選択してください`;
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ステップ単位バリデーション
    const validateStep = (key: StepKey): boolean => {
        if (key === "main") return validate();
        return true;
    };

    // --------- 下書き（localStorage フォールバック） ---------
    useEffect(() => {
        const key = "flea_item_draft";
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const d = JSON.parse(saved);
                setName(d.name ?? "");
                setPrice(d.price ?? "");

                // ★ 変更：sellerPlusPct 復元（無ければ 0）
                const sp =
                    typeof d.sellerPlusPct === "number"
                        ? d.sellerPlusPct
                        : typeof d.seller_plus_pct === "number"
                            ? d.seller_plus_pct
                            : 0;
                setSellerPlusPct(Number.isFinite(sp) ? Math.max(MIN_PLUS_PCT, Math.min(MAX_PLUS_PCT, Math.floor(sp))) : 0);

                setQuantity(d.quantity ?? 1);
                setIsMultiPurchasable(!!d.isMultiPurchasable);
                setType(d.type === "SUPPLY" ? "SUPPLY" : "ANIMAL");
                setDescription(d.description ?? "");
                setShippingFeeType(d.shippingFeeType ?? 0);
                setShipFromId(d.shipFromId ?? null);
                setShipsWithinDays(d.shipsWithinDays ?? 2);
                setMainIndex(d.mainIndex ?? 0);
                if (d._draftId) setDraftId(d._draftId);

                // 詳細復元
                if (d.liveDetails) {
                    setLiveDetails((prev) => ({ ...prev, ...d.liveDetails }));
                }
                if (d.supplyDetails) {
                    setSupplyDetails((prev) => ({ ...prev, ...d.supplyDetails }));
                }
            } catch (e) {
                console.log(e);
            }
        }
    }, []);

    useEffect(() => {
        const key = "flea_item_draft";
        const payload = {
            name,
            price,

            // ★ 変更：sellerPlusPct だけ保存
            sellerPlusPct: plusPct,

            quantity,
            isMultiPurchasable,
            type,
            description,
            shippingFeeType,
            shipFromId,
            shipsWithinDays,
            mainIndex,
            _draftId: draftId,

            liveDetails,
            supplyDetails,
        };
        localStorage.setItem(key, JSON.stringify(payload));
    }, [
        name,
        price,
        plusPct,
        quantity,
        isMultiPurchasable,
        type,
        description,
        shippingFeeType,
        shipFromId,
        shipsWithinDays,
        mainIndex,
        draftId,
        liveDetails,
        supplyDetails,
    ]);

    // --------- 画像プレビュー URL ---------
    useEffect(() => {
        setImageUrls((prev) => {
            prev.forEach((u) => URL.revokeObjectURL(u));
            return [];
        });
        const urls = images.map((f) => URL.createObjectURL(f));
        setImageUrls(urls);
        return () => {
            urls.forEach((u) => URL.revokeObjectURL(u));
        };
    }, [images]);

    // --------- autosave payload ---------
    const buildDraftPayload = React.useCallback(() => {
        const priceStr = price && Number(price) > 0 ? String(Number(price)) : "";
        const normalizedQuantity = isMultiPurchasable ? Math.max(1, quantity) : 1;

        const details =
            type === "ANIMAL"
                ? {
                    kind: "ANIMAL",
                    locality: liveDetails.locality || null,
                    hatch_date: liveDetails.hatch_date || null,
                    generation: liveDetails.generation || null,
                    size: liveDetails.size || null,
                    sex: liveDetails.sex || "unknown",
                }
                : type === "SUPPLY"
                    ? {
                        kind: "SUPPLY",
                        brand: supplyDetails.brand || null,
                        sku: supplyDetails.sku || null,
                        net_weight_g: supplyDetails.net_weight_g ? Number(supplyDetails.net_weight_g) : null,
                    }
                    : null;

        return {
            name: name.trim() || null,
            description: description.trim() || null,
            price: priceStr,

            // ★ 変更：seller_plus_pct（int）で送る
            seller_plus_pct: plusPct,

            quantity: normalizedQuantity,
            type: type === "SUPPLY" ? "SUPPLY" : "ANIMAL",
            is_multi_purchasable: isMultiPurchasable ? 1 : 0,
            shipping_fee_type: shippingFeeType,
            ship_from_id: shipFromId === null ? null : shipFromId,
            ships_within_days: shipsWithinDays === "" ? null : Number(shipsWithinDays),
            main_image_url: null,
            details,
        };
    }, [
        name,
        description,
        price,
        plusPct,
        isMultiPurchasable,
        quantity,
        type,
        shippingFeeType,
        shipFromId,
        shipsWithinDays,
        liveDetails,
        supplyDetails,
    ]);

    function prune<T extends object>(obj: T): Partial<T> {
        return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined)) as Partial<T>;
    }

    // --------- autosave ----------
    const autosaveNow = React.useCallback(
        async (signal?: AbortSignal) => {
            try {
                setSaving("saving");
                const body = {
                    draft_id: draftId ?? undefined,
                    payload: prune(buildDraftPayload()),
                };

                const res = await axios.post<SaveDraftResponse>(CONFIG.BASE_URL + "/flea-market/draft/save", body, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "application/json",
                    },
                    signal,
                    withCredentials: true,
                    timeout: 15000,
                });

                const { draft_id, saved_at } = res.data;
                if (draft_id && draftId !== draft_id) setDraftId(draft_id);
                if (saved_at) setLastSavedAt(saved_at);
                setSaving("saved");
                setSavedOpen(true);
            } catch (e: any) {
                if (axios.isCancel?.(e) || e?.code === "ERR_CANCELED" || e?.name === "CanceledError") {
                    return;
                }

                console.error("autosave error", e);
                setSaving("error");
            }
        },
        [draftId, buildDraftPayload]
    );

    useEffect(() => {
        const controller = new AbortController();
        if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = window.setTimeout(() => {
            autosaveNow(controller.signal);
        }, AUTOSAVE_MS);
        return () => {
            controller.abort();
            if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
        };
    }, [autosaveNow, AUTOSAVE_MS]);

    // 画面離脱時ベストエフォート保存
    useEffect(() => {
        const endpoint = CONFIG.BASE_URL + "/flea-market/draft/save";
        const saveOnLeave = () => {
            try {
                const payload = {
                    draft_id: draftId,
                    payload: buildDraftPayload(),
                };
                const body = JSON.stringify(payload);
                if (navigator.sendBeacon) {
                    const blob = new Blob([body], { type: "application/json" });
                    navigator.sendBeacon(endpoint, blob);
                    return;
                }
                fetch(endpoint, {
                    method: "POST",
                    body,
                    headers: { "Content-Type": "application/json" },
                    keepalive: true,
                    credentials: "include",
                }).catch(() => void 0);
            } catch { }
        };
        const onPageHide = () => saveOnLeave();
        const onVisibilityChange = () => {
            if (document.visibilityState === "hidden") saveOnLeave();
        };
        const onBeforeUnload = () => saveOnLeave();
        const onUnload = () => saveOnLeave();

        window.addEventListener("pagehide", onPageHide);
        document.addEventListener("visibilitychange", onVisibilityChange);
        window.addEventListener("beforeunload", onBeforeUnload);
        window.addEventListener("unload", onUnload);
        return () => {
            window.removeEventListener("pagehide", onPageHide);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.removeEventListener("beforeunload", onBeforeUnload);
            window.removeEventListener("unload", onUnload);
        };
    }, [draftId, buildDraftPayload]);

    const normalizeType = (t: string): "ANIMAL" | "SUPPLY" => (t === "SUPPLY" ? "SUPPLY" : "ANIMAL");

    // --------- 送信（出品） ---------
    const doSubmit = async () => {
        if (submitting) return;
        try {
            setSubmitting(true);

            const fd = new FormData();
            fd.append("name", name.trim());
            fd.append("price", String(Number(price)));

            // ★ 変更：seller_plus_pct（0..8）を送信
            fd.append("seller_plus_pct", String(plusPct));

            fd.append("quantity", String(isMultiPurchasable ? quantity : 1));
            fd.append("is_multi_purchasable", String(isMultiPurchasable ? 1 : 0));
            fd.append("type", normalizeType(type));
            fd.append("description", description.trim());
            fd.append("shipping_fee_type", String(shippingFeeType));
            if (shipFromId !== null && shipFromId !== 0) fd.append("ship_from_id", String(shipFromId));
            if (shipsWithinDays !== "") fd.append("ships_within_days", String(shipsWithinDays));
            fd.append("main_index", String(mainIndex));
            if (draftId != null) fd.append("draft_id", String(draftId));

            images.forEach((f, i) => fd.append("images", f, f.name || `image_${i}.jpg`));

            const res = await axios.post<PublishResponse>(CONFIG.BASE_URL + "/flea-market/add/item", fd, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                withCredentials: true,
                timeout: 20000,
            });

            const newId = res.data?.itemId ?? null;

            setLastItemId(newId);
            setCompleteOpen(true);

            // 詳細の保存
            if (newId) {
                try {
                    if (type === "ANIMAL") {
                        await upsertAnimalDetails(newId, liveDetails);
                    } else if (type === "SUPPLY") {
                        await upsertSupplyDetails(newId, supplyDetails);
                    }
                } catch (e) {
                    console.error("save details failed", e);
                    toast({
                        text: "詳細情報の保存に失敗しました（出品自体は完了しています）",
                        kind: "error",
                    });
                }
            }

            // 出品が成功したら下書きを削除
            localStorage.removeItem("flea_item_draft");

            try {
                await axios.delete(CONFIG.BASE_URL + "/flea-market/draft/" + draftId, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "application/json",
                    },
                });
            } catch (e) {
                console.warn("draft delete failed", e);
            }

            toast({ text: "出品が完了しました！", kind: "success" });
        } catch (err) {
            if (axios.isAxiosError<ApiErrorBag>(err)) {
                const status = err.response?.status;
                const data = err.response?.data;
                if (status === 400 && (data as any)?.errors) {
                    const map: Record<string, string> = {};
                    for (const e of (data as ApiErrorBag).errors) map[e.field] = e.msg;
                    setErrors(map);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    return;
                }
                const msg = (data as { message?: string } | undefined)?.message ?? err.message ?? "通信に失敗しました。";
                toast({ text: msg, kind: "error" });
            } else {
                console.error(err);
                toast({ text: "不明なエラーが発生しました。", kind: "error" });
            }
        } finally {
            setSubmitting(false);
            setConfirmOpen(false);
        }
    };

    const onClickOpenConfirm = () => {
        if (!validate()) {
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        setConfirmOpen(true);
    };

    // sellerPlusPct options
    const sellerPlusPctOptions = React.useMemo(() => {
        const count = Math.round((MAX_PLUS_PCT - MIN_PLUS_PCT) / STEP_PLUS_PCT) + 1;
        return Array.from({ length: count }, (_, i) => MIN_PLUS_PCT + STEP_PLUS_PCT * i);
    }, []);

    // --------- UI ---------
    return (
        <div className="min-h-[100svh] bg-gray-50">
            {/* Sticky ヘッダー */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur">
                {/* 1段目：タイトル＆出品 */}
                <div className="border-b">
                    <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
                        <h1 className="text-lg font-semibold">出品する</h1>
                        <div className="hidden md:flex items-center gap-3">
                            <SaveIndicator saving={saving} lastSavedAt={lastSavedAt} />
                            <button
                                onClick={onClickOpenConfirm}
                                className="px-4 h-10 rounded-xl bg-black text-white disabled:opacity-60"
                                disabled={!canPublish || submitting}
                                title={!canPublish ? "基本情報・画像・配送を入力すると出品できます" : undefined}
                            >
                                {submitting ? "送信中…" : "出品する"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2段目：ステッパー */}
                <div className="border-b">
                    <div className="mx-auto max-w-3xl px-4 py-2">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 overflow-x-auto no-scrollbar">
                                <Stepper
                                    steps={[
                                        { label: "基本情報", complete: stepMainDone },
                                        { label: "詳細設定（任意）", complete: !!stepDetailsDone },
                                    ]}
                                    current={current === "main" ? 0 : 1}
                                    onSelect={(i) => setCurrent(i === 0 ? "main" : "details")}
                                />
                            </div>
                            <div className="md:hidden text-xs text-gray-600 shrink-0">
                                {canPublish
                                    ? "出品可能"
                                    : `不足: ${!stepBasicDone ? "基本情報 " : ""}${!stepImagesDone ? "画像 " : ""}${!stepShippingDone ? "配送" : ""}`}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ページ本体 */}
            <main className="max-w-3xl mx-auto px-4 py-4 space-y-6">
                {/* メインページ：基本＋画像＋配送（必須） */}
                {current === "main" && (
                    <>
                        {/* 基本情報 */}
                        <section className="bg-white rounded-2xl shadow-sm border p-4">
                            <h2 className="font-semibold mb-3">基本情報</h2>
                            <div className="space-y-3">
                                <Labeled label="商品名" error={errors.name}>
                                    <input
                                        className="input"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="例：犬用リード Mサイズ"
                                    />
                                </Labeled>

                                <Labeled label="価格(円)" error={errors.price}>
                                    <input
                                        className="input"
                                        inputMode="decimal"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="例：2980"
                                    />
                                </Labeled>

                                {/* ★ 変更：追加割引（seller_plus_pct） */}
                                <Labeled label="購入者への追加割引" error={errors.sellerPlusPct}>
                                    <div className="space-y-2">
                                        <select
                                            className="input"
                                            value={plusPct}
                                            onChange={(e) => {
                                                const v = Number(e.target.value);
                                                const next = Number.isFinite(v) ? Math.max(MIN_PLUS_PCT, Math.min(MAX_PLUS_PCT, Math.floor(v))) : 0;
                                                setSellerPlusPct(next);
                                            }}
                                        >
                                            {sellerPlusPctOptions.map((v) => (
                                                <option key={v} value={v}>
                                                    追加割引：{v === 0 ? "なし" : `+${v}%`}
                                                </option>
                                            ))}
                                        </select>

                                        {/* 追加割引の目安 */}
                                        <p className="text-xs text-gray-600">
                                            目安：この設定で最大{" "}
                                            <span className="font-semibold">+¥{maxExtraOffYen.toLocaleString()}</span>{" "}
                                            お得になります
                                        </p>

                                        <p className="text-[11px] text-gray-500 text-red-600">※ 追加割引を増やすと手数料が増える設計です。</p>

                                        <div className="rounded-xl border bg-gray-50 p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-sm">
                                                    <div className="font-semibold">入金見込み（目安） ¥{payoutYen.toLocaleString()}</div>
                                                    <div className="text-[11px] text-gray-600">
                                                        手数料 ¥{feeYen.toLocaleString()}（{Math.round(feeRate * 100)}%）
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="text-xs text-blue-600 hover:underline shrink-0"
                                                    onClick={() => setFeeOpen((v) => !v)}
                                                >
                                                    {feeOpen ? "詳細を閉じる" : "詳細"}
                                                </button>
                                            </div>

                                            {feeOpen && (
                                                <div className="mt-3 border-t pt-3 text-sm space-y-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">追加割引</span>
                                                        <span className="font-semibold">+{plusPct}%</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">手数料率</span>
                                                        <span className="font-semibold">{Math.round(feeRate * 100)}%</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">手数料（目安）</span>
                                                        <span className="font-semibold">¥{feeYen.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">入金見込み（目安）</span>
                                                        <span className="font-semibold">¥{payoutYen.toLocaleString()}</span>
                                                    </div>
                                                    <div className="pt-1 text-[11px] text-gray-500">
                                                        購入者は最大 +¥{maxExtraOffYen.toLocaleString()} 追加でお得（目安）
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Labeled>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Labeled label="数量" error={errors.quantity}>
                                        <div className="flex items-center gap-2">
                                            <button className="btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                                                －
                                            </button>
                                            <input className="input text-center w-24" readOnly value={isMultiPurchasable ? quantity : 1} />
                                            <button className="btn" onClick={() => setQuantity((q) => q + 1)} disabled={!isMultiPurchasable}>
                                                ＋
                                            </button>
                                        </div>
                                        <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                                            <input
                                                type="checkbox"
                                                checked={isMultiPurchasable}
                                                onChange={(e) => setIsMultiPurchasable(e.target.checked)}
                                            />{" "}
                                            複数購入を許可する
                                        </label>
                                    </Labeled>
                                </div>

                                <Labeled label="出品タイプ" error={errors.type}>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="type"
                                                value="ANIMAL"
                                                checked={type === "ANIMAL"}
                                                onChange={(e) => setType(e.target.value as "ANIMAL")}
                                            />
                                            生体
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="type"
                                                value="SUPPLY"
                                                checked={type === "SUPPLY"}
                                                onChange={(e) => setType(e.target.value as "SUPPLY")}
                                            />
                                            用品
                                        </label>
                                    </div>
                                </Labeled>

                                <Labeled label="商品説明" error={errors.description}>
                                    <textarea
                                        className="input min-h-[120px]"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="サイズ / 使用感 / 注意点など"
                                    />
                                </Labeled>
                            </div>
                        </section>

                        {/* 商品画像 */}
                        <section className="bg-white rounded-2xl shadow-sm border p-4">
                            <h2 className="font-semibold mb-3">商品画像</h2>
                            {errors.images && <p className="text-sm text-red-600 mb-2">{errors.images}</p>}
                            <InlineSortableImages
                                files={images}
                                onChange={(next) => {
                                    setImages(next);
                                    setMainIndex(0);
                                }}
                                onOpenAdd={() => setAddOpen(true)}
                                urls={imageUrls}
                                max={10}
                            />
                        </section>

                        {/* 配送設定 */}
                        <section className="bg-white rounded-2xl shadow-sm border p-4">
                            <h2 className="font-semibold mb-3">配送設定</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Labeled label="送料負担">
                                    <div className="flex gap-4 text-sm">
                                        <label className="flex items-center gap-2">
                                            <input type="radio" name="shipfee" checked={shippingFeeType === 0} onChange={() => setShippingFeeType(0)} />{" "}
                                            送料込み（出品者負担）
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input type="radio" name="shipfee" checked={shippingFeeType === 1} onChange={() => setShippingFeeType(1)} />{" "}
                                            着払い（購入者負担）
                                        </label>
                                    </div>
                                </Labeled>

                                <ShipFromSelect value={shipFromId} onChange={(val) => setShipFromId(val)} error={errors.shipFrom} />

                                <Labeled label="発送までの目安" error={errors.shipsWithinDays}>
                                    <select
                                        className="input"
                                        value={String(shipsWithinDays)}
                                        onChange={(e) => setShipsWithinDays(e.target.value === "" ? "" : Number(e.target.value))}
                                    >
                                        <option value="">選択してください</option>
                                        <option value="1">1日以内</option>
                                        <option value="2">2日以内</option>
                                        <option value="4">4日以内</option>
                                        <option value="7">1週間以内</option>
                                    </select>
                                </Labeled>
                            </div>
                        </section>
                    </>
                )}

                {/* 詳細ページ：完全任意 */}
                {current === "details" && (
                    <section className="bg-white rounded-2xl shadow-sm border p-4">
                        <h2 className="font-semibold mb-3">詳細（{type === "ANIMAL" ? "生体" : "用品"}・任意）</h2>

                        {type === "ANIMAL" ? (
                            <div className="grid gap-3">
                                <Labeled label="産地">
                                    <input
                                        className="input"
                                        value={liveDetails.locality}
                                        onChange={(e) => setLiveDetails({ ...liveDetails, locality: e.target.value })}
                                        placeholder="例：兵庫"
                                    />
                                </Labeled>

                                <div className="grid grid-cols-3 gap-3">
                                    <Labeled label="羽化/孵化日">
                                        <input
                                            type="date"
                                            className="input"
                                            value={liveDetails.hatch_date}
                                            onChange={(e) => setLiveDetails({ ...liveDetails, hatch_date: e.target.value })}
                                        />
                                    </Labeled>
                                    <Labeled label="累代">
                                        <input
                                            className="input"
                                            value={liveDetails.generation}
                                            onChange={(e) => setLiveDetails({ ...liveDetails, generation: e.target.value })}
                                            placeholder="F1 / CB など"
                                        />
                                    </Labeled>
                                    <Labeled label="サイズ">
                                        <input
                                            className="input"
                                            value={liveDetails.size}
                                            onChange={(e) => setLiveDetails({ ...liveDetails, size: e.target.value })}
                                            placeholder="S / M / L"
                                        />
                                    </Labeled>
                                </div>

                                <Labeled label="性別">
                                    <select
                                        className="input"
                                        value={liveDetails.sex}
                                        onChange={(e) =>
                                            setLiveDetails({
                                                ...liveDetails,
                                                sex: e.target.value as "male" | "female" | "unknown" | "pair",
                                            })
                                        }
                                    >
                                        <option value="unknown">不明</option>
                                        <option value="male">オス</option>
                                        <option value="female">メス</option>
                                    </select>
                                </Labeled>

                                <p className="text-xs text-gray-500">※ 任意項目です。公開後も編集できます。</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <Labeled label="ブランド">
                                        <input
                                            className="input"
                                            value={supplyDetails.brand}
                                            onChange={(e) => setSupplyDetails({ ...supplyDetails, brand: e.target.value })}
                                        />
                                    </Labeled>
                                    <Labeled label="SKU">
                                        <input
                                            className="input"
                                            value={supplyDetails.sku}
                                            onChange={(e) => setSupplyDetails({ ...supplyDetails, sku: e.target.value })}
                                        />
                                    </Labeled>
                                </div>

                                <Labeled label="内容量(g)">
                                    <input
                                        type="number"
                                        className="input"
                                        value={supplyDetails.net_weight_g}
                                        onChange={(e) => setSupplyDetails({ ...supplyDetails, net_weight_g: e.target.value })}
                                    />
                                </Labeled>

                                <p className="text-xs text-gray-500">※ 任意項目です。公開後も編集できます。</p>
                            </div>
                        )}
                    </section>
                )}
            </main>

            {/* スペーサー（モバイル） */}
            <div className="h-[calc(64px+env(safe-area-inset-bottom))]" />

            {/* 下部固定バー */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div className="hidden md:block text-xs text-gray-600">
                        {canPublish ? "出品可能：どのステップからでも公開できます" : "基本情報・画像・配送を入力すると出品できます"}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={goPrev} className="h-10 px-4 rounded-xl border bg-white disabled:opacity-50" disabled={current === "main"}>
                            戻る
                        </button>

                        {current === "main" && (
                            <button onClick={goNext} className="h-10 px-4 rounded-xl border bg-white">
                                詳細の追加
                            </button>
                        )}

                        <button
                            onClick={onClickOpenConfirm}
                            disabled={!canPublish || submitting}
                            className="h-10 px-4 rounded-xl bg-black text-white disabled:opacity-60"
                            title={!canPublish ? "基本情報・画像・配送を入力すると出品できます" : undefined}
                        >
                            {submitting ? "送信中…" : "出品する"}
                        </button>
                    </div>
                </div>
            </div>

            {/* 確認モーダル */}
            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={doSubmit}
                submitting={submitting}
                summary={{
                    name,
                    price: Number(price) || 0,

                    // ★ 変更：seller_plus_pct を渡す（ConfirmDialog側が未使用でも保持）
                    seller_plus_pct: plusPct,

                    quantity: isMultiPurchasable ? quantity : 1,
                    total: (Number(price) || 0) * (isMultiPurchasable ? quantity : 1),
                    isMultiPurchasable,
                    type,
                    description,
                    shippingFeeType,
                    shipFromId,
                    shipsWithinDays: shipsWithinDays === "" ? undefined : Number(shipsWithinDays),
                    mainIndex,
                    files: images,
                }}
            />

            {/* 画像追加モーダル */}
            <AddImagesModal
                open={addOpen}
                files={images}
                urls={imageUrls}
                onClose={() => setAddOpen(false)}
                onSave={(ordered) => {
                    setImages(ordered);
                    setMainIndex(0);
                    setAddOpen(false);
                }}
            />

            <TinySavedPopup open={savedOpen} onClose={() => setSavedOpen(false)} x={50} y={20} />

            <PublishCompleteDialog
                open={completeOpen}
                itemId={lastItemId}
                onClose={() => setCompleteOpen(false)}
                onContinue={() => {
                    setCompleteOpen(false);
                    resetForm();
                }}
            />
        </div>
    );
}

// 保存インジケータ
function SaveIndicator({ saving, lastSavedAt }: { saving: "idle" | "saving" | "saved" | "error"; lastSavedAt: string | null }) {
    if (saving === "saving") return <span className="text-xs text-gray-500">保存中…</span>;
    if (saving === "error") return <span className="text-xs text-red-600">保存エラー</span>;
    if (saving === "saved")
        return (
            <span className="text-[11px] text-gray-500">
                保存済み{lastSavedAt ? `（${new Date(lastSavedAt).toLocaleTimeString()}）` : ""}
            </span>
        );
    return null;
}