import api from "../conf/api";
import { ITEM_STATUS_LABELS } from "../conf/config";

import { Content } from "../types/Content";

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
  items: Content[];
  addressID: string;
};

// クレジットカードの支払いを行う関数
export const chargeCard = async (paymentData: PaymentData) => {
  api
    .post("/card/charge", {
      amount: paymentData.price,
      cardID: paymentData.cardID,
      customerID: paymentData.customerID,
      items: paymentData.items,
      addressID: paymentData.addressID
    })
    .then(res => {
      console.log("決済成功:", res.data);
      // 決済成功後の処理を追加
      return res.data; // 必要に応じてレスポンスを返す
    })
    .catch(err => {
      console.error("決済失敗:", err);
      throw new Error("決済に失敗しました。" + err.message); // エラーを投げて呼び出し元で処理
    });
};

// ポイントの支払いを行う関数
export const chargePoint = async (paymentData: PaymentData) => {
  api
    .post("/point/charge", {
      amount: paymentData.price,
      customerID: paymentData.customerID,
      items: paymentData.items,
      addressID: paymentData.addressID
    })
    .then(res => {
      console.log("ポイント決済成功:", res.data);
      // ポイント決済成功後の処理を追加
      return res.data; // 必要に応じてレスポンスを返す
    })
    .catch(err => {
      console.error("ポイント決済失敗:", err);
      throw new Error("ポイント決済に失敗しました。" + err.message); // エラーを投げて呼び出し元で処理
    });
};

export function GetItemStatusLabels(status: number): string[] {
  return Object.values(ITEM_STATUS_LABELS)
    .map(({ flag, yes, no }) => (status & flag ? yes : no))
    .filter((label): label is string => label !== null);
}
export function hasAllFlags(status: number, flags: number[]): boolean {
  const combined = flags.reduce((acc, f) => acc | f, 0);
  return (status & combined) === combined;
}

