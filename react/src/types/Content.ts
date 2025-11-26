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
  ID: string;
  Name: string;
  Phone: string;
  PostCode: string;
  Pref: string;
  Address1: string;
  Address2: string;
  Address3: string;
  Status: number;
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
  id: string;
  isMultiPurchasable: boolean;
  main_image_url: string;
  name: string;
  price: number;
  quantity: number;
  shipFrom: number;
  shippingFeeType: number;
  shipsWithinDays: number;
  status: number;
  type: FleaItemType;
  userId: string;
}

export interface FleaListContent {
  id: string;
  userId: string;
  name: string;
  price: number;
  main_image_url: string | null;

  seller_name: string;
  seller_icon_url: string | null;

  type: FleaItemType;
}
