import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "../conf/function";
import api from "../conf/api";
import { Header } from "../component/Header";

export default function IdentityVerificationPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    // フォームデータ
    const [form, setForm] = useState({
        real_name: "",
        real_name_kana: "",
        birth_date: "",
        address: "",
    });

    // 画像ファイル管理
    const [frontImage, setFrontImage] = useState<File | null>(null);
    const [backImage, setBackImage] = useState<File | null>(null);
    // 自撮り用
    const [selfieImage, setSelfieImage] = useState<File | null>(null);

    // プレビュー用URL
    const [frontPreview, setFrontPreview] = useState<string | null>(null);
    const [backPreview, setBackPreview] = useState<string | null>(null);
    // 自撮り用
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // 画像選択時の処理 (typeに selfie を追加)
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "front" | "back" | "selfie") => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const previewUrl = URL.createObjectURL(file);

            if (type === "front") {
                setFrontImage(file);
                setFrontPreview(previewUrl);
            } else if (type === "back") {
                setBackImage(file);
                setBackPreview(previewUrl);
            } else {
                setSelfieImage(file);
                setSelfiePreview(previewUrl);
            }
        }
    };

    const handleSubmit = async () => {
        // バリデーション: 全て必須
        if (!form.real_name || !form.birth_date || !form.address || !frontImage || !backImage || !selfieImage) {
            toast({ text: "必須項目をすべて入力してください", kind: "error" });
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("real_name", form.real_name);
            formData.append("real_name_kana", form.real_name_kana);
            formData.append("birth_date", form.birth_date);
            formData.append("address", form.address);

            // 画像を詰める (nullチェック済みの前提)
            if (frontImage) formData.append("image_front", frontImage);
            if (backImage) formData.append("image_back", backImage);
            if (selfieImage) formData.append("image_selfie", selfieImage);

            await api.post("/identity/submit", formData, {
                headers: {
                "Content-Type": null, 
            }
            });

            setIsComplete(true);
            toast({ text: "申請を受け付けました", kind: "success" });
        } catch (e) {
            console.error(e);
            toast({ text: "送信に失敗しました", kind: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    // 完了画面
    if (isComplete) {
        return (
            <>
                <Header />
                <div className="min-h-screen bg-white p-6 flex flex-col items-center justify-center text-center">
                    <CheckCircle2 size={64} className="text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">申請完了</h2>
                    <p className="text-gray-500 mb-8">
                        本人確認書類の提出ありがとうございます。<br />
                        審査完了まで1〜2営業日お待ちください。
                    </p>
                    <button onClick={() => navigate("/mypage")} className="bg-gray-800 text-white font-bold py-3 px-8 rounded-full">
                        マイページへ戻る
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <Header />
            <div className="min-h-screen bg-[#f8f9fa] pb-20">
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-lg mx-auto h-14 px-4 flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-1 -ml-2 hover:bg-gray-100 rounded-full">
                            <ArrowLeft size={24} className="text-gray-600" />
                        </button>
                        <h1 className="font-bold text-lg">本人確認</h1>
                    </div>
                </div>

                <main className="max-w-lg mx-auto p-4 space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                        <p>運転免許証、マイナンバーカード、健康保険証のいずれかをご用意ください。</p>
                    </div>

                    {/* 基本情報入力 */}
                    <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <h2 className="font-bold border-b pb-2">基本情報</h2>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">氏名 (漢字)</label>
                            <input name="real_name" value={form.real_name} onChange={handleTextChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5" placeholder="例：山田 太郎" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">氏名 (カナ)</label>
                            <input name="real_name_kana" value={form.real_name_kana} onChange={handleTextChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5" placeholder="例：ヤマダ タロウ" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">生年月日</label>
                            <input type="date" name="birth_date" value={form.birth_date} onChange={handleTextChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">住所</label>
                            <input name="address" value={form.address} onChange={handleTextChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5" placeholder="例：東京都..." />
                            <p className="text-xs text-gray-400 mt-1">※提出書類と同じ住所を入力してください</p>
                        </div>
                    </section>

                    {/* 画像アップロード */}
                    <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-6">
                        <h2 className="font-bold border-b pb-2">書類画像のアップロード</h2>

                        {/* 表面 */}
                        <div>
                            <p className="text-sm font-bold text-gray-700 mb-2">表面</p>
                            <div className="relative w-full aspect-[1.6] bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden hover:bg-gray-50 transition">
                                {frontPreview ? (
                                    <>
                                        <img src={frontPreview} alt="front" className="w-full h-full object-contain" />
                                        <button onClick={() => { setFrontImage(null); setFrontPreview(null); }} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full">
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                        <Upload className="text-gray-400 mb-2" />
                                        <span className="text-sm text-gray-500 font-bold">画像をアップロード</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, "front")} />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* 裏面 */}
                        <div>
                            <p className="text-sm font-bold text-gray-700 mb-2">裏面</p>
                            <div className="relative w-full aspect-[1.6] bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden hover:bg-gray-50 transition">
                                {backPreview ? (
                                    <>
                                        <img src={backPreview} alt="back" className="w-full h-full object-contain" />
                                        <button onClick={() => { setBackImage(null); setBackPreview(null); }} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full">
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                        <Upload className="text-gray-400 mb-2" />
                                        <span className="text-sm text-gray-500 font-bold">画像をアップロード</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, "back")} />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* 自撮り */}
                        <div>
                            <p className="text-sm font-bold text-gray-700 mb-2">ご本人様確認 (自撮り)</p>
                            <p className="text-xs text-gray-400 mb-2">※免許証を手に持ち、顔と一緒に写ってください</p>
                            <div className="relative w-full aspect-[1.6] bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden hover:bg-gray-50 transition">
                                {selfiePreview ? (
                                    <>
                                        <img src={selfiePreview} alt="selfie" className="w-full h-full object-contain" />
                                        <button onClick={() => { setSelfieImage(null); setSelfiePreview(null); }} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full">
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                        <Upload className="text-gray-400 mb-2" />
                                        <span className="text-sm text-gray-500 font-bold">自撮りをアップロード</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, "selfie")} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </section>

                    <button onClick={handleSubmit} disabled={submitting} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {submitting ? <Loader2 className="animate-spin mx-auto" /> : "この内容で申請する"}
                    </button>
                </main>
            </div>
        </>
    );
}