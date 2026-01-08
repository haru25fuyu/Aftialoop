export interface Content {
  id: string;
  name: string;
  description: string;
  point: number;
  price: number;
  main_image_url: string;
  quantity: number;
  is_selected: boolean;
  status: number;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  post_code: string;
  pref: string;
  address1: string;
  address2: string;
  address3: string;
  status: number;
}

export interface Payment {
  ID: string;
  CardBrand: string;
  Name: string;
  Last4: string;
  ExpMonth: number;
  ExpYear: number;
  Address: Address;
  AddressID: string;
  IsDefault: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  defaultCard: string | null;
  point: number;
}

export interface itemImage {
  id: string;
  item_id: string;
  url: string;
  sort_num: number;
}

export const FLEA_ITEM_TYPES = ["ANIMAL", "SUPPLY"] as const;
export type FleaItemType = (typeof FLEA_ITEM_TYPES)[number];
export interface fleaContent {
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

export type UserProfile = {
  name: string;
  iconUrl: string;
};
