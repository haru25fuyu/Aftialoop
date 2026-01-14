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



export type UserProfile = {
  name: string;
  iconUrl: string;
};
