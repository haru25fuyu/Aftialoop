import React, { useEffect, useMemo, useRef, useState } from "react";
// NOTE: Tailwind 前提。必要なら api クライアントに差し替えてください。
// import api from "../conf/api";

// 出品ページ本体
export default function FleaItemCreatePage() {
    // --------- フォーム状態 ---------
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [isMultiPurchasable, setIsMultiPurchasable] = useState(false);
    const [itemState, setItemState] = useState(0); // 0=未指定,1=新品,2=未使用に近い,3=目立った傷なし,4=やや傷あり,5=傷や汚れあり
    const [categoryId, setCategoryId] = useState("");
    const [description, setDescription] = useState("");
    const [shippingFeeType, setShippingFeeType] = useState<0 | 1>(0); // 0:送料込み,1:着払い
    const [shipFrom, setShipFrom] = useState("");
    const [shipsWithinDays, setShipsWithinDays] = useState<number | "">(2);

    const [images, setImages] = useState<File[]>([]);
    const [mainIndex, setMainIndex] = useState<number>(0);

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // --------- 画像プレビュー URL ---------
    const previews = useMemo(() => images.map((f) => URL.createObjectURL(f)), [images]);
    useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

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
                setItemState(d.itemState ?? 0);
                setCategoryId(d.categoryId ?? "");
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
            itemState,
            categoryId,
            description,
            shippingFeeType,
            shipFrom,
            shipsWithinDays,
            mainIndex,
        };
        localStorage.setItem(key, JSON.stringify(payload));
    }, [name, price, quantity, isMultiPurchasable, itemState, categoryId, description, shippingFeeType, shipFrom, shipsWithinDays, mainIndex]);

    // --------- 画像操作 ---------
    const onPickImages = (files: FileList | null) => {
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
    };

    // --------- 送信 ---------
    const submit = async () => {
        if (submitting) return;
        if (!validate()) {
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        try {
            setSubmitting(true);
            // API 連携：FormData で JSON + 画像を送る例
            const fd = new FormData();
            fd.append("name", name.trim());
            fd.append("price", String(Number(price)));
            fd.append("quantity", String(quantity));
            fd.append("is_multi_purchasable", String(isMultiPurchasable ? 1 : 0));
            fd.append("item_state", String(itemState));
            if (categoryId) fd.append("category_id", categoryId);
            fd.append("description", description.trim());
            fd.append("shipping_fee_type", String(shippingFeeType));
            fd.append("ship_from", shipFrom.trim());
            fd.append("ships_within_days", String(shipsWithinDays));
            fd.append("main_index", String(mainIndex));
            images.forEach((f, i) => fd.append("images", f, f.name || `image_${i}.jpg`));

            // ここを実装環境に合わせて差し替え
            // await api.post("/flea/items", fd, { headers: { "Content-Type": "multipart/form-data" }});
            await fakeNetwork();

            localStorage.removeItem("flea_item_draft");
            alert("出品が完了しました！");
            // 例: location.href = "/mypage/items";
        } catch (e) {
            console.error(e);
            alert("出品に失敗しました。少し間を空けて再度お試しください。");
        } finally {
            setSubmitting(false);
        }
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
                        onClick={submit}
                        className="hidden md:inline-flex px-4 h-10 items-center rounded-xl bg-black text-white disabled:opacity-60"
                        disabled={submitting}
                    >{submitting ? "送信中…" : "出品する"}</button>
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
                            <Labeled label="商品の状態">
                                <select className="input" value={itemState} onChange={(e) => setItemState(Number(e.target.value))}>
                                    <option value={0}>未指定</option>
                                    <option value={1}>新品</option>
                                    <option value={2}>未使用に近い</option>
                                    <option value={3}>目立った傷や汚れなし</option>
                                    <option value={4}>やや傷や汚れあり</option>
                                    <option value={5}>傷や汚れあり</option>
                                </select>
                            </Labeled>
                        </div>
                        <Labeled label="カテゴリ（任意）">
                            <input className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} placeholder="例：dog-accessory" />
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
                    <div className="flex gap-3 flex-wrap">
                        <button
                            className="rounded-xl border border-dashed px-4 py-8 w-40 h-40 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <span className="text-3xl">＋</span>
                            <span className="text-xs mt-1">画像を追加</span>
                            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPickImages(e.target.files)} />
                        </button>
                        {previews.map((src, i) => (
                            <div key={i} className="relative w-40 h-40 rounded-xl overflow-hidden border">
                                <img src={src} alt="preview" className="object-cover w-full h-full" />
                                <div className="absolute top-1 left-1 flex gap-1">
                                    <button className={`px-2 py-1 rounded-md text-xs ${i === mainIndex ? "bg-yellow-400 text-black" : "bg-black/60 text-white"}`} onClick={() => setMainIndex(i)}>{i === mainIndex ? "メイン" : "メインに"}</button>
                                    {i > 0 && <button className="px-2 py-1 rounded-md text-xs bg-black/60 text-white" onClick={() => moveImage(i, i - 1)}>←</button>}
                                    {i < previews.length - 1 && <button className="px-2 py-1 rounded-md text-xs bg-black/60 text-white" onClick={() => moveImage(i, i + 1)}>→</button>}
                                </div>
                                <button className="absolute bottom-1 right-1 px-2 py-1 rounded-md text-xs bg-red-500 text-white" onClick={() => removeImage(i)}>削除</button>
                            </div>
                        ))}
                    </div>
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
                    <button onClick={submit} disabled={submitting} className="flex-1 h-12 rounded-xl bg-black text-white disabled:opacity-60">{submitting ? "送信中…" : "出品する"}</button>
                </div>
            </div>
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

// 共通スタイル（Tailwind の便宜上、className をまとめ）
// index.css 等で @layer utilities にしてもOK だが、ここでは簡易に。
// .input と .btn を使ってます。
const _styles = `
`;


// 疑似API
async function fakeNetwork() {
    await new Promise((r) => setTimeout(r, 800));
}
