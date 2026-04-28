import React, { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import api from "../conf/api";
import { Address } from "../types/Address";
import { PREFS } from "../conf/config";
import { X, Save } from "lucide-react"; // ★アイコンを追加
import { LoadingButton } from "../component/LoadingButton"; // ★LoadingButtonを追加

// AjaxZip3 型定義
declare global {
  interface Window {
    AjaxZip3?: {
      zip2addr: (
        zip: string,
        pref: string,
        addr1: string,
        addr2: string,
      ) => void;
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
};

const prefNameToCode = (name: string) =>
  PREFS.find((p) => p.name === name)?.id ?? 0;
const prefCodeToName = (code: number) =>
  PREFS.find((p) => p.id === code)?.name ?? "";

const EditAddress: React.FC<Props> = ({ address, isOpen, onClose }) => {
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

  // AjaxZip3 で補完（post_code が7桁になったら）
  const complementAddress = useCallback(() => {
    if (!window.AjaxZip3) return;
    const zip = String(post_code ?? "")
      .replace(/-/g, "")
      .trim();
    if (zip.length !== 7) return;

    // AjaxZip3 は「inputのname属性」を指定する想定
    window.AjaxZip3.zip2addr("post_code", "", "pref_name", "address1");

    // DOMの値をhook-formへ同期（AjaxZip3はDOM直書き）
    setTimeout(() => {
      const prefVal = (
        document.querySelector<HTMLInputElement>('input[name="pref_name"]')
          ?.value ?? ""
      ).trim();
      const a1 = (
        document.querySelector<HTMLInputElement>('input[name="address1"]')
          ?.value ?? ""
      ).trim();
      const a2 = (
        document.querySelector<HTMLInputElement>('input[name="address2"]')
          ?.value ?? ""
      ).trim();

      if (prefVal) {
        setValue("pref", prefVal, { shouldDirty: true, shouldValidate: true });
        setValue("PrefCode", prefNameToCode(prefVal), { shouldDirty: true });
      }
      if (a1)
        setValue("address1", a1, { shouldDirty: true, shouldValidate: true });
      if (a2)
        setValue("address2", a2, { shouldDirty: true, shouldValidate: true });
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
    setValue("pref", prefCodeToName(Number(pref_code)), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [pref_code, isOpen, setValue]);

  const onSubmit = async (form: AddressForm) => {
    const payload: Address = {
      id: address.id,
      name: form.name,
      phone: form.phone,
      post_code: form.post_code.replace(/-/g, ""),
      pref: form.pref, // 表示用
      pref_code: form.PrefCode, // 機械用（送料計算）
      address1: form.address1,
      address2: form.address2,
      address3: form.address3,
      status: form.status,
    };

    await api.post("/address/edit", payload);

    onClose();
  };

  if (!isOpen) return null;

  // 共通のinputクラスを定義してスッキリさせる
  const inputClass =
    "w-full px-4 py-3 mt-1.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all text-sm";

  // 必須ラベルのコンポーネント
  const RequiredBadge = () => (
    <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold align-middle">
      必須
    </span>
  );

  return (
    <div className="relative p-6 sm:p-8 bg-white">
      {/* 閉じるボタン (右上に配置してモダンに) */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
        type="button"
        aria-label="閉じる"
      >
        <X size={20} />
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-6 pr-8">
        お届け先の設定
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* 送信用 */}
        <input
          type="hidden"
          {...register("PrefCode", { valueAsNumber: true })}
        />

        <div>
          <label className="block text-sm font-bold text-gray-700">
            氏名 <RequiredBadge />
          </label>
          <input
            type="text"
            {...register("name", { required: true })}
            className={`${inputClass} ${errors.name ? "border-red-300 bg-red-50 focus:ring-red-500" : ""}`}
            name="name"
            autoComplete="name"
            placeholder="山田 太郎"
          />
          {errors.name && (
            <p className="mt-1.5 text-xs font-bold text-red-500">
              必須項目です
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700">
            電話番号 <RequiredBadge />
          </label>
          <input
            type="tel"
            {...register("phone", { required: true })}
            className={`${inputClass} ${errors.phone ? "border-red-300 bg-red-50 focus:ring-red-500" : ""}`}
            name="phone"
            autoComplete="tel"
            placeholder="09012345678"
          />
          {errors.phone && (
            <p className="mt-1.5 text-xs font-bold text-red-500">
              必須項目です
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700">
            郵便番号 <RequiredBadge />
          </label>
          <input
            type="text"
            {...register("post_code", { required: true })}
            className={`${inputClass} ${errors.post_code ? "border-red-300 bg-red-50 focus:ring-red-500" : ""}`}
            name="post_code"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="1234567 (ハイフンなし)"
          />
          {errors.post_code && (
            <p className="mt-1.5 text-xs font-bold text-red-500">
              必須項目です
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700">
            都道府県 <RequiredBadge />
          </label>

          {/* 表示用pref（AjaxZip3がここに入れる） */}
          <input
            type="hidden"
            {...register("pref", { required: true })}
            name="pref"
          />
          <input
            type="text"
            name="pref_name"
            id="pref_name"
            className="hidden"
          />
          <select
            className={inputClass}
            value={Number(pref_code || 0) || ""}
            onChange={(e) =>
              setValue("PrefCode", Number(e.target.value), {
                shouldDirty: true,
              })
            }
          >
            <option value="">選択してください</option>
            {PREFS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="mt-1 text-xs text-gray-400 font-medium">
            現在選択中: {prefCodeToName(Number(pref_code || 0)) || "未選択"}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700">
            市区町村 <RequiredBadge />
          </label>
          <input
            id="address1"
            type="text"
            {...register("address1", { required: true })}
            className={`${inputClass} ${errors.address1 ? "border-red-300 bg-red-50 focus:ring-red-500" : ""}`}
            name="address1"
            placeholder="渋谷区神南"
          />
          {errors.address1 && (
            <p className="mt-1.5 text-xs font-bold text-red-500">
              必須項目です
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
            丁目・番地・号{" "}
            <span className="text-[10px] text-gray-400 font-normal">任意</span>
          </label>
          <input
            id="address2"
            type="text"
            {...register("address2")}
            className={inputClass}
            name="address2"
            placeholder="1-2-3"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 flex items-center gap-2">
            建物名／会社名・部屋番号{" "}
            <span className="text-[10px] text-gray-400 font-normal">任意</span>
          </label>
          <input
            type="text"
            {...register("address3")}
            className={inputClass}
            name="address3"
            placeholder="〇〇ビル 101"
          />
        </div>

        {/* デフォルトチェックボックスをリッチに */}
        <label className="flex items-center gap-3 p-4 mt-2 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="checkbox"
            {...register("status")}
            defaultChecked={Number(address.status) === 1}
            className="h-5 w-5 accent-black rounded border-gray-300 cursor-pointer"
          />
          <span className="text-sm font-bold text-gray-800">
            この住所をデフォルトに設定する
          </span>
        </label>

        <div className="pt-2">
          <LoadingButton
            type="submit"
            loading={isSubmitting}
            className="w-full py-3.5 bg-black hover:bg-gray-800 text-white font-bold rounded-xl shadow-md disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} />
            保存する
          </LoadingButton>
        </div>
      </form>
    </div>
  );
};

export default EditAddress;
