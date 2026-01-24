import api from "./api";
import {
  FleaThreadResponse,
  FleaTransactionRow,
  TxRole,
} from "../types/FleaMarket";

export async function fetchFleaTransactionDetail(id: string | number) {
  const res = await api.get(`/flea-market/transactions/${id}`);
  return res.data as FleaThreadResponse;
}

export type TxPhase =
  | "WAIT_PAYMENT"
  | "BUYER_CONFIRM"
  | "PAYMENT"
  | "SHIPPING"
  | "SHIPPED"
  | "RATED_BY_BUYER"
  | "COMPLETE"
  | "CANCELLED"
  | "UNKNOWN";

export enum ShippingMethod {
  SELLER_CHOICE = "SELLER_CHOICE",
  ANONYMIZED = "ANONYMIZED",
  MEETUP = "MEETUP",
  DELIVERY = "DELIVERY",
}

export enum ShippingFeePref {
  OK_EITHER = "OK_EITHER",
  INCLUDED = "INCLUDED",
  COD = "COD",
}

// 配送業者の定義を追加
export enum SHIPPING_CARRIERS {
  YAMATO = "YAMATO",
  SAGAWA = "SAGAWA",
  JAPAN_POST = "JAPAN_POST",
}

export const REVIEW_TEMPLATES = [
  {
    label: "標準",
    text: "この度はありがとうございました。とても良い取引ができました。また機会がありましたら、よろしくお願いいたします。",
  },
  {
    label: "丁寧な梱包",
    text: "梱包がとても丁寧で、商品も綺麗でした。安心してお取引できました。ありがとうございました！",
  },
  {
    label: "発送が早い",
    text: "迅速な発送ありがとうございました！すぐに手元に届き、とても助かりました。",
  },
  {
    label: "シンプル",
    text: "商品を受け取りました。スムーズなお取引ありがとうございました。",
  },
];

export const SHIPPING_METHODS = [
  { id: ShippingMethod.SELLER_CHOICE, label: "出品者におまかせ" },
  { id: ShippingMethod.ANONYMIZED, label: "匿名配送" },
  { id: ShippingMethod.MEETUP, label: "手渡し" },
  { id: ShippingMethod.DELIVERY, label: "配送" },
];

export const SHIPPING_FEE_TYPES = [
  { id: ShippingFeePref.OK_EITHER, label: "どちらでもよい" },
  { id: ShippingFeePref.INCLUDED, label: "送料込み（購入者負担）" },
  { id: ShippingFeePref.COD, label: "着払い（購入者負担）" },
];

export const SHIPPING_CARRIER_OPTIONS = [
  { id: SHIPPING_CARRIERS.YAMATO, label: "ヤマト運輸" },
  { id: SHIPPING_CARRIERS.SAGAWA, label: "佐川急便" },
  { id: SHIPPING_CARRIERS.JAPAN_POST, label: "ゆうパック" },
];

export function calcTxPhase(tx: FleaTransactionRow, role: TxRole): TxPhase {
  // cancelled 優先
  if (tx.status === "CANCELLED") return "CANCELLED";

  // ここから先は「仮の状態遷移」
  // ACCEPTED: 出品者が送料/配送/金額確定する前の状態に見せる
  if (tx.status === "ACCEPTED") {
    return role === "SELLER" ? "WAIT_PAYMENT" : "PAYMENT";
  }

  if (tx.status === "NEED_BUYER_CONFIRM") return "BUYER_CONFIRM";

  // buyer confirmed したら決済へ
  if (tx.status === "BUYER_CONFIRMED") return "PAYMENT";

  // paid なら発送へ (seller view は shipping へ, buyer view は wait 発送待ち)
  if (tx.status === "PAID") {
    return "SHIPPING";
  }

  if(tx.status === "SHIPPED") return "SHIPPED";
  
  if (tx.status === "RATED_BY_BUYER") return "RATED_BY_BUYER";

  if (tx.status === "COMPLETED") return "COMPLETE";

  return "UNKNOWN";
}

// 取引を発送済みに変更するAPI呼び出し
export async function ChangeTxStatustoShipped(
  shipping_carrier: SHIPPING_CARRIERS,
  trackingNumber: string,
  transactionId: number,
) {
  const res = await api.post(
    `/flea-market/transactions/${transactionId}/shipped`,
    { tracking_number: trackingNumber, shipping_carrier: shipping_carrier },
  );
  return res.data;
}

// 取引を受け取り完了にするAPI呼び出し
export async function RateTransactionByBuyer(
  txId: number,
  rating: number,
  comment: string,
) {
  return api.post(`/flea-market/transactions/${txId}/rate/buyer`, {
    rating,
    comment,
  });
}

// 2. 出品者が評価を返して完了する (COMPLETED にする)
export async function CompleteTransactionBySeller(
  txId: number,
  rating: number,
  comment: string,
) {
  return api.post(`/flea-market/transactions/${txId}/complete/seller`, {
    rating,
    comment,
  });
}
