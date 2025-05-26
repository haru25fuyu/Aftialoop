export interface Content {
  id: string;
  name: string;
  discription: string;
  point: number;
  price: number;
  image_url: string;
  quantity?: number; 
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