import React, { useEffect, useState } from "react";
import axios from "axios";

import InlineSortableImages from "../component/InlineSortableImages";
import AddImagesModal from "../modal/AddImagesModal";

import { ConfirmDialog } from "../modal/ConfirmDialog";
import { CONFIG } from "../conf/config";

// NOTE: Tailwind 前提。必要なら api クライアントに差し替えてください。
// import api from "../conf/api";

// 出品ページ本体
export default function FleaItemCreatePage() {
    // --------- フォーム状態 ---------
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [isMultiPurchasable, setIsMultiPurchasable] = useState(false);
    //const [itemState, setItemState] = useState(0); // 0=未指定,1=新品,2=未使用に近い,3=目立った傷なし,4=やや傷あり,5=傷や汚れあり
    const [type, setType] = useState("");
    const [description, setDescription] = useState("");
    const [shippingFeeType, setShippingFeeType] = useState<0 | 1>(0); // 0:送料込み,1:着払い
    const [shipFrom, setShipFrom] = useState("");
    const [shipsWithinDays, setShipsWithinDays] = useState<number | "">(2);

    const [images, setImages] = useState<File[]>([]);
    const [mainIndex, setMainIndex] = useState<number>(0);

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    //const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [imageUrls, setImageUrls] = useState<string[]>([]);

    // --------- 画像プレビュー URL ---------
    //const previews = useMemo(() => images.map((f) => URL.createObjectURL(f)), [images]);
    //useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

    // --------- バリデーション ---------
    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = "商品名を入力してください";
        const p = Number(price);
        if (!price || isNaN(p) || p <= 0) e.price = "価格は 1 以上の数値で入力してください";
        if (!isMultiPurchasable && quantity !== 1) e.quantity = "単品出品では数量は 1 固定です";
        if (quantity < 1) e.quantity = "数量は 1 以上";
        if (!description.trim()) e.description = "商品説明を入力してください";
        if (images.length === 0) e.images = "商品画像を 1 枚以上追加してください";
        if (!shipFrom.trim()) e.shipFrom = "発送元を入力してください";
        if (shipsWithinDays === "") e.shipsWithinDays = "発送目安を選択してください";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // --------- 下書き（localStorage） ---------
    useEffect(() => {
        const key = "flea_item_draft";
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const d = JSON.parse(saved);
                setName(d.name ?? "");
                setPrice(d.price ?? "");
                setQuantity(d.quantity ?? 1);
                setIsMultiPurchasable(!!d.isMultiPurchasable);
                //setItemState(d.itemState ?? 0);
                setType(d.type ?? "");
                setDescription(d.description ?? "");
                setShippingFeeType(d.shippingFeeType ?? 0);
                setShipFrom(d.shipFrom ?? "");
                setShipsWithinDays(d.shipsWithinDays ?? 2);
                setMainIndex(d.mainIndex ?? 0);
            } catch (e) {
                // intentionally ignored
                console.log(e)
            }
        }
    }, []);

    useEffect(() => {
        const key = "flea_item_draft";
        const payload = {
            name,
            price,
            quantity,
            isMultiPurchasable,
            //itemState,
            type,
            description,
            shippingFeeType,
            shipFrom,
            shipsWithinDays,
            mainIndex,
        };
        localStorage.setItem(key, JSON.stringify(payload));
    }, [name, price, quantity, isMultiPurchasable, type, description, shippingFeeType, shipFrom, shipsWithinDays, mainIndex]);

    useEffect(() => {
        // 旧URLを破棄
        setImageUrls((prev) => {
            prev.forEach((u) => URL.revokeObjectURL(u));
            return [];
        });
        // 新URLを生成
        const urls = images.map((f) => URL.createObjectURL(f));
        setImageUrls(urls);

        // ページ離脱時の最終破棄（保険）
        return () => {
            urls.forEach((u) => URL.revokeObjectURL(u));
        };
    }, [images]);
    // --------- 画像操作 ---------
    /*const onPickImages = (files: FileList | null) => {
        if (!files) return;
        const arr = Array.from(files);
        setImages((prev) => [...prev, ...arr]);
    };

    const removeImage = (idx: number) => {
        setImages((prev) => prev.filter((_, i) => i !== idx));
        if (idx === mainIndex) setMainIndex(0);
        if (idx < mainIndex) setMainIndex((m) => Math.max(0, m - 1));
    };

    const moveImage = (from: number, to: number) => {
        setImages((prev) => {
            const copy = [...prev];
            const [spliced] = copy.splice(from, 1);
            copy.splice(to, 0, spliced);
            return copy;
        });
        if (mainIndex === from) setMainIndex(to);
    };*/

    // --------- 送信 ---------
    // 送信本体は分離（確認モーダルから呼ぶ）
    const doSubmit = async () => {
        if (submitting) return;
        try {
            setSubmitting(true);

            const fd = new FormData();
            fd.append("name", name.trim());
            fd.append("price", String(Number(price)));
            fd.append("quantity", String(quantity));
            fd.append("is_multi_purchasable", String(isMultiPurchasable ? 1 : 0));
            //fd.append("item_state", String(itemState));
            fd.append("type", type);
            fd.append("description", description.trim());
            fd.append("shipping_fee_type", String(shippingFeeType));
            fd.append("ship_from", shipFrom.trim());
            if (shipsWithinDays !== "") fd.append("ships_within_days", String(shipsWithinDays)); // 空は送らない
            fd.append("main_index", String(mainIndex));
            images.forEach((f, i) => fd.append("images", f, f.name || `image_${i}.jpg`));

            for (const [k, v] of fd.entries()) {
                console.log("FD", k, v instanceof File ? `${v.name} (${v.size}B)` : v);
            }
            const res = await axios.post(CONFIG.BASE_URL + '/flea-market/add/item', fd, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                withCredentials: true,
                timeout: 20000,
            });

            console.log("レスポンス", res.data);

            // サーバが返すID等を使って遷移
            // const id = res.data?.itemId;
            localStorage.removeItem("flea_item_draft");
            alert("出品が完了しました！");
            // if (id) window.location.href = `/flea/${id}`;
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const status = err.response?.status;
                const data = err.response?.data;

                console.error("通信エラー", status, data, err.message);
                // バリデーションエラー（例: { errors: [{field, msg}, ...] }）
                if (status === 400 && data?.errors) {
                    const map: Record<string, string> = {};
                    for (const e of data.errors as Array<{ field: string; msg: string }>) {
                        map[e.field] = e.msg;
                    }
                    setErrors(map);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    return; // ここで終了（アラートは出さない）
                }

                // サーバが message を返す場合
                const msg = data?.message ?? err.message ?? "通信に失敗しました。";
                alert(msg);
            } else {
                console.error(err);
                alert("不明なエラーが発生しました。");
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

    const saveDraft = () => {
        // localStorage に既に保存しているのでトーストだけ
        alert("下書きを保存しました（自動保存）");
    };

    // --------- UI ---------
    return (
        <div className="min-h-screen bg-gray-50 pb-28 md:pb-10">
            {/* Header 置き換え可 */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <h1 className="text-lg font-semibold">出品する</h1>
                    <button
                        onClick={onClickOpenConfirm}
                        className="hidden md:inline-flex px-4 h-10 items-center rounded-xl bg-black text-white disabled:opacity-60"
                        disabled={submitting}
                    >
                        {submitting ? "送信中…" : "出品する"}
                    </button>
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-4 py-4 space-y-6">
                {/* 基本情報 */}
                <section className="bg-white rounded-2xl shadow-sm border p-4">
                    <h2 className="font-semibold mb-3">基本情報</h2>
                    <div className="space-y-3">
                        <Labeled label="商品名" error={errors.name}>
                            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：犬用リード Mサイズ" />
                        </Labeled>
                        <Labeled label="価格(円)" error={errors.price}>
                            <input className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="例：2980" />
                        </Labeled>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Labeled label="数量" error={errors.quantity}>
                                <div className="flex items-center gap-2">
                                    <button className="btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>－</button>
                                    <input className="input text-center w-24" readOnly value={quantity} />
                                    <button className="btn" onClick={() => setQuantity((q) => q + 1)}>＋</button>
                                </div>
                                <label className="mt-2 flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={isMultiPurchasable} onChange={(e) => setIsMultiPurchasable(e.target.checked)} /> 複数購入を許可する</label>
                            </Labeled>
                            {/*<Labeled label="商品の状態">
                                <select className="input" value={itemState} onChange={(e) => setItemState(Number(e.target.value))}>
                                    <option value={0}>未指定</option>
                                    s<option value={1}>新品</option>
                                    <option value={2}>未使用に近い</option>
                                    <option value={3}>目立った傷や汚れなし</option>
                                    <option value={4}>やや傷や汚れあり</option>
                                    <option value={5}>傷や汚れあり</option>
                                </select>
                            </Labeled>*/}
                        </div>
                        <Labeled label="出品タイプ">
                            <div className="flex gap-4">
                                <label>
                                    <input
                                        type="radio"
                                        name="type"
                                        value="ANIMAL"
                                        checked={type === "ANIMAL" || type === ""}
                                        onChange={(e) => setType(e.target.value)}
                                    />
                                    生体
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="type"
                                        value="SUPPLY"
                                        checked={type === "SUPPLY"}
                                        onChange={(e) => setType(e.target.value)}
                                    />
                                    用品
                                </label>
                            </div>
                        </Labeled>

                        <Labeled label="商品説明" error={errors.description}>
                            <textarea className="input min-h-[120px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="サイズ / 使用感 / 注意点など" />
                        </Labeled>
                    </div>
                </section>

                {/* 画像 */}
                <section className="bg-white rounded-2xl shadow-sm border p-4">
                    <h2 className="font-semibold mb-3">商品画像</h2>
                    {errors.images && <p className="text-sm text-red-600 mb-2">{errors.images}</p>}

                    <InlineSortableImages
                        files={images}
                        onChange={(next) => { setImages(next); setMainIndex(0); }} // 先頭=メイン
                        onOpenAdd={() => setAddOpen(true)}
                        urls={imageUrls}
                        max={10}
                    />
                </section>

                {/* 配送 */}
                <section className="bg-white rounded-2xl shadow-sm border p-4">
                    <h2 className="font-semibold mb-3">配送設定</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Labeled label="送料負担">
                            <div className="flex gap-4 text-sm">
                                <label className="flex items-center gap-2"><input type="radio" name="shipfee" checked={shippingFeeType === 0} onChange={() => setShippingFeeType(0)} /> 送料込み（出品者負担）</label>
                                <label className="flex items-center gap-2"><input type="radio" name="shipfee" checked={shippingFeeType === 1} onChange={() => setShippingFeeType(1)} /> 着払い（購入者負担）</label>
                            </div>
                        </Labeled>
                        <Labeled label="発送元" error={errors.shipFrom}>
                            <input className="input" value={shipFrom} onChange={(e) => setShipFrom(e.target.value)} placeholder="例：東京都" />
                        </Labeled>
                        <Labeled label="発送までの目安" error={errors.shipsWithinDays}>
                            <select className="input" value={String(shipsWithinDays)} onChange={(e) => setShipsWithinDays(Number(e.target.value))}>
                                <option value="">選択してください</option>
                                <option value="1">1日以内</option>
                                <option value="2">2日以内</option>
                                <option value="4">4日以内</option>
                                <option value="7">1週間以内</option>
                            </select>
                        </Labeled>
                    </div>
                </section>
            </main>

            {/* 下部固定バー（モバイル） */}
            <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur border-t">
                <div className="max-w-3xl mx-auto px-4 py-3 flex gap-3">
                    <button onClick={saveDraft} className="flex-1 h-12 rounded-xl border bg-white">下書き保存</button>
                    <button
                        onClick={onClickOpenConfirm}
                        disabled={submitting}
                        className="flex-1 h-12 rounded-xl bg-black text-white disabled:opacity-60"
                    >
                        {submitting ? "送信中…" : "出品する"}
                    </button>
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
                    quantity,
                    total: (Number(price) || 0) * quantity,
                    isMultiPurchasable,
                    type,
                    description,
                    shippingFeeType,
                    shipFrom,
                    shipsWithinDays: shipsWithinDays === "" ? undefined : Number(shipsWithinDays),
                    mainIndex,
                    files: images,   // ← File[] を渡す
                }}
            />

            {/* 画像追加モーダル */}
            <AddImagesModal
                open={addOpen}
                files={images}
                urls={imageUrls}
                onClose={() => setAddOpen(false)}
                onSave={(ordered) => { setImages(ordered); setMainIndex(0); setAddOpen(false); }} // 先頭=メイン
            />
        </div>
    );
}

// 小さなラベル付きラッパー
function Labeled({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-700">{label}</label>
                {error && <span className="text-xs text-red-600">{error}</span>}
            </div>
            {children}
        </div>
    );
}