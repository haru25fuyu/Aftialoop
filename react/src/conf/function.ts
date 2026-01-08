import { useContext } from "react";

import api from "../conf/api";
import { ITEM_STATUS_LABELS } from "../conf/config";
import { PREFS } from "../conf/config";

import { Content, UserProfile, fleaContent } from "../types/Content";

import { ToastCtx } from "./toast-context";

//// トークンが期限切れかを確認する関数
//function isTokenExpired(token: string | null): boolean {
//  if (!token) return true; // トークンがない場合は期限切れとみなす
//  const payload = JSON.parse(atob(token.split(".")[1])); // JWTのペイロードをデコード
//  const exp = payload.exp * 1000; // JWTのexpは秒単位なのでミリ秒に変換
//  return Date.now() > exp; // 現在の時刻が`exp`を超えていれば期限切れ
//}
//
//module.exports = { isTokenExpired };

//----------------------------------------------------------------------
// 支払い関数
//----------------------------------------------------------------------
type PaymentData = {
  price: number;
  cardID: string;
  customerID: string;
  addressID: string;
};

type EcPaymentData = PaymentData & {
  items: Content[];
};

type FleaPaymentData = PaymentData & {
  items: fleaContent[];
};

// クレジットカードの支払いを行う関数
export const chargeCard = async (paymentData: EcPaymentData) => {
  api
    .post("/card/charge", {
      amount: paymentData.price,
      cardID: paymentData.cardID,
      customerID: paymentData.customerID,
      items: paymentData.items,
      addressID: paymentData.addressID,
    })
    .then((res) => {
      console.log("決済成功:", res.data);
      // 決済成功後の処理を追加
      return res.data; // 必要に応じてレスポンスを返す
    })
    .catch((err) => {
      console.error("決済失敗:", err);
      throw new Error("決済に失敗しました。" + err.message); // エラーを投げて呼び出し元で処理
    });
};

// ポイントの支払いを行う関数
export const chargePoint = async (paymentData: EcPaymentData) => {
  api
    .post("/point/charge", {
      amount: paymentData.price,
      customerID: paymentData.customerID,
      items: paymentData.items,
      addressID: paymentData.addressID,
    })
    .then((res) => {
      console.log("ポイント決済成功:", res.data);
      // ポイント決済成功後の処理を追加
      return res.data; // 必要に応じてレスポンスを返す
    })
    .catch((err) => {
      console.error("ポイント決済失敗:", err);
      throw new Error("ポイント決済に失敗しました。" + err.message); // エラーを投げて呼び出し元で処理
    });
};

export const fleaCheckout = async (paymentData: FleaPaymentData) => {
  api
    .post("/card/charge", {
      amount: paymentData.price,
      cardID: paymentData.cardID,
      customerID: paymentData.customerID,
      items: paymentData.items,
      addressID: paymentData.addressID,
    })
    .then((res) => {
      console.log("決済成功:", res.data);
      // 決済成功後の処理を追加
      return res.data; // 必要に応じてレスポンスを返す
    })
    .catch((err) => {
      console.error("決済失敗:", err);
      throw new Error("決済に失敗しました。" + err.message); // エラーを投げて呼び出し元で処理
    });
};

export async function fetchAddress(id: string) {
  try {
    const response = await api.post(`/address/get`, { id });
    return response.data ?? null;
  } catch (e) {
    console.error("住所情報の取得に失敗しました:", e);
    return null;
  }
}

export function GetItemStatusLabels(status: number): string[] {
  return Object.values(ITEM_STATUS_LABELS)
    .map(({ flag, yes, no }) => (status & flag ? yes : no))
    .filter((label): label is string => label !== null);
}
export function hasAllFlags(status: number, flags: number[]): boolean {
  const combined = flags.reduce((acc, f) => acc | f, 0);
  return (status & combined) === combined;
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.toast;
}

export function getPrefName(id: number): string {
  const pref = PREFS.find((p) => p.id === id);
  return pref ? pref.name : "未設定";
}

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
