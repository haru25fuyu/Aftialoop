import { useContext } from "react";

import api from "../conf/api";
import { ITEM_STATUS_LABELS } from "../conf/config";
import { PREFS } from "../conf/config";

import { Content, UserProfile } from "../types/Content";
import { FleaContent } from "../types/FleaMarket";

import { ToastCtx, ToastMsg } from "./toast-context";

// ── 型定義 ────────────────────────────────────────────────

type PaymentData = {
  price: number;
  cardID: string;
  customerID: string;
  addressID: string;
};

type EcPaymentData = PaymentData & { items: Content[] };
type FleaPaymentData = PaymentData & { items: FleaContent[] };

// ── 決済関数 ─────────────────────────────────────────────
// ✅ .then() チェーンを async/await に統一
//    → エラーが呼び出し元に正しく伝播するようになる

export const chargeCard = async (paymentData: EcPaymentData) => {
  const res = await api.post("/card/charge", {
    amount: paymentData.price,
    cardID: paymentData.cardID,
    customerID: paymentData.customerID,
    items: paymentData.items,
    addressID: paymentData.addressID,
  });
  return res.data;
};

export const chargePoint = async (paymentData: EcPaymentData) => {
  const res = await api.post("/point/charge", {
    amount: paymentData.price,
    customerID: paymentData.customerID,
    items: paymentData.items,
    addressID: paymentData.addressID,
  });
  return res.data;
};

export const fleaCheckout = async (paymentData: FleaPaymentData) => {
  const res = await api.post("/card/charge", {
    amount: paymentData.price,
    cardID: paymentData.cardID,
    customerID: paymentData.customerID,
    items: paymentData.items,
    addressID: paymentData.addressID,
  });
  return res.data;
};

// ── 住所取得 ──────────────────────────────────────────────

export async function fetchAddress(id: string) {
  try {
    const response = await api.post(`/address/get`, { id });
    return response.data ?? null;
  } catch (e) {
    console.error("住所情報の取得に失敗しました:", e);
    return null;
  }
}

// ── ステータスラベル ──────────────────────────────────────

export function GetItemStatusLabels(status: number): string[] {
  return Object.values(ITEM_STATUS_LABELS)
    .map(({ flag, yes, no }) => (status & flag ? yes : no))
    .filter((label): label is string => label !== null);
}

export function hasAllFlags(status: number, flags: number[]): boolean {
  const combined = flags.reduce((acc, f) => acc | f, 0);
  return (status & combined) === combined;
}

// ── Toast ────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");

  return (m: string | Omit<ToastMsg, "id">) => {
    ctx.toast(typeof m === "string" ? { text: m } : m);
  };
}

// ── 都道府県名 ────────────────────────────────────────────

export function getPrefName(id: number): string {
  const pref = PREFS.find((p) => p.id === id);
  return pref ? pref.name : "未設定";
}

// ── ユーザープロフィール（localStorage） ─────────────────

export const setUserProfile = (p: UserProfile | null) => {
  if (!p) {
    localStorage.removeItem("user_profile");
    return;
  }
  localStorage.setItem("user_profile", JSON.stringify(p));
};

export function loadUserProfile(): UserProfile | null {
  const raw = localStorage.getItem("user_profile");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function clearUserProfile() {
  localStorage.removeItem("user_profile");
}
