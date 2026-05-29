export interface Content {
  id: string;
  name: string;
  description: string;   // ✅ discription → description に修正
  point: number;
  price: number;
  main_image_url: string;
  quantity: number;
  status: number;
  // is_selected は Cart 側でローカル管理するため削除
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