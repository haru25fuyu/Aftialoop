export interface Content {
  id: string;
  name: string;
  description: string;
  point: number;
  price: number;
  main_image_url: string;
  quantity: number;
  status: number;
}

// ✅ default_card を snake_case に統一
//    バックエンド (userData.go) が "default_card" で返しているため
export interface Customer {
  id: string;
  name: string;
  email: string;
  default_card: string | null; // 旧: defaultCard
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
