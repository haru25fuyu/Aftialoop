import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { LoadingButton } from "../component/LoadingButton";
import api from "../conf/api";
import { Address } from "../types/Address";
import { s } from "../styles/modal/EditAddress.styles";

const RequiredBadge = () => (
  <span
    style={{
      marginLeft: 4,
      fontSize: 10,
      fontWeight: 700,
      backgroundColor: "#d63c20",
      color: "#fff",
      padding: "1px 5px",
      borderRadius: 4,
    }}
  >
    必須
  </span>
);

type Props = {
  address: Address;
  isOpen: boolean;
  onClose: () => void;
  setAddress: React.Dispatch<React.SetStateAction<Address[]>>;
};
type Inputs = {
  name: string;
  phone: string;
  post_code: string;
  pref: string;
  address1: string;
  address2: string;
  address3: string;
};

const EditAddress: React.FC<Props> = ({
  address,
  isOpen,
  onClose,
  setAddress,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Inputs>();

  useEffect(() => {
    if (isOpen) {
      reset({
        name: address.name || "",
        phone: address.phone || "",
        post_code: address.post_code || "",
        pref: address.pref || "",
        address1: address.address1 || "",
        address2: address.address2 || "",
        address3: address.address3 || "",
      });
    }
  }, [isOpen, address]);

  const lookupPostCode = async (code: string) => {
    const clean = code.replace(/-/g, "");
    if (clean.length !== 7) return;
    try {
      const res = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${clean}`,
      );
      const data = await res.json();
      if (data.results && data.results[0]) {
        const r = data.results[0];
        setValue("pref", r.address1 || "");
        setValue("address1", (r.address2 || "") + (r.address3 || ""));
      }
    } catch {
      /* ignore */
    }
  };

  const onSubmit = async (data: Inputs) => {
    try {
      const payload = { ...data, id: address.id };
      const res = address.id
        ? await api.post("/address/edit", payload)
        : await api.post("/address/add", data);
      setAddress(res.data.address || []);
      onClose();
    } catch {
      alert("保存に失敗しました");
    }
  };

  const handleDelete = async () => {
    if (!address.id || !window.confirm("この住所を削除しますか？")) return;
    try {
      const res = await api.post("/address/delete", { id: address.id });
      setAddress(res.data.address || []);
      onClose();
    } catch {
      alert("削除に失敗しました");
    }
  };

  const inputClass = (hasErr: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "12px",
    borderRadius: 8,
    border: `1px solid ${hasErr ? "#d63c20" : "#e0ddd8"}`,
    fontSize: 14,
    boxSizing: "border-box",
    backgroundColor: hasErr ? "#fef8f6" : "#f8f7f5",
    outline: "none",
  });

  return (
    <div>
      <div style={s.header}>
        <h2 style={s.title}>{address.id ? "住所を編集" : "住所を追加"}</h2>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#8c8c8c",
            fontSize: 22,
          }}
        >
          ×
        </button>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        {/* 名前 */}
        <div>
          <label style={s.label}>
            お名前 <RequiredBadge />
          </label>
          <input
            {...register("name", { required: true })}
            style={inputClass(!!errors.name)}
            placeholder="山田 太郎"
          />
          {errors.name && <p style={s.errMsg}>必須項目です</p>}
        </div>
        {/* 電話 */}
        <div>
          <label style={s.label}>
            電話番号 <RequiredBadge />
          </label>
          <input
            type="tel"
            {...register("phone", { required: true })}
            style={inputClass(!!errors.phone)}
            placeholder="09012345678"
          />
          {errors.phone && <p style={s.errMsg}>必須項目です</p>}
        </div>
        {/* 郵便番号 */}
        <div>
          <label style={s.label}>
            郵便番号 <RequiredBadge />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              {...register("post_code", { required: true })}
              style={{ ...inputClass(!!errors.post_code), flex: 1 }}
              placeholder="123-4567"
              onChange={(e) => {
                const v = e.target.value;
                setValue("post_code", v);
                lookupPostCode(v);
              }}
            />
            <button
              type="button"
              onClick={() => {
                const v = (
                  document.querySelector("[name=post_code]") as HTMLInputElement
                )?.value;
                if (v) lookupPostCode(v);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #e0ddd8",
                backgroundColor: "#f8f7f5",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              住所を取得
            </button>
          </div>
          {errors.post_code && <p style={s.errMsg}>必須項目です</p>}
        </div>
        {/* 都道府県 */}
        <div>
          <label style={s.label}>
            都道府県 <RequiredBadge />
          </label>
          <input
            {...register("pref", { required: true })}
            style={inputClass(!!errors.pref)}
            placeholder="東京都"
          />
          {errors.pref && <p style={s.errMsg}>必須項目です</p>}
        </div>
        {/* 住所1 */}
        <div>
          <label style={s.label}>
            市区町村・番地 <RequiredBadge />
          </label>
          <input
            {...register("address1", { required: true })}
            style={inputClass(!!errors.address1)}
            placeholder="渋谷区渋谷1-1-1"
          />
          {errors.address1 && <p style={s.errMsg}>必須項目です</p>}
        </div>
        {/* 住所2 */}
        <div>
          <label style={s.label}>建物名・部屋番号（任意）</label>
          <input
            {...register("address2")}
            style={inputClass(false)}
            placeholder="○○マンション101号室"
          />
        </div>
        {/* 住所3 */}
        <div>
          <label style={s.label}>その他（任意）</label>
          <input
            {...register("address3")}
            style={inputClass(false)}
            placeholder=""
          />
        </div>
        <LoadingButton
          type="submit"
          loading={isSubmitting}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 12,
            backgroundColor: "#1a1a1a",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          保存して終了
        </LoadingButton>
        {address.id && (
          <button
            type="button"
            onClick={handleDelete}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 12,
              backgroundColor: "#fef0ec",
              color: "#d63c20",
              border: "1px solid #f0a890",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            この住所を削除する
          </button>
        )}
      </form>
    </div>
  );
};

export default EditAddress;
