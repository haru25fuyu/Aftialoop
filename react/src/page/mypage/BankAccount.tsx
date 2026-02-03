import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Building2, ChevronDown, Pencil, X } from "lucide-react";
import { AxiosError } from "axios";

import api from "../../conf/api";
import { useToast } from "../../conf/function";
import ToastProvider from "../../component/ToastProvider";
import Header from "../../component/Header";

// 型定義
interface BankAccount {
    bank_name: string;
    bank_code: string;
    branch_name: string;
    branch_code: string;
    account_type: number;
    account_number: string;
    account_holder_name: string;
}

interface ZenginBank {
    code: string;
    name: string;
    kana: string;
}
interface ZenginBranch {
    code: string;
    name: string;
    kana: string;
}

function BankAccountContent() {
    const navigate = useNavigate();
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // ★ モード管理フラグ
    const [isEditing, setIsEditing] = useState(false); // 編集中かどうか
    const [hasAccount, setHasAccount] = useState(false); // 登録済みかどうか

    // データリスト
    const [allBanks, setAllBanks] = useState<ZenginBank[]>([]);
    const [currentBranches, setCurrentBranches] = useState<ZenginBranch[]>([]);

    const [showBankSuggest, setShowBankSuggest] = useState(false);
    const [showBranchSuggest, setShowBranchSuggest] = useState(false);

    const [filteredBanks, setFilteredBanks] = useState<ZenginBank[]>([]);
    const [filteredBranches, setFilteredBranches] = useState<ZenginBranch[]>([]);

    const [form, setForm] = useState<BankAccount>({
        bank_name: "",
        bank_code: "",
        branch_name: "",
        branch_code: "",
        account_type: 1,
        account_number: "",
        account_holder_name: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const bankRef = useRef<HTMLDivElement>(null);
    const branchRef = useRef<HTMLDivElement>(null);

    // 初期データ取得
    useEffect(() => {
        const init = async () => {
            try {
                // 1. 銀行マスター
                const bankRes = await fetch("https://zengin-code.github.io/api/banks.json");
                if (bankRes.ok) {
                    const data = await bankRes.json();
                    setAllBanks(Object.values(data) as ZenginBank[]);
                }

                // 2. ユーザーデータ
                try {
                    const res = await api.get("/user/bank-account");
                    if (res.data) {
                        setForm({
                            bank_name: res.data.bank_name || "",
                            bank_code: res.data.bank_code || "",
                            branch_name: res.data.branch_name || "",
                            branch_code: res.data.branch_code || "",
                            account_type: Number(res.data.account_type) || 1,
                            account_number: res.data.account_number || "",
                            account_holder_name: res.data.account_holder_name || "",
                        });
                        setHasAccount(true);   // データあり
                        setIsEditing(false);   // 閲覧モード
                    }
                } catch (e) {
                    const error = e as AxiosError;
                    // 404なら未登録 -> 編集モードで開始
                    if (error.response?.status === 404) {
                        setHasAccount(false);
                        setIsEditing(true);
                    } else {
                        console.error(e);
                    }
                }
            } finally {
                setLoading(false);
            }
        };
        init();

        const handleClickOutside = (event: MouseEvent) => {
            if (bankRef.current && !bankRef.current.contains(event.target as Node)) setShowBankSuggest(false);
            if (branchRef.current && !branchRef.current.contains(event.target as Node)) setShowBranchSuggest(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleChange = (key: keyof BankAccount, value: string | number) => {
        setForm(prev => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors(prev => ({ ...prev, [key]: "" }));
    };

    // ... (サジェスト関連のロジックは変更なし) ...
    const handleBankNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        handleChange("bank_name", val);
        if (form.bank_code) handleChange("bank_code", "");
        if (val) {
            const filtered = allBanks.filter(b => b.name.includes(val) || b.kana.includes(val));
            setFilteredBanks(filtered);
            setShowBankSuggest(true);
        } else {
            setFilteredBanks([]);
            setShowBankSuggest(false);
        }
    };

    const selectBank = async (bank: ZenginBank) => {
        setForm(prev => ({ ...prev, bank_name: bank.name, bank_code: bank.code, branch_name: "", branch_code: "" }));
        setShowBankSuggest(false);
        try {
            const res = await fetch(`https://zengin-code.github.io/api/branches/${bank.code}.json`);
            if (res.ok) {
                const data = await res.json();
                setCurrentBranches(Object.values(data) as ZenginBranch[]);
            } else setCurrentBranches([]);
        } catch { setCurrentBranches([]); }
    };

    const handleBranchNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        handleChange("branch_name", val);
        if (form.branch_code) handleChange("branch_code", "");
        if (!form.bank_code) { toast({ text: "先に銀行を選択してください", kind: "error" }); return; }
        if (val) {
            const filtered = currentBranches.filter(b => b.name.includes(val) || b.kana.includes(val));
            setFilteredBranches(filtered);
            setShowBranchSuggest(true);
        } else {
            setFilteredBranches([]);
            setShowBranchSuggest(false);
        }
    };

    const selectBranch = (branch: ZenginBranch) => {
        setForm(prev => ({ ...prev, branch_name: branch.name, branch_code: branch.code }));
        setShowBranchSuggest(false);
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.bank_name) e.bank_name = "銀行名を入力してください";
        if (!form.bank_code) e.bank_code = "銀行名を選択してください";
        if (!form.branch_name) e.branch_name = "支店名を入力してください";
        if (!form.branch_code) e.branch_code = "支店名を選択してください";
        if (!form.account_number) e.account_number = "口座番号を入力してください";
        if (!/^\d{7}$/.test(form.account_number)) e.account_number = "口座番号は通常7桁の半角数字です";
        if (!form.account_holder_name) e.account_holder_name = "口座名義を入力してください";
        if (!/^[ァ-ンヴー\s\u3000]+$/.test(form.account_holder_name)) {
            e.account_holder_name = "全角カタカナで入力してください";
        }
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            toast({ text: "入力内容を確認してください", kind: "error" });
            return;
        }
        setSubmitting(true);
        try {
            await api.post("/user/bank-account", form, { headers: { 'Content-Type': 'application/json' } });
            toast({ text: "口座情報を保存しました", kind: "success" });
            setHasAccount(true);
            setIsEditing(false); // 保存後は閲覧モードへ
        } catch (e) {
            console.error(e);
            toast({ text: "保存に失敗しました", kind: "error" });
        } finally {
            setSubmitting(false);
        }
    };

    // キャンセルボタン
    const handleCancel = () => {
        if (hasAccount) {
            setIsEditing(false);
            // 本来はここでフォームを元の値に戻すリセット処理を入れるとより丁寧ですが、今回は省略
            window.location.reload(); // 一番簡単なリセット方法
        } else {
            navigate(-1); // 未登録なら前の画面に戻る
        }
    };

    const labelClass = "block mb-1 text-sm font-bold text-gray-700";
    const inputClass = "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5";
    const errorClass = "text-xs text-red-500 mt-1";

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <>
            <Header />
            <div className="min-h-screen bg-[#f8f9fa] pb-20">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-lg mx-auto h-14 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(-1)} className="p-1 -ml-2 hover:bg-gray-100 rounded-full">
                                <ArrowLeft size={24} className="text-gray-600" />
                            </button>
                            <h1 className="font-bold text-lg">振込口座の設定</h1>
                        </div>
                    </div>
                </div>

                <main className="max-w-lg mx-auto p-4 space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 flex gap-3">
                        <Building2 className="shrink-0" size={20} />
                        <div>
                            <p className="font-bold mb-1">売上金の振込先</p>
                            <p className="text-xs opacity-80">ご本人名義の口座を登録してください。</p>
                        </div>
                    </div>

                    {/* ================================ */}
                    {/* ★ 表示モード (閲覧用) */}
                    {/* ================================ */}
                    {!isEditing && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-5 space-y-6">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 mb-1">金融機関</h3>
                                    <div className="text-base font-bold text-gray-800">
                                        {form.bank_name} <span className="text-sm font-normal text-gray-500">({form.bank_code})</span>
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        {form.branch_name} <span className="text-xs text-gray-400">({form.branch_code})</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 mb-1">口座種別</h3>
                                        <div className="text-gray-800">{form.account_type === 1 ? "普通" : form.account_type === 2 ? "当座" : "貯蓄"}</div>
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 mb-1">口座番号</h3>
                                        <div className="text-gray-800 font-mono tracking-wider">{form.account_number}</div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 mb-1">口座名義</h3>
                                    <div className="text-gray-800">{form.account_holder_name}</div>
                                </div>
                            </div>

                            <div className="bg-gray-50 px-5 py-4 border-t border-gray-100">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                                >
                                    <Pencil size={18} />
                                    変更する
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ================================ */}
                    {/* ★ 編集モード (フォーム) */}
                    {/* ================================ */}
                    {isEditing && (
                        <>
                            <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b pb-2 mb-4">
                                    <h2 className="font-bold">銀行・支店</h2>
                                    {hasAccount && (
                                        <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>

                                {/* 銀行入力 */}
                                <div className="relative" ref={bankRef}>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2">
                                            <label className={labelClass}>銀行名</label>
                                            <div className="relative">
                                                <input
                                                    className={inputClass}
                                                    placeholder="例：三菱 (入力で候補表示)"
                                                    value={form.bank_name}
                                                    onChange={handleBankNameChange}
                                                    onFocus={() => { if (form.bank_name && filteredBanks.length > 0) setShowBankSuggest(true); }}
                                                    autoComplete="off"
                                                />
                                                {filteredBanks.length > 0 && showBankSuggest && <ChevronDown className="absolute right-2 top-3 text-gray-400 pointer-events-none" size={16} />}
                                            </div>
                                            {errors.bank_name && <p className={errorClass}>{errors.bank_name}</p>}
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>コード</label>
                                            <input className={`${inputClass} bg-gray-100 cursor-not-allowed`} readOnly value={form.bank_code} placeholder="自動" />
                                            {errors.bank_code && <p className={errorClass}>{errors.bank_code}</p>}
                                        </div>
                                    </div>
                                    {showBankSuggest && filteredBanks.length > 0 && (
                                        <div className="absolute z-20 top-[70px] left-0 w-2/3 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {filteredBanks.map((bank) => (
                                                <button key={bank.code} onClick={() => selectBank(bank)} className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0">
                                                    <span className="font-bold text-gray-800">{bank.name}</span>
                                                    <span className="text-xs text-gray-500 ml-2">({bank.code})</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 支店入力 */}
                                <div className="relative" ref={branchRef}>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2">
                                            <label className={labelClass}>支店名</label>
                                            <input
                                                className={inputClass}
                                                placeholder={form.bank_code ? "例：本店 (入力で候補表示)" : "先に銀行を選択"}
                                                value={form.branch_name}
                                                onChange={handleBranchNameChange}
                                                onFocus={() => { if (form.branch_name && filteredBranches.length > 0) setShowBranchSuggest(true); }}
                                                disabled={!form.bank_code}
                                                autoComplete="off"
                                            />
                                            {errors.branch_name && <p className={errorClass}>{errors.branch_name}</p>}
                                        </div>
                                        <div className="col-span-1">
                                            <label className={labelClass}>コード</label>
                                            <input className={`${inputClass} bg-gray-100 cursor-not-allowed`} readOnly value={form.branch_code} placeholder="自動" />
                                            {errors.branch_code && <p className={errorClass}>{errors.branch_code}</p>}
                                        </div>
                                    </div>
                                    {showBranchSuggest && filteredBranches.length > 0 && (
                                        <div className="absolute z-20 top-[70px] left-0 w-2/3 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {filteredBranches.map((branch) => (
                                                <button key={branch.code} onClick={() => selectBranch(branch)} className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0">
                                                    <span className="font-bold text-gray-800">{branch.name}</span>
                                                    <span className="text-xs text-gray-500 ml-2">({branch.code})</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                <h2 className="font-bold border-b pb-2 mb-4">口座情報</h2>
                                <div>
                                    <label className={labelClass}>口座種別</label>
                                    <div className="flex gap-4 mt-2">
                                        {[1, 2, 3].map(type => (
                                            <label key={type} className="flex items-center gap-2 cursor-pointer">
                                                <input type="radio" name="account_type" className="w-5 h-5 text-blue-600" checked={form.account_type === type} onChange={() => handleChange("account_type", type)} />
                                                {type === 1 ? "普通" : type === 2 ? "当座" : "貯蓄"}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>口座番号 (7桁)</label>
                                    <input className={inputClass} inputMode="numeric" placeholder="1234567" maxLength={7} value={form.account_number} onChange={(e) => handleChange("account_number", e.target.value)} autoComplete="off" />
                                    {errors.account_number && <p className={errorClass}>{errors.account_number}</p>}
                                </div>
                                <div>
                                    <label className={labelClass}>口座名義 (全角カタカナ)</label>
                                    <input className={inputClass} placeholder="例：ヤマダ タロウ" value={form.account_holder_name} onChange={(e) => handleChange("account_holder_name", e.target.value)} autoComplete="off" />
                                    <p className="text-xs text-gray-500 mt-1">※ご本人名義のみ登録可能です</p>
                                    {errors.account_holder_name && <p className={errorClass}>{errors.account_holder_name}</p>}
                                </div>
                            </section>

                            <div className="flex flex-col gap-3">
                                <button onClick={handleSubmit} disabled={submitting} className="w-full bg-red-500 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-red-600 disabled:opacity-50 transition-colors">
                                    {submitting ? <Loader2 className="animate-spin mx-auto" /> : "保存する"}
                                </button>

                                {/* データがある時だけキャンセルボタンを表示 */}
                                {hasAccount && (
                                    <button onClick={handleCancel} className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition-colors">
                                        キャンセル
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </main>
            </div>
        </>
    );
}

export default function BankAccount() {
    return (
        <ToastProvider>
            <BankAccountContent />
        </ToastProvider>
    );
}