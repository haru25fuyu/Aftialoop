import api from "./api";
import {
  FleaTransactionDetailResponse,
  FleaTransactionRow,
  TxRole,
} from "../types/FleaMarket";

export async function fetchFleaTransactionDetail(txId: string | number) {
  const res = await api.get<FleaTransactionDetailResponse>(
    `/flea/transactions/${txId}`
  );
  return res.data;
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
