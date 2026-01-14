import { ShippingFeePref, ShippingMethod } from "../conf/FleaMarket";
import { Address } from "./Address";

export type TxRole = "BUYER" | "SELLER";

export type FleaThreadKind = "transaction" | "purchase_request";

export const FLEA_ITEM_TYPES = ["ANIMAL", "SUPPLY"] as const;
export type FleaItemType = (typeof FLEA_ITEM_TYPES)[number];
export interface FleaContent {
  id: number;
  isMultiPurchasable: boolean;
  main_image_url: string;
  name: string;
  price: number;
  quantity: number;
  shipFrom: number;
  shippingFeeType: number;
  shipsWithinDays: number;
  description: string | null;
  status: number;
  type: FleaItemType;
  userId: string;

  seller_name: string;
  seller_icon_url: string | null;
}

export interface FleaListContent {
  id: string;
  userId: string;
  name: string;
  price: number;
  seller_rateBP: number;
  main_image_url: string | null;

  seller_name: string;
  seller_icon_url: string | null;

  type: FleaItemType;
}

export interface FleaComment {
  id: number;
  itemId: number; // どの商品へのコメントか
  userId: string; // コメント主
  parentMessageId: number | null; // 返信元コメントID（トップレベルコメントなら null）
  userName: string; // 表示用
  userIcon: string; // プロフィール画像
  body: string; // コメント内容
  createdAt: number; // ISO文字列 or timeAgo 変換用
}

export type FleaMessageResponse = {
  id: number;
  itemId: number;
  parentMessageId: number | null;
  userId: string;
  body: string;
  createdAt: number; // ms
};

export type FleaTransactionRow = {
  id: number;
  purchase_request_id: number;
  item_id: number;

  buyer_id: string;
  seller_id: string;

  address_id: number;

  shipping_method: ShippingMethod;
  shipping_fee_type: ShippingFeePref;
  price_item: number;
  price_shipping: number;

  payment_provider?: string | null;
  payment_id?: string | null;
  payment_status: "NONE" | "PENDING" | "PAID" | "FAILED" | "CANCELLED";

  status:
    | "ACCEPTED"
    | "NEED_BUYER_CONFIRM"
    | "BUYER_CONFIRMED"
    | "PAID"
    | "SHIPPED"
    | "COMPLETED"
    | "CANCELLED";

  shipped_at?: string | null;
  completed_at?: string | null;

  created_at: string;
  updated_at: string;
};

export type FleaPurchaseRequestRow = {
  id: number;
  item_id: number;
  buyer_id: string;
  seller_id: string;

  shipping_method_pref: string;
  shipping_fee_pref: string;
  note?: string | null;

  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

  created_at: string;
  updated_at: string;
};

export type FleaThreadResponse = {
  kind: FleaThreadKind;
  transaction: FleaTransactionRow | null; // utils.FleaTransactionRow に合わせて型付けしてOK
  purchase_request: FleaPurchaseRequestRow | null; // utils.FleaPurchaseRequestRow に合わせて型付けしてOK
  role: TxRole;

  item: FleaContent;
  address: Address;
};
