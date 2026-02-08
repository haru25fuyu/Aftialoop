import { Dispatch, SetStateAction } from "react";
import { ImageAsset } from "./FleaMarket"; // 既存の定義ファイルをインポート
import { ItemType } from "./Market";

// 性別型
export type SexType = "male" | "female" | "unknown" | "pair";

// 生体詳細情報の型
export type LiveDetails = {
  category_id: number | null;
  category_name: string;
  locality: string;
  hatch_date: string;
  generation: string;
  size: string;
  sex: SexType;
};

// 用品詳細情報の型
export type SupplyDetails = {
  brand: string;
  sku: string;
  net_weight_g: string;
  supply_type_id: number | null;
  target_category_id: number | null;
  target_category_name: string;
};

// フォーム全体のState型
export type FormState = {
  name: string;
  price: string;
  sellerPlusPct: number;
  quantity: number;
  isMultiPurchasable: boolean;
  type: ItemType;
  description: string;
  shippingFeeType: 0 | 1 | 2;
  shipFromId: number | null;
  shipsWithinDays: number | "";
  images: ImageAsset[];
  mainIndex: number;
  liveDetails: LiveDetails;
  supplyDetails: SupplyDetails;
};

// Setter関数の型 (ReactのDispatch型を使用)
export type FormSetters = {
  setName: Dispatch<SetStateAction<string>>;
  setPrice: Dispatch<SetStateAction<string>>;
  setSellerPlusPct: Dispatch<SetStateAction<number>>;
  setQuantity: Dispatch<SetStateAction<number>>;
  setIsMultiPurchasable: Dispatch<SetStateAction<boolean>>;
  setType: Dispatch<SetStateAction<ItemType>>;
  setDescription: Dispatch<SetStateAction<string>>;
  setShippingFeeType: Dispatch<SetStateAction<0 | 1 | 2>>;
  setShipFromId: Dispatch<SetStateAction<number | null>>;
  setShipsWithinDays: Dispatch<SetStateAction<number | "">>;
  setImages: Dispatch<SetStateAction<ImageAsset[]>>;
  setMainIndex: Dispatch<SetStateAction<number>>;
  setLiveDetails: Dispatch<SetStateAction<LiveDetails>>;
  setSupplyDetails: Dispatch<SetStateAction<SupplyDetails>>;
  setCurrentStep: Dispatch<SetStateAction<"main" | "details">>;
};

// カテゴリー検索結果のアイテム型
export type CategorySearchResult = {
  id: number;
  name: string;
  built_in_type?: string;
  path?: string;
  // その他APIが返すフィールド
};

export type FormCalculations = {
  feeRate: number; // 手数料率 (0.10 など)
  feeYen: number; // 手数料額 (円)
  payoutYen: number; // 販売利益 (円)
  sellerPlusPctOptions: number[]; // 割引率の選択肢配列
};

// APIのエラー詳細（バリデーションエラーなど）
export type ApiValidationError = {
  field: string;
  msg: string;
};

// APIのエラーレスポンス全体
export type ApiErrorResponse = {
  message?: string;
  errors?: ApiValidationError[];
};

export type PublishSummary = {
    name: string;
    description: string;
    price: number;       // formState.priceはstringなので変換が必要
    seller_plus_pct: number; // formStateは sellerPlusPct なのでマッピングが必要
    quantity: number;
    isMultiPurchasable: boolean;
    type: ItemType;
    shippingFeeType: 0 | 1 | 2;
    shipFromId?: number;
    shipsWithinDays?: number;
    images: ImageAsset[];
    mainIndex: number;
    details: LiveDetails | SupplyDetails;
    total: number;       // 計算が必要
};