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
  | "SELLER_SET_TERMS"
  | "BUYER_WAIT_TERMS"
  | "BUYER_CONFIRM"
  | "PAYMENT"
  | "SHIPPING"
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

export const SHIPPING_METHODS = [
  {id: ShippingMethod.SELLER_CHOICE, label: "出品者におまかせ"},
  {id: ShippingMethod.ANONYMIZED, label: "匿名配送"},
  {id: ShippingMethod.MEETUP, label: "手渡し"},
  {id: ShippingMethod.DELIVERY, label: "配送"},
];

export const SHIPPING_FEE_TYPES = [
  {id: ShippingFeePref.OK_EITHER, label: "どちらでもよい"},
  {id: ShippingFeePref.INCLUDED, label: "送料込み（購入者負担）"},
  {id: ShippingFeePref.COD, label: "着払い（購入者負担）"},
];

export function calcTxPhase(tx: FleaTransactionRow, role: TxRole): TxPhase {
  // cancelled 優先
  if (tx.status === "CANCELLED") return "CANCELLED";

  // ここから先は「仮の状態遷移」
  // ACCEPTED: 出品者が送料/配送/金額確定する前の状態に見せる
  if (tx.status === "ACCEPTED") {
    return role === "SELLER" ? "SELLER_SET_TERMS" : "BUYER_WAIT_TERMS";
  }

  if (tx.status === "NEED_BUYER_CONFIRM") return "BUYER_CONFIRM";

  // buyer confirmed したら決済へ
  if (tx.status === "BUYER_CONFIRMED") return "PAYMENT";

  // paid
  if (tx.payment_status === "PAID" || tx.status === "PAID") return "SHIPPING";

  if (tx.status === "SHIPPED") return "SHIPPING";
  if (tx.status === "COMPLETED") return "COMPLETE";

  return "UNKNOWN";
}
