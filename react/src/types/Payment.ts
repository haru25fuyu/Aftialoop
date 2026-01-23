import { Address } from "./Address";

export interface Payment {
  id: string;
  cardBrand: string;
  name: string;
  last4: string;
  expMonth: number;
  expYear: number;
  address: Address;
  addressID: string;
  isDefault: boolean;
}