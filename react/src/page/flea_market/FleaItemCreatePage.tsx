import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

import InlineSortableImages from "../../component/InlineSortableImages";
import TinySavedPopup from "../../component/TinySavedPopup";
import ShipFromSelect from "../../component/ShipFromSelect";

import AddImagesModal from "../../modal/AddImagesModal";
import { ConfirmDialog } from "../../modal/ConfirmDialog";
import { PublishCompleteDialog } from "../../modal/PublishCompleteDialog";

import { CONFIG } from "../../conf/config";
import api, { getAccessToken } from "../../conf/api";
import { useToast } from "../../conf/function";
import { upsertAnimalDetails, upsertSupplyDetails } from "../../conf/fleaDetails";
import { CATEGORY_OPTIONS } from "../../conf/FleaMarket";

import { FleaItemType, ImageAsset } from "../../types/FleaMarket";

const FEE_BASE = 0.10;
const FEE_PER_PLUS_PCT = 0.01;
const FEE_MAX = 0.25;


//★修正: APIエラーの型を定義
type ApiErrorResponse = {
    message?: string;
    errors?: Array<{ field: string; msg: string }>;
};

// ★修正: 性別の型を定義
type SexType = "male" | "female" | "unknown" | "pair";

type StepKey = "main" | "details";

// ---------- Main Component ----------
export default function FleaItemCreatePage() {
    const toast = useToast();
    const navigate = useNavigate();

    // 2. パスパラメータ (:id) を取得
    const { id: pathParamId } = useParams();

    // 3. クエリパラメータ (?id=) も念のため取得（どちらでも動くようにするなら）
    const [searchParams] = useSearchParams();
    const queryParamId = searchParams.get("id");

    const targetDraftId = pathParamId || queryParamId;

    // ===== Settings =====
    const MIN_PLUS_PCT = 0;
    const MAX_PLUS_PCT = 8;
    const STEP_PLUS_PCT = 1;
    const AUTOSAVE_MS = 1500;

    // ===== States =====
    // Form States
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [sellerPlusPct, setSellerPlusPct] = useState<number>(0);
    const [quantity, setQuantity] = useState(1);
    const [isMultiPurchasable, setIsMultiPurchasable] = useState(false);
    const [type, setType] = useState<FleaItemType>("ANIMAL");
    const [description, setDescription] = useState("");
    const [shippingFeeType, setShippingFeeType] = useState<0 | 1 | 2>(0);
    const [shipFromId, setShipFromId] = useState<number | null>(null);
    const [shipsWithinDays, setShipsWithinDays] = useState<number | "">(2);
    const [images, setImages] = useState<ImageAsset[]>([]);
    const [mainIndex, setMainIndex] = useState<number>(0);

    // Details States
    const [liveDetails, setLiveDetails] = useState({
        locality: "", hatch_date: "", generation: "", size: "", sex: "unknown" as SexType,
    });
    const [supplyDetails, setSupplyDetails] = useState({
        brand: "", sku: "", net_weight_g: "",
    });

    // System States
    const [draftId, setDraftId] = useState<number | null>(null);
    const [current, setCurrent] = useState<StepKey>("main");
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const isSubmittingRef = useRef(false); //  出品中フラグ

    // UI Toggles
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [savedOpen, setSavedOpen] = useState(false);
    const [completeOpen, setCompleteOpen] = useState(false);
    const [feeOpen, setFeeOpen] = useState(false);

    const [lastItemId, setLastItemId] = useState<number | null>(null);
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");

    // ===== Refs for Autosave (Race Condition Fix) =====
    const draftIdRef = useRef<number | null>(null);
    const isSavingRef = useRef(false);
    const autosaveTimerRef = useRef<number | null>(null);

    // StateのdraftIdが変わったらRefも更新
    useEffect(() => {
        draftIdRef.current = draftId;
    }, [draftId]);

    // ===== Calculations =====
    const priceNum = Number(price) || 0;
    const plusPct = Math.max(MIN_PLUS_PCT, Math.min(MAX_PLUS_PCT, Math.floor(sellerPlusPct)));
    const feeRate = Math.min(FEE_MAX, FEE_BASE + plusPct * FEE_PER_PLUS_PCT);
    const feeYen = Math.floor(priceNum * feeRate);
    const payoutYen = Math.max(0, Math.floor(priceNum - feeYen));
    //const maxExtraOffYen = Math.max(0, Math.floor(priceNum * (plusPct / 100)));

    // ===== Step Logic =====
    const stepBasicDone = !!name.trim() && Number(price) > 0 && quantity >= 1;
    const stepImagesDone = images.length > 0;
    const stepShippingDone = !!shipFromId && shipsWithinDays !== "";
    const stepMainDone = stepBasicDone && stepImagesDone && stepShippingDone;
    //const stepDetailsDone = (type === "ANIMAL" && (!!liveDetails.locality || !!liveDetails.hatch_date)) || (type === "SUPPLY" && (!!supplyDetails.brand || !!supplyDetails.sku));
    const canPublish = stepMainDone;

    // ===== Data Helpers =====
    const normalizeType = (t: string): "ANIMAL" | "SUPPLY" => (t === "SUPPLY" ? "SUPPLY" : "ANIMAL");

    const prune = <T extends object>(obj: T): Partial<T> => {
        return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
    };

    // Payload Builder
    // Payload Builder
    const buildDraftPayload = useCallback(() => {
        const p = Number(price);

        // 価格は「文字列」に変換して送る！ (Go側の定義が string なので)
        // 数値として有効、かつ0より大きい場合のみ値を送る
        const priceVal = (price !== "" && !isNaN(p) && p > 0) ? String(p) : undefined;

        const quantityVal = isMultiPurchasable ? Math.max(1, quantity) : 1;
        const shipsDaysVal = shipsWithinDays === "" ? undefined : Number(shipsWithinDays);

        // 発送元は「数値」に変換して送る！
        // (ペイロードで "11" と文字列になっていたので、念のため数値化します)
        const shipFromVal = shipFromId ? Number(shipFromId) : undefined;

        // 詳細情報
        const details = type === "ANIMAL"
            ? {
                kind: "ANIMAL",
                locality: liveDetails.locality || undefined,
                hatch_date: liveDetails.hatch_date || undefined,
                generation: liveDetails.generation || undefined,
                size: liveDetails.size || undefined,
                sex: liveDetails.sex || "unknown",
            }
            : {
                kind: "SUPPLY",
                brand: supplyDetails.brand || undefined,
                sku: supplyDetails.sku || undefined,
                net_weight_g: (supplyDetails.net_weight_g && !isNaN(Number(supplyDetails.net_weight_g)))
                    ? Number(supplyDetails.net_weight_g)
                    : undefined,
            };

        const uploadedImages = images
            .filter(img => img.serverId && img.url)
            .map(img => ({
                id: img.id,
                serverId: img.serverId,
                url: img.url
            }));

        const mainImageUrl = uploadedImages.length > 0 ? uploadedImages[0].url : undefined;

        return {
            name: name.trim() || undefined,
            description: description.trim() || undefined,

            // 文字列として送る
            price: priceVal,

            seller_plus_pct: plusPct,
            quantity: quantityVal,
            type: normalizeType(type),
            is_multi_purchasable: isMultiPurchasable ? 1 : 0,
            shipping_fee_type: shippingFeeType,

            // 数値として送る
            ship_from: shipFromVal,

            ships_within_days: shipsDaysVal,
            details,
            uploaded_images: uploadedImages,
            main_index: mainIndex,
            main_image_url: mainImageUrl,
        };
    }, [name, description, price, plusPct, isMultiPurchasable, quantity, type, shippingFeeType, shipFromId, shipsWithinDays, liveDetails, supplyDetails, images, mainIndex]);

    // ===== Validation =====
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
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const validateStep = (key: StepKey): boolean => key === "main" ? validate() : true;

    const resetForm = useCallback(() => {
        // ユーザーに確認（誤操作防止）
        if (!window.confirm("入力内容をクリアして、新規作成に戻りますか？\n（現在の下書きへの変更は保存されません）")) {
            return;
        }

        // 1. ステートの初期化
        setName(""); setPrice(""); setSellerPlusPct(0); setQuantity(1); setIsMultiPurchasable(false);
        setType("ANIMAL"); setDescription(""); setShippingFeeType(0); setShipFromId(null); setShipsWithinDays(2);
        setImages([]); setMainIndex(0);
        setLiveDetails({ locality: "", hatch_date: "", generation: "", size: "", sex: "unknown" });
        setSupplyDetails({ brand: "", sku: "", net_weight_g: "" });

        // 2. システム状態の初期化
        setDraftId(null);
        setLastItemId(null);
        setLastSavedAt(null);
        setSaving("idle");

        // 3. ローカルストレージの削除
        localStorage.removeItem("flea_item_draft");

        // 4. URLのIDを消して、新規作成URLへ移動
        navigate("/flea-market/sell/create", { replace: true });

    }, [navigate]);

    const fetchDraftData = async (id: number) => {

        try {
            const res = await api.get(`/flea-market/draft/${id}`);
            const d = res.data;

            // 取得したデータでStateを更新
            if (d.name) setName(d.name);
            if (d.price) setPrice(d.price);
            if (typeof d.seller_plus_pct === "number") setSellerPlusPct(d.seller_plus_pct); // APIのキー名に注意
            if (d.quantity) setQuantity(d.quantity);
            if (d.type) setType(d.type);
            if (d.description) setDescription(d.description);
            if (d.shipping_fee_type !== undefined && d.shipping_fee_type !== null) {
                setShippingFeeType(Number(d.shipping_fee_type) as 0 | 1);
            }
            const sf = d.ship_from ?? d.shipFrom ?? d.ship_from_id;
            if (sf) {
                setShipFromId(Number(sf));
            }
            const days = d.ships_within_days ?? d.shipsWithinDays;
            if (days !== undefined && days !== null) {
                setShipsWithinDays(Number(days));
            }

            // ★重要: 画像の復元
            if (d.uploaded_images && Array.isArray(d.uploaded_images)) {
                const restoredImages: ImageAsset[] = d.uploaded_images.map((img: ImageAsset) => ({
                    id: img.id || Math.random().toString(36),
                    url: img.url,       // サーバー上のパス (/static/...)
                    serverId: img.serverId, // DBに保存されたID
                }));
                setImages(restoredImages);
            }

            if (d.details) {
                // ANIMALの場合
                if (d.type === "ANIMAL") {
                    setLiveDetails(prev => ({
                        ...prev,
                        ...d.details
                    }));
                }
                // SUPPLYの場合
                else if (d.type === "SUPPLY") {
                    setSupplyDetails(prev => ({
                        ...prev,
                        ...d.details
                    }));
                }
            }

            // 下書きIDと最終更新日時も同期
            setDraftId(id);
            if (d.updated_at) setLastSavedAt(d.updated_at);
            setSaving("saved");

        } catch (e) {
            console.error("Failed to fetch draft:", e);
            /// エラー（404等）なら、きれいなURLへリダイレクトして新規作成にする
            // 401(認証切れ)は api.ts が自動でリトライしてくれるので、
            // ここに来るのは「本当にデータがない(404)」か「権限がない(403)」場合がほとんどです

            // ユーザーに通知
            toast({ text: "下書きが見つからなかったため、新規作成画面に戻りました。", kind: "error" });

            // ★追加: リダイレクト前にローカルストレージのゴミを確実に消す！
            localStorage.removeItem("flea_item_draft");

            // Stateもクリア
            setDraftId(null);

            // きれいなURLへリダイレクト
            navigate("/flea-market/sell/create", { replace: true });
        }
    };

    // ===== Restore from LocalStorage =====
    useEffect(() => {
        // 1. URLパラメータ (?draft_id=123) がある場合
        if (targetDraftId) {
            const id = Number(targetDraftId);
            if (!isNaN(id) && id > 0) {
                // LocalStorageは見ずに、サーバーから直接データを取る
                fetchDraftData(id);
                return;
            }
        }

        // 2. URL指定がない場合、LocalStorage から復元
        const saved = localStorage.getItem("flea_item_draft");
        let restoredId: number | null = null;

        if (saved) {
            try {

                const d = JSON.parse(saved);
                if (d.name) setName(d.name);
                if (d.price) setPrice(d.price);
                if (typeof d.sellerPlusPct === "number") setSellerPlusPct(d.sellerPlusPct);
                if (d.quantity) setQuantity(d.quantity);
                if (d.isMultiPurchasable !== undefined) setIsMultiPurchasable(d.isMultiPurchasable);
                if (d.type) setType(d.type);
                if (d.description) setDescription(d.description);
                if (d.shippingFeeType !== undefined) setShippingFeeType(d.shippingFeeType);
                if (d.shipFromId) setShipFromId(d.shipFromId);
                if (d.shipsWithinDays) setShipsWithinDays(d.shipsWithinDays);
                if (d.mainIndex) setMainIndex(d.mainIndex);
                if (d._draftId) setDraftId(d._draftId);
                if (d.liveDetails) setLiveDetails(prev => ({ ...prev, ...d.liveDetails }));
                if (d.supplyDetails) setSupplyDetails(prev => ({ ...prev, ...d.supplyDetails }));
                if (d.uploaded_images && Array.isArray(d.uploaded_images)) {
                    const restoredImages: ImageAsset[] = d.uploaded_images.map((img: ImageAsset) => ({
                        id: img.id || Math.random().toString(36), // IDがなければ仮発行
                        url: img.url,
                        serverId: img.serverId,
                        // file: undefined  // 復元時はファイル実体はない
                    }));
                    setImages(restoredImages);
                    if (d._draftId) {
                        setDraftId(d._draftId);
                        restoredId = d._draftId;
                    }
                }

                if (d.mainIndex !== undefined) setMainIndex(d.mainIndex);


            } catch (e) { console.error(e); }
        }
        // 2. IDがあれば、サーバーから最新情報を取得して上書き（確実性のため）
        if (restoredId) {
            fetchDraftData(restoredId);
        }
    }, [targetDraftId]);

    // ===== Save to LocalStorage =====
    useEffect(() => {
        const payload = buildDraftPayload();

        // ローカルストレージにはドラフトIDなどの管理情報も一緒に保存したいのでマージ
        const save_data = {
            ...payload,
            _draftId: draftId,
            mainIndex: mainIndex, // mainIndexも保存
        };

        localStorage.setItem("flea_item_draft", JSON.stringify(save_data));
    }, [name, price, plusPct, quantity, isMultiPurchasable, type, description, shippingFeeType, shipFromId, shipsWithinDays, mainIndex, draftId, liveDetails, supplyDetails, images]);

    // ===== Autosave Logic (Corrected) =====
    const autosaveNow = useCallback(async (signal?: AbortSignal) => {
        if (isSavingRef.current || isSubmittingRef.current) return;

        const rawPayload = buildDraftPayload();

        if (Number.isNaN(rawPayload.price)) rawPayload.price = undefined;

        const payload = prune(rawPayload);
        const currentId = draftIdRef.current;

        try {
            isSavingRef.current = true;
            setSaving("saving");

            const body = {
                draft_id: currentId ?? undefined,
                payload,
            };

            const res = await api.post("/flea-market/draft/save", body, {
                signal: signal,
            });

            const { draft_id, saved_at } = res.data;

            if (draft_id) {
                draftIdRef.current = draft_id;
                setDraftId(prev => (prev !== draft_id ? draft_id : prev));
            }
            if (saved_at) setLastSavedAt(saved_at);

            setSaving("saved");
            setSavedOpen(true);

        } catch (e: unknown) {
            if (axios.isCancel(e)) return;
            console.error("autosave error", e);
            setSaving("error");
        } finally {
            isSavingRef.current = false;
        }
    }, [buildDraftPayload]);

    // Debounce Timer
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

    // Save on Leave
    useEffect(() => {
        const endpoint = CONFIG.BASE_URL + "/flea-market/draft/save";
        const saveOnLeave = () => {
            if (isSubmittingRef.current) return;
            try {
                if (getAccessToken() == null) return;
                const currentId = draftIdRef.current;
                const body = JSON.stringify({
                    draft_id: currentId,
                    payload: buildDraftPayload(),
                });

                fetch(endpoint, {
                    method: "POST",
                    body,
                    keepalive: true,
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                }).catch(() => void 0);
            } catch {
                // ignore
            }
        };


        const onPageHide = () => saveOnLeave();
        const onVisibilityChange = () => { if (document.visibilityState === "hidden") saveOnLeave(); };
        const onBeforeUnload = () => saveOnLeave();

        window.addEventListener("pagehide", onPageHide);
        document.addEventListener("visibilitychange", onVisibilityChange);
        window.addEventListener("beforeunload", onBeforeUnload);

        return () => {
            window.removeEventListener("pagehide", onPageHide);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.removeEventListener("beforeunload", onBeforeUnload);
        };
    }, [buildDraftPayload]);


    // ===== Submit (Publish) =====
    const doSubmit = async () => {
        if (submitting) return;

        // 出品開始フラグを立てる
        isSubmittingRef.current = true;
        // 待機中のオートセーブがあればキャンセル
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

        try {
            setSubmitting(true);
            const fd = new FormData();
            fd.append("name", name.trim());
            fd.append("price", String(Number(price)));
            fd.append("seller_plus_pct", String(plusPct));
            fd.append("quantity", String(isMultiPurchasable ? quantity : 1));
            fd.append("is_multi_purchasable", String(isMultiPurchasable ? 1 : 0));
            fd.append("type", normalizeType(type));
            fd.append("description", description.trim());
            fd.append("shipping_fee_type", String(shippingFeeType));
            if (shipFromId !== null) fd.append("ship_from_id", String(shipFromId));
            if (shipsWithinDays !== "") fd.append("ships_within_days", String(shipsWithinDays));
            fd.append("main_index", String(mainIndex));
            if (draftId != null) fd.append("draft_id", String(draftId));
            images.forEach((img, i) => {
                // パターンA: 既にサーバーにある画像がある場合 (IDを送る)
                if (img.serverId) {
                    fd.append("image_ids", String(img.serverId));
                }
                // パターンB: アップロード未完了のファイルがある場合 (実体を送る)
                else if (img.file) {
                    fd.append("images", img.file, img.file.name || `image_${i}.jpg`);
                }
            });

            const res = await api.post("/flea-market/add/item", fd, {
                headers: { "Content-Type": undefined }
            });

            const newId = res.data?.itemId ?? null;
            setLastItemId(newId);
            setCompleteOpen(true);

            // Save Details
            if (newId) {
                try {
                    if (type === "ANIMAL") {
                        // ★修正: liveDetails as any を追加して型エラーを回避
                        await upsertAnimalDetails(newId, liveDetails);
                    } else if (type === "SUPPLY") {
                        await upsertSupplyDetails(newId, supplyDetails);
                    }
                } catch (e) {
                    console.error("save details failed", e);
                    toast({ text: "詳細情報の保存に失敗しました（出品自体は完了しています）", kind: "error" });
                }
            }

            // Cleanup Draft
            localStorage.removeItem("flea_item_draft");
            if (draftId) {
                try {
                    await api.delete(CONFIG.BASE_URL + "/flea-market/draft/" + draftId);
                } catch {
                    // ignore
                }
            }
            toast({ text: "出品が完了しました！", kind: "success" });

        } catch (err: unknown) { // ★修正: any -> unknown
            if (axios.isAxiosError(err)) { // ★修正: isAxiosErrorの型ガードを使用
                // ApiErrorResponse 型として扱う
                const data = err.response?.data as ApiErrorResponse | undefined;
                if (err.response?.status === 400 && data?.errors) {
                    const map: Record<string, string> = {};
                    for (const e of data.errors) map[e.field] = e.msg;
                    setErrors(map);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    return;
                }
                const msg = data?.message ?? err.message ?? "通信に失敗しました。";
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

    // ===== Render Helpers =====
    const goNext = () => {
        if (current === "main") {
            if (!validateStep("main")) {
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }
            setCurrent("details");
        }
    };
    const goPrev = () => { if (current === "details") setCurrent("main"); };


    // 画像アップロード関数
    const uploadImageFile = async (file: File): Promise<{ url: string; serverId: number } | null> => {
        try {
            const fd = new FormData();
            fd.append("image", file);

            // ★修正: Content-Type を undefined にして、ブラウザに任せる
            const res = await api.post("/flea-market/upload/temp", fd, {
                headers: { "Content-Type": undefined }
            });

            return { url: res.data.url, serverId: res.data.id };
        } catch (e) {
            console.error("Upload failed", e);
            return null;
        }
    };

    // AddImagesModalからの保存時の処理
    const handleAddImages = async (nextImages: ImageAsset[]) => {
        // まず画面に反映（プレビュー表示）
        setImages(nextImages);
        setAddOpen(false);

        // 新規画像（fileがあり、かつ serverIdがない）のみアップロード
        const uploadedAssets = await Promise.all(
            nextImages.map(async (img) => {
                // すでにアップロード済みならスキップ
                if (img.serverId) return img;

                // サーバー画像(fileなし)もスキップ
                if (!img.file) return img;

                // 新規画像のみアップロード実行
                const result = await uploadImageFile(img.file);
                if (result) {
                    return { ...img, url: result.url, serverId: result.serverId };
                }
                return img; // 失敗時はそのまま
            })
        );

        // アップロード完了後の情報で再度更新
        setImages(uploadedAssets);
    };

    const sellerPlusPctOptions = useMemo(() =>
        Array.from({ length: Math.round((MAX_PLUS_PCT - MIN_PLUS_PCT) / STEP_PLUS_PCT) + 1 }, (_, i) => MIN_PLUS_PCT + STEP_PLUS_PCT * i),
        []);

    // ... (ロジック部分はそのまま)

    // スタイル定数（共通化して統一感を出す）
    const inputClass = "w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3 transition-colors";
    const labelClass = "block mb-2 text-sm font-bold text-gray-700";
    const sectionClass = "bg-white p-5 md:p-6 rounded-xl border border-gray-200 shadow-sm";

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-gray-800 font-sans pb-32">
            {/* Header: シンプルな白背景 */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
                <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
                    <h1 className="font-bold text-base">
                        {draftId ? "下書きを編集" : "商品の情報を入力"}
                    </h1>

                    <div className="flex items-center gap-3">
                        <SaveIndicator saving={saving} lastSavedAt={lastSavedAt} />

                        {/* 手動保存ボタン */}
                        <button
                            onClick={() => autosaveNow()}
                            disabled={saving === "saving"}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 border border-blue-600 rounded px-2 py-1 disabled:opacity-50"
                        >
                            保存
                        </button>

                        {/* クリアボタン（前回追加したもの） */}
                        <button
                            onClick={resetForm}
                            className="text-xs text-gray-500 hover:text-red-600 underline"
                        >
                            {draftId ? "新規にする" : "クリア"}
                        </button>
                    </div>
                </div>
                {/* Stepper: 線だけのシンプル版 */}
                <div className="max-w-lg mx-auto px-4 h-1 flex w-full">
                    <div className={`h-full transition-all duration-300 ${current === 'main' ? 'w-1/2 bg-blue-600' : 'w-full bg-green-500'}`} />
                    <div className="h-full w-full bg-gray-200" />
                </div>
            </div>

            {/* Main Content: 幅をスマホサイズ(max-w-lg)に制限して中央寄せ */}
            <main className="py-6 space-y-6 pb-0 max-w-xl mx-auto pt-6 px-4">

                {current === "main" && (
                    <>
                        {/* 画像アップロード */}
                        <section className={sectionClass}>
                            <div className="flex items-center justify-between mb-4">
                                <label className={labelClass}>
                                    商品画像 <span className="text-red-500 ml-1">*</span>
                                </label>

                                {/* 右上のエリア */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                        {images.length} / 10
                                    </span>

                                    {/* ★追加: ここにボタンを設置 */}
                                    <button
                                        type="button"
                                        onClick={() => setAddOpen(true)}
                                        disabled={images.length >= 10}
                                        className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ＋画像を追加
                                    </button>
                                </div>
                            </div>

                            {errors.images && (
                                <p className="text-sm text-red-500 mb-3 bg-red-50 p-3 rounded-lg flex items-center gap-2">
                                    ⚠️ {errors.images}
                                </p>
                            )}

                            <div className="min-h-[120px]">
                                <InlineSortableImages
                                    files={images}
                                    onChange={(next) => { setImages(next); setMainIndex(0); }}
                                    onOpenAdd={() => setAddOpen(true)}
                                    max={10}
                                />
                            </div>
                        </section>

                        {/* 基本情報 */}
                        <section className={sectionClass}>
                            <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">基本情報</h2>

                            <div className="space-y-6">
                                <div>
                                    <label className={labelClass}>商品名 <span className="text-red-500">*</span></label>
                                    <input
                                        className={inputClass}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="商品名（必須 40文字まで）"
                                    />
                                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className={labelClass}>商品の説明 <span className="text-red-500">*</span></label>
                                    <textarea
                                        className={`${inputClass} min-h-[150px] resize-none`}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="商品の色、素材、状態、重さ、定価などを記載しましょう"
                                    />
                                    {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>カテゴリー</label>
                                        <div className="relative">
                                            <select
                                                className={`${inputClass} appearance-none cursor-pointer`}
                                                value={type}
                                                onChange={(e) => setType(e.target.value as FleaItemType)}
                                            >
                                                {CATEGORY_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.icon} {option.label}
                                                    </option>
                                                ))}
                                            </select>

                                            {/* ドロップダウンの矢印アイコン（装飾） */}
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>数量</label>
                                        <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden h-[50px]">
                                            <button className="w-10 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 border-r" onClick={() => setQuantity(q => Math.max(1, q - 1))}>－</button>
                                            <div className="flex-1 text-center font-bold text-lg">{isMultiPurchasable ? quantity : 1}</div>
                                            <button className="w-10 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 border-l disabled:opacity-50" onClick={() => setQuantity(q => q + 1)} disabled={!isMultiPurchasable}>＋</button>
                                        </div>
                                        <label className="flex items-center gap-2 mt-2 text-xs text-gray-600 justify-end cursor-pointer">
                                            <input type="checkbox" className="rounded text-blue-600" checked={isMultiPurchasable} onChange={(e) => setIsMultiPurchasable(e.target.checked)} />
                                            複数購入可
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 配送について */}
                        <section className={sectionClass}>
                            <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">配送について</h2>
                            <div className="space-y-6">
                                <div>
                                    <label className={labelClass}>配送料の負担</label>
                                    <div className="flex gap-2">
                                        {/* 0: 送料込み */}
                                        <label className={`flex-1 cursor-pointer border rounded-lg p-3 text-sm text-center transition-all ${shippingFeeType === 0 ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                                            <input type="radio" className="hidden" checked={shippingFeeType === 0} onChange={() => setShippingFeeType(0)} />
                                            送料込み
                                        </label>

                                        {/* 1: 着払い */}
                                        <label className={`flex-1 cursor-pointer border rounded-lg p-3 text-sm text-center transition-all ${shippingFeeType === 1 ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                                            <input type="radio" className="hidden" checked={shippingFeeType === 1} onChange={() => setShippingFeeType(1)} />
                                            着払い
                                        </label>

                                        {/* 2: 送料別（後から追加） */}
                                        <label className={`flex-1 cursor-pointer border rounded-lg p-3 text-sm text-center transition-all ${shippingFeeType === 2 ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                                            <input type="radio" className="hidden" checked={shippingFeeType === 2} onChange={() => setShippingFeeType(2)} />
                                            送料別
                                        </label>
                                    </div>
                                    {/* 補足テキストを入れると親切です */}
                                    <p className="text-xs text-gray-500 mt-2">
                                        {shippingFeeType === 0 && "出品者が送料を負担します。"}
                                        {shippingFeeType === 1 && "商品受け取り時に購入者が送料を支払います。"}
                                        {shippingFeeType === 2 && "購入後に送料を計算し、別途請求します。"}
                                    </p>
                                </div>

                                <div>
                                    <label className={labelClass}>発送元の地域</label>
                                    <ShipFromSelect value={shipFromId} onChange={setShipFromId} error={errors.shipFrom} />
                                </div>

                                <div>
                                    <label className={labelClass}>発送までの日数</label>
                                    <select className={inputClass} value={shipsWithinDays} onChange={(e) => setShipsWithinDays(e.target.value === "" ? "" : Number(e.target.value))}>
                                        <option value="">選択してください</option>
                                        <option value="1">1〜2日で発送</option>
                                        <option value="2">2〜3日で発送</option>
                                        <option value="4">4〜7日で発送</option>
                                    </select>
                                    {errors.shipsWithinDays && <p className="text-xs text-red-500 mt-1">{errors.shipsWithinDays}</p>}
                                </div>
                            </div>
                        </section>

                        {/* 価格設定 */}
                        <section className={sectionClass}>
                            <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">販売価格</h2>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <label className="font-bold text-gray-700 whitespace-nowrap">価格</label>
                                    <div className="relative w-full">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <span className="text-gray-500 font-bold">¥</span>
                                        </div>
                                        <input
                                            className={`${inputClass} pl-8 text-right text-lg font-bold`}
                                            inputMode="decimal"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                {errors.price && <p className="text-xs text-red-500 text-right">{errors.price}</p>}

                                {/* 利益計算部分（シンプルに） */}
                                <div className="space-y-3 pt-4 border-t border-dashed border-gray-200">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">販売手数料 ({Math.round(feeRate * 100)}%)</span>
                                        <span className="text-gray-800">¥{feeYen.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-lg font-bold">
                                        <span className="text-gray-800">販売利益</span>
                                        <span className="text-blue-600">¥{payoutYen.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* 追加割引オプション（アコーディオン風） */}
                                <div className="pt-2">
                                    <button
                                        className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 w-full justify-end"
                                        onClick={() => setFeeOpen(!feeOpen)}
                                    >
                                        {feeOpen ? "▲ オプションを閉じる" : "▼ 購入者割引を設定する（任意）"}
                                    </button>

                                    {feeOpen && (
                                        <div className="mt-3 bg-gray-50 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-gray-700">割引率</span>
                                                <select className="bg-white border border-gray-300 rounded px-2 py-1 text-sm" value={plusPct} onChange={(e) => setSellerPlusPct(Number(e.target.value))}>
                                                    {sellerPlusPctOptions.map((v) => <option key={v} value={v}>{v === 0 ? "設定なし" : `+${v}%`}</option>)}
                                                </select>
                                            </div>
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                売上から少し手数料を多く払うことで、購入者にポイント還元などのメリットを提供し、売れやすくします。
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {/* 詳細画面 */}
                {current === "details" && (
                    <section className={sectionClass}>
                        <h2 className="text-lg font-bold mb-6 pb-2 border-b border-gray-100">詳細情報（任意）</h2>
                        {type === "ANIMAL" ? (
                            <div className="space-y-6">
                                <div>
                                    <label className={labelClass}>産地</label>
                                    <input className={inputClass} value={liveDetails.locality} onChange={(e) => setLiveDetails({ ...liveDetails, locality: e.target.value })} placeholder="例：兵庫県 川西市" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>羽化日</label>
                                        <input type="date" className={inputClass} value={liveDetails.hatch_date} onChange={(e) => setLiveDetails({ ...liveDetails, hatch_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>サイズ</label>
                                        <input className={inputClass} value={liveDetails.size} onChange={(e) => setLiveDetails({ ...liveDetails, size: e.target.value })} placeholder="例：75mm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>累代</label>
                                        <input className={inputClass} value={liveDetails.generation} onChange={(e) => setLiveDetails({ ...liveDetails, generation: e.target.value })} placeholder="例：CBF1" />
                                    </div>
                                    <div>
                                        <label className={labelClass}>性別</label>
                                        <select className={inputClass} value={liveDetails.sex} onChange={(e) => setLiveDetails({ ...liveDetails, sex: e.target.value as SexType })}>
                                            <option value="unknown">不明</option>
                                            <option value="male">オス</option>
                                            <option value="female">メス</option>
                                            <option value="pair">ペア</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div><label className={labelClass}>ブランド名</label><input className={inputClass} value={supplyDetails.brand} onChange={(e) => setSupplyDetails({ ...supplyDetails, brand: e.target.value })} /></div>
                                <div><label className={labelClass}>SKU / 型番</label><input className={inputClass} value={supplyDetails.sku} onChange={(e) => setSupplyDetails({ ...supplyDetails, sku: e.target.value })} /></div>
                                <div><label className={labelClass}>内容量(g)</label><input type="number" className={inputClass} value={supplyDetails.net_weight_g} onChange={(e) => setSupplyDetails({ ...supplyDetails, net_weight_g: e.target.value })} /></div>
                            </div>
                        )}
                    </section>
                )}
            </main>

            {/* フッターに隠れないよう、たっぷり余白をとるスペーサー */}
            <div className="h-32 md:h-10" />

            {/* Footer Bar: 固定フッター（最も安定するUI） */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
                <div className="max-w-lg mx-auto flex gap-3">
                    <button
                        onClick={goPrev}
                        className="flex-1 bg-gray-100 text-gray-700 font-bold h-12 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={current === "main"}
                    >
                        戻る
                    </button>

                    {current === "main" ? (
                        <button
                            onClick={goNext}
                            className="flex-[2] bg-gray-800 text-white font-bold h-12 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            次へ（詳細設定）
                        </button>
                    ) : null}

                    <button
                        onClick={onClickOpenConfirm}
                        disabled={!canPublish || submitting}
                        className={`flex-[2] font-bold h-12 rounded-lg transition-colors text-white ${!canPublish || submitting ? "bg-gray-300 cursor-not-allowed" : "bg-red-500 hover:bg-red-600 shadow-md"
                            }`}
                    >
                        {submitting ? "出品中..." : "出品する"}
                    </button>
                </div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={doSubmit}
                submitting={submitting}
                summary={{
                    name,
                    price: Number(price) || 0,
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
                    details: type === "ANIMAL" ? liveDetails : supplyDetails,
                    images: images,
                }} />
            <AddImagesModal open={addOpen} initialImages={images} onClose={() => setAddOpen(false)} onSave={handleAddImages} />
            <TinySavedPopup open={savedOpen} onClose={() => setSavedOpen(false)} x={50} y={20} />
            <PublishCompleteDialog open={completeOpen} itemId={lastItemId} onClose={() => setCompleteOpen(false)} onContinue={() => { setCompleteOpen(false); resetForm(); }} />
        </div>
    );
}

function SaveIndicator({ saving, lastSavedAt }: { saving: "idle" | "saving" | "saved" | "error"; lastSavedAt: string | null }) {
    if (saving === "saving") return <span className="text-xs text-gray-500">保存中…</span>;
    if (saving === "error") return <span className="text-xs text-red-600">保存エラー</span>;
    if (saving === "saved") return <span className="text-[11px] text-gray-500">保存済み{lastSavedAt ? `（${new Date(lastSavedAt).toLocaleTimeString()}）` : ""}</span>;
    return null;
}