import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../conf/api";
import { CONFIG } from "../../conf/config";
import { ArrowLeft, Upload, X, Loader2, Save } from "lucide-react";
import { SHIPPING_METHODS, SHIPPING_FEE_TYPES } from "../../conf/FleaMarket";
import { itemImage } from "../../types/Content"

export const EditItemPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // --- 基本情報 State ---
    const [type, setType] = useState<"ANIMAL" | "SUPPLY">("ANIMAL"); // 編集では変更不可だが表示制御に使う
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState<number | "">("");
    const [quantity, setQuantity] = useState<number | "">(""); // 在庫数も編集可能に
    const [shippingMethod, setShippingMethod] = useState("DELIVERY");
    const [shippingFeeType, setShippingFeeType] = useState("INCLUDED");
    const [shipFrom, setShipFrom] = useState(13);
    const [daysToShip, setDaysToShip] = useState(2);

    // --- 詳細情報 State (生体/用品 共通で管理し、タイプで使い分ける) ---
    // Animal用
    const [locality, setLocality] = useState("");
    const [hatchDate, setHatchDate] = useState("");
    const [size, setSize] = useState("");
    const [generation, setGeneration] = useState("");
    const [sex, setSex] = useState("unknown");
    // Supply用
    const [brand, setBrand] = useState("");
    const [sku, setSku] = useState("");
    const [netWeight, setNetWeight] = useState("");

    // --- 画像管理 State ---
    const [existingImages, setExistingImages] = useState<itemImage[]>([]);
    const [newImages, setNewImages] = useState<File[]>([]);
    const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

    // ---------------------------------------------------------
    // 1. データ取得 (詳細ページと同じAPIを使用)
    // ---------------------------------------------------------
    useEffect(() => {
        if (!id) return;

        const fetchItem = async () => {
            try {
                // ★ 詳細ページと同じAPIを呼ぶ
                const res = await api.get(`/flea-market/item/${id}`);
                const data = res.data;
                const item = data.item;
                const details = data.details;

                // 基本情報のセット
                setType(item.type);
                setName(item.name);
                setDescription(item.description);
                setPrice(item.price);
                setQuantity(item.quantity);
                setShippingMethod(item.shippingMethodPref || "DELIVERY"); // キャメルケース等の揺れに注意
                setShippingFeeType(item.shippingFeeType || "INCLUDED");
                setShipFrom(item.shipFrom || 13);
                setDaysToShip(item.shipsWithinDays || 2);

                // 画像のセット
                if (data.images) {
                    setExistingImages(data.images.map((img: itemImage) => ({
                        id: img.id,
                        url: CONFIG.BASE_URL + img.url
                    })));
                }

                // ★ 詳細情報のセット
                if (item.type === "ANIMAL" && details.animal_details) {
                    const d = details.animal_details;
                    setLocality(d.locality || "");
                    setHatchDate(d.hatch_date ? d.hatch_date.split("T")[0] : ""); // 日付フォーマット調整
                    setSize(d.size || "");
                    setGeneration(d.generation || "");
                    setSex(d.sex || "unknown");
                } else if (item.type === "SUPPLY" && details.supply_details) {
                    const d = details.supply_details;
                    setBrand(d.brand || "");
                    setSku(d.sku || "");
                    setNetWeight(d.net_weight_g ? String(d.net_weight_g) : "");
                }

            } catch (error) {
                console.error(error);
                alert("商品情報の取得に失敗しました");
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };
        fetchItem();
    }, [id, navigate]);

    // ---------------------------------------------------------
    // ハンドラー群 (画像追加・削除など)
    // ---------------------------------------------------------
    const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setNewImages([...newImages, file]);
            setNewImagePreviews([...newImagePreviews, URL.createObjectURL(file)]);
        }
    };

    const removeNewImage = (index: number) => {
        const updatedFiles = [...newImages];
        updatedFiles.splice(index, 1);
        setNewImages(updatedFiles);
        const updatedPreviews = [...newImagePreviews];
        URL.revokeObjectURL(updatedPreviews[index]);
        updatedPreviews.splice(index, 1);
        setNewImagePreviews(updatedPreviews);
    };

    const removeExistingImage = (index: number) => {
        const updated = [...existingImages];
        updated.splice(index, 1);
        setExistingImages(updated);
    };

    // ---------------------------------------------------------
    // 2. 更新送信
    // ---------------------------------------------------------
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !price) return alert("必須項目を入力してください");
        if (!confirm("変更内容を保存しますか？")) return;

        setSubmitting(true);
        try {
            const formData = new FormData();
            // 基本情報
            formData.append("name", name);
            formData.append("description", description);
            formData.append("price", String(price));
            formData.append("quantity", String(quantity)); // 在庫
            formData.append("shipping_method", shippingMethod);
            formData.append("shipping_fee", shippingFeeType);
            formData.append("ship_from", String(shipFrom));
            formData.append("days_to_ship", String(daysToShip));

            // ★ 詳細情報 (タイプに応じて送る)
            if (type === "ANIMAL") {
                formData.append("locality", locality);
                formData.append("hatch_date", hatchDate);
                formData.append("size", size);
                formData.append("generation", generation);
                formData.append("sex", sex);
            } else {
                formData.append("brand", brand);
                formData.append("sku", sku);
                formData.append("net_weight", netWeight);
            }

            // 画像処理
            const keptImageIds = existingImages.map(img => img.id);
            formData.append("kept_image_ids", JSON.stringify(keptImageIds));
            newImages.forEach((file) => {
                formData.append("new_images", file);
            });

            // PUTリクエスト
            await api.put(`/flea-market/items/${id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            alert("商品情報を更新しました！");
            navigate(`/flea-market/items/${id}`);
        } catch (error) {
            console.error(error);
            alert("更新に失敗しました");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-10 text-center">読み込み中...</div>;

    return (
        <div className="max-w-2xl mx-auto pb-20 bg-white min-h-screen">
            <div className="sticky top-0 z-10 bg-white border-b px-4 h-14 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="font-bold text-lg">商品の編集</h1>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">

                {/* --- 画像エリア (前回と同じなので省略可だが掲載) --- */}
                <div className="space-y-2">
                    <label className="font-bold text-sm text-gray-700">商品画像</label>
                    <div className="flex flex-wrap gap-3">
                        {existingImages.map((img, index) => (
                            <div key={`exist-${img.id}`} className="relative w-24 h-24 border rounded-lg overflow-hidden group">
                                <img src={img.url} alt="item" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => removeExistingImage(index)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500">
                                    <X size={14} />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center">登録済み</div>
                            </div>
                        ))}
                        {newImagePreviews.map((src, index) => (
                            <div key={`new-${index}`} className="relative w-24 h-24 border rounded-lg overflow-hidden">
                                <img src={src} alt="new" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => removeNewImage(index)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500">
                                    <X size={14} />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-emerald-600/80 text-white text-[10px] text-center">新規追加</div>
                            </div>
                        ))}
                        {(existingImages.length + newImages.length) < 10 && (
                            <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 transition">
                                <Upload size={24} />
                                <span className="text-xs mt-1">追加</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleAddImage} />
                            </label>
                        )}
                    </div>
                </div>

                {/* --- 基本情報 --- */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">商品名</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-xl" maxLength={40} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">商品の説明</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 border rounded-xl h-40 resize-none" maxLength={1000} />
                    </div>
                </div>

                {/* --- 詳細スペック (タイプ別出し分け) --- */}
                <div className="pt-4 border-t space-y-4">
                    <h3 className="font-bold text-gray-700">
                        {type === "ANIMAL" ? "生体詳細情報" : "用品詳細情報"}
                    </h3>

                    {type === "ANIMAL" ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">産地</label>
                                    <input type="text" value={locality} onChange={(e) => setLocality(e.target.value)} className="w-full p-3 border rounded-xl" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">羽化日</label>
                                    <input type="date" value={hatchDate} onChange={(e) => setHatchDate(e.target.value)} className="w-full p-3 border rounded-xl" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">サイズ/体長</label>
                                    <input type="text" value={size} onChange={(e) => setSize(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="例: 75mm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">累代</label>
                                    <input type="text" value={generation} onChange={(e) => setGeneration(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="例: F1, CB" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">性別</label>
                                <select value={sex} onChange={(e) => setSex(e.target.value)} className="w-full p-3 border rounded-xl bg-white">
                                    <option value="male">オス</option>
                                    <option value="female">メス</option>
                                    <option value="pair">ペア</option>
                                    <option value="unknown">不明</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-bold mb-1">ブランド/メーカー</label>
                                <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full p-3 border rounded-xl" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">SKU/型番</label>
                                    <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full p-3 border rounded-xl" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">内容量(g)</label>
                                    <input type="number" value={netWeight} onChange={(e) => setNetWeight(e.target.value)} className="w-full p-3 border rounded-xl" />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* --- 配送設定 & 価格 --- */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-bold text-gray-700">販売設定</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">在庫数</label>
                            <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full p-3 border rounded-xl" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">販売価格 (円)</label>
                            <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full p-3 border rounded-xl font-bold" min={300} />
                        </div>
                    </div>
                    <select value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50">
                        {SHIPPING_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                    <select value={shippingFeeType} onChange={(e) => setShippingFeeType(e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50">
                        {SHIPPING_FEE_TYPES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                </div>

                <div className="pt-6">
                    <button type="submit" disabled={submitting} className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${submitting ? "bg-gray-400" : "bg-red-600 hover:bg-red-700 shadow-lg"}`}>
                        {submitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                        変更を保存する
                    </button>
                </div>
            </form>
        </div>
    );
};