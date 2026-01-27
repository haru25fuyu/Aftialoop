import {
  SHIPPING_CARRIERS,
  ShippingFeePref,
  ShippingMethod,
} from "../conf/FleaMarket";
import { Address } from "./Address";

export type TxRole = "BUYER" | "SELLER";

export type FleaThreadKind = "transaction" | "purchase_request";

export const FLEA_ITEM_TYPES = ["ANIMAL", "SUPPLY", "GOODS"] as const;
export type FleaItemType = (typeof FLEA_ITEM_TYPES)[number];
export interface FleaContent {
  id: number;
  isMultiPurchasable: boolean;
  main_image_url: string;
  name: string;
  price: number;
  seller_rate: number;
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

export interface FleaItemDetails {
  // ANIMAL 用
  animal_details?: {
    locality: string;
    hatch_date: string;
    generation: string;
    size: string;
    sex: string;
  };

  // SUPPLY 用
  supply_details?: {
    brand: string;
    sku: string;
    net_weight_g: string;
    //model: string;
  };
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

  shipping_carrier?: SHIPPING_CARRIERS | null; // 配送業者
  tracking_number?: string | null; // 追跡番号

  payment_provider?: string | null;
  payment_id?: string | null;
  payment_status: "NONE" | "PENDING" | "PAID" | "FAILED" | "CANCELLED";

  status:
    | "ACCEPTED"
    | "NEED_BUYER_CONFIRM"
    | "BUYER_CONFIRMED"
    | "PAID"
    | "SHIPPED"
    | "RATED_BY_BUYER"
    | "COMPLETED"
    | "CANCELLED";

  shipped_at?: string | null;
  completed_at?: string | null;

  paid_at?: string | null;

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

export interface ListingItem {
  id: number;
  name: string;
  price: number;
  main_image_url: string;
  status: number; // 1:出品中, 2:取引中, 3:売却済み
  created_at: string;
  updated_at: string;
}

export interface DraftItem {
  draft_id: number;
  name: string | null;
  price: string | null; // 下書きは未入力(null)や文字の可能性もあるため
  main_image_url: string | null;
  updated_at: string;
}

export type ImageAsset = {
  id: string; // フロントでの識別用ユニークID
  file?: File; // 新規追加時はFileがある
  url: string; // 表示用＆サーバー保存用URL
  serverId?: number; // サーバーにアップロード済みの場合のID
};

// 型定義（別ファイルに分けてもOK）
export type UserReview = {
  id: number;
  reviewerName: string;
  reviewerIconUrl: string;
  rating: number;
  comment: string;
  createdAt: number;
  itemName?: string;
};

export type UserProfileData = {
    id: string;
    name: string;
    iconUrl: string;
    description: string;
    ratingAverage: number;
    ratingCount: number;
    isFollowing: boolean;    // ★追加
    followersCount: number;  // ★追加
    followingCount: number;  // ★追加
    listings: FleaContent[];
    reviews: any[];
};