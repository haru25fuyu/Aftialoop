import React, { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import api from "../conf/api";
import { Address } from "../types/Address";
import { PREFS } from "../conf/config";

// AjaxZip3 型定義
declare global {
    interface Window {
        AjaxZip3?: {
            zip2addr: (zip: string, pref: string, addr1: string, addr2: string) => void;
        };
    }
}

type AddressForm = Address & {
    PrefCode: number; // ← 送信用
};

type Props = {
    address: Address;
    isOpen: boolean;
    onClose: () => void;
    setAddress: React.Dispatch<React.SetStateAction<Address[]>>;
};

const prefNameToCode = (name: string) =>
    PREFS.find((p) => p.name === name)?.id ?? 0;
const prefCodeToName = (code: number) => PREFS.find((p) => p.id === code)?.name ?? "";


const EditAddress: React.FC<Props> = ({ address, isOpen, onClose, setAddress }) => {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<AddressForm>();

    const post_code = watch("post_code");
    const pref_code = watch("PrefCode");

    useEffect(() => {
        if (!isOpen) return;

        document.body.style.overflow = "hidden";

        reset({
            name: address.name,
            phone: address.phone,
            post_code: address.post_code,
            pref: address.pref,
            pref_code: address.pref_code,
            PrefCode: address.pref_code,
            address1: address.address1,
            address2: address.address2,
            address3: address.address3,
            status: address.status,
        });


        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen, address, reset]);

    // 

    // AjaxZip3 で補完（post_code が7桁になったら）
    const complementAddress = useCallback(() => {
        if (!window.AjaxZip3) return;
        const zip = String(post_code ?? "").replace(/-/g, "").trim();
        if (zip.length !== 7) return;

        // AjaxZip3 は「inputのname属性」を指定する想定
        window.AjaxZip3.zip2addr("post_code", "", "pref_name", "address1");

        // DOMの値をhook-formへ同期（AjaxZip3はDOM直書き）
        setTimeout(() => {
            const prefVal = (document.querySelector<HTMLInputElement>('input[name="pref_name"]')?.value ?? "").trim();
            const a1 = (document.querySelector<HTMLInputElement>('input[name="address1"]')?.value ?? "").trim();
            const a2 = (document.querySelector<HTMLInputElement>('input[name="address2"]')?.value ?? "").trim();

            if (prefVal) {
                setValue("pref", prefVal, { shouldDirty: true, shouldValidate: true });
                setValue("PrefCode", prefNameToCode(prefVal), { shouldDirty: true });
            }
            if (a1) setValue("address1", a1, { shouldDirty: true, shouldValidate: true });
            if (a2) setValue("address2", a2, { shouldDirty: true, shouldValidate: true });

        }, 200);
    }, [post_code, setValue]);

    useEffect(() => {
        if (!isOpen) return;
        complementAddress();
    }, [post_code, isOpen, complementAddress]);

    // PrefCode（select）変更 → 表示用の pref も同期（サーバーが pref 文字列も欲しい場合）
    useEffect(() => {
        if (!isOpen) return;
        if (!pref_code) return;
        setValue("pref", prefCodeToName(Number(pref_code)), { shouldDirty: true, shouldValidate: true });
    }, [pref_code, isOpen, setValue]);

    const onSubmit = async (form: AddressForm) => {
        const payload: Address = {
            id: address.id,
            name: form.name,
            phone: form.phone,
            post_code: form.post_code.replace(/-/g, ""),
            pref: form.pref,               // 表示用
            pref_code: form.PrefCode,     // 機械用（送料計算）
            address1: form.address1,
            address2: form.address2,
            address3: form.address3,
            status: form.status,
        };

        await api.post("/address/edit", payload);

        const res = await api.post("/address/list");
        setAddress(res.data?.address ?? []);

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="space-y-6">
            <button onClick={onClose} className="absolute top-4 left-4" type="button" aria-label="閉じる">
                ✕
            </button>

            <h2 className="text-2xl font-bold text-center text-gray-900">お届け先の設定</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* 送信用 */}
                <input type="hidden" {...register("PrefCode", { valueAsNumber: true })} />

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        氏名<span className="text-red-500">※必須</span>
                    </label>
                    {errors.name && <p className="mt-2 text-sm text-red-600">必須項目です</p>}
                    <input
                        type="text"
                        {...register("name", { required: true })}
                        className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm"
                        name="name"
                        autoComplete="name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        電話番号<span className="text-red-500">※必須</span>
                    </label>
                    {errors.phone && <p className="mt-2 text-sm text-red-600">必須項目です</p>}
                    <input
                        type="tel"
                        {...register("phone", { required: true })}
                        className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm"
                        name="phone"
                        autoComplete="tel"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        郵便番号<span className="text-red-500">※必須</span>
                    </label>
                    {errors.post_code && <p className="mt-2 text-sm text-red-600">必須項目です</p>}
                    <input
                        type="text"
                        {...register("post_code", { required: true })}
                        className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm"
                        name="post_code"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        placeholder="例）6500000"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        都道府県<span className="text-red-500">※必須</span>
                    </label>

                    {/* 表示用pref（AjaxZip3がここに入れる） */}
                    <input type="hidden" {...register("pref", { required: true })} name="pref" />
                    <input type="text" name="pref_name" id="pref_name" className="hidden" />
                    <select
                        className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm"
                        value={Number(pref_code || 0) || ""}
                        onChange={(e) => setValue("PrefCode", Number(e.target.value), { shouldDirty: true })}
                    >
                        <option value="">選択してください</option>
                        {PREFS.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>

                    {/* ユーザーに見せたいなら小さく表示 */}
                    <div className="mt-1 text-xs text-gray-500">
                        現在: {prefCodeToName(Number(pref_code || 0)) || "未選択"}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        市区町村<span className="text-red-500">※必須</span>
                    </label>
                    {errors.address1 && <p className="mt-2 text-sm text-red-600">必須項目です</p>}
                    <input
                        id="address1"
                        type="text"
                        {...register("address1", { required: true })}
                        className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm"
                        name="address1"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">丁目・番地・号</label>
                    <input
                        id="address2"
                        type="text"
                        {...register("address2")}
                        className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm"
                        name="address2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">建物名／会社名・部屋番号</label>
                    <input
                        type="text"
                        {...register("address3")}
                        className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm"
                        name="address3"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input type="checkbox" {...register("status")} defaultChecked={Number(address.status) === 1} className="h-4 w-4" />
                    <label className="text-sm font-medium text-gray-700">デフォルトにする</label>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full px-4 py-2 rounded-md text-white ${isSubmitting ? "bg-gray-300" : "bg-indigo-600 hover:bg-indigo-700"}`}
                >
                    {isSubmitting ? "保存中…" : "保存"}
                </button>
            </form>
        </div>
    );
};

export default EditAddress;