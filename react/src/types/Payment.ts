import { Address } from "./Address";

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