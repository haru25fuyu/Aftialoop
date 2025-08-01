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
  defaultAddress: string | null;
  defaultCard: string | null;
  point: number;
}

export interface itemImage {
  id: string;
  item_id: string;
  url: string;
  sort_num: number;
}