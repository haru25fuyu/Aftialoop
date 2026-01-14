export type AddressForm = {
  name: string;
  phone: string;
  post_code: string;
  pref_code: number; // select 用（number）
  pref: string; // AjaxZip3 用（文字列）
  address1: string;
  address2?: string;
  address3?: string;
  status: boolean; // checkbox は boolean
};

export interface Address {
  id: string;
  name: string;
  phone: string;
  post_code: string;
  pref: string;
  pref_code: number;
  address1: string;
  address2: string;
  address3: string;
  status: boolean;
}
