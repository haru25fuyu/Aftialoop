import { Dispatch, SetStateAction } from "react";
import { ImageAsset } from "./FleaMarket";
import { ItemType } from "./Market";

// ==========================================
// 1. 共通定義
// ==========================================
export type SexType = "male" | "female" | "unknown" | "pair" | "none";

// ==========================================
// 2. 入力フォーム用 State型 (FormStateで使用)
// ※ 入力欄を共通化するため、抽象的な名前(locality, hatch_date等)を使います
// ==========================================
export type LiveDetails = {
  locality: string; // 産地 / モルフ / 入手元
  hatch_date: string; // 羽化日 / 生年月日 / 入荷日
  generation: string; // 累代 / 血統 / 品種
  size: string; // サイズ / 全長 / 体重
  sex: SexType; // 性別
};

export type SupplyDetails = {
  kind: "SUPPLY"; // State管理の都合上、固定値を入れることも考慮
  brand: string;
  sku: string;
  net_weight_g: string;
  supply_type_id: number | null;
  target_category_id: number | null;
  target_category_name: string;
};

// ==========================================
// 3. フォーム全体のState定義
// ==========================================
export type FormState = {
  name: string;
  price: string;
  sellerPlusPct: number;
  quantity: number;
  isMultiPurchasable: boolean;
  type: ItemType;
  categoryId: number | null; // キャメルケース
  categoryName: string | null; // キャメルケース
  description: string;
  shippingFeeType: 0 | 1 | 2;
  shipFromId: number | null;
  shipsWithinDays: number | "";
  images: ImageAsset[];
  mainIndex: number;

  // 入力中は汎用型を使う
  liveDetails: LiveDetails;
  supplyDetails: SupplyDetails;
};

// Setter関数の型
export type FormSetters = {
  setName: Dispatch<SetStateAction<string>>;
  setPrice: Dispatch<SetStateAction<string>>;
  setSellerPlusPct: Dispatch<SetStateAction<number>>;
  setQuantity: Dispatch<SetStateAction<number>>;
  setIsMultiPurchasable: Dispatch<SetStateAction<boolean>>;
  setType: Dispatch<SetStateAction<ItemType>>;
  setCategoryId: Dispatch<SetStateAction<number | null>>;
  setCategoryName: Dispatch<SetStateAction<string | null>>;
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

// ==========================================
// 4. 計算結果の型
// ==========================================
export type FormCalculations = {
  feeRate: number;
  feeYen: number;
  payoutYen: number;
  sellerPlusPctOptions: number[];
};

// ==========================================
// 5. 保存・確認用 詳細型 (PublishSummaryで使用)
// ※ ここで厳密に型を分けます
// ==========================================

// 昆虫 (INSECT)
export type InsectDetails = {
  kind: "INSECT";
  locality: string;
  hatch_date: string;
  generation: string;
  size: string;
  sex: SexType;
};

// 爬虫類・両生類 (REPTILE, AMPHIBIAN)
export type ReptileDetails = {
  kind: "REPTILE" | "AMPHIBIAN";
  morph: string; // locality -> morph
  birth_date: string; // hatch_date -> birth_date
  lineage: string; // generation -> lineage
  size: string;
  sex: SexType;
};

// 植物 (PLANT)
export type PlantDetails = {
  kind: "PLANT";
  origin: string; // locality -> origin
  acquisition_date: string; // hatch_date -> acquisition_date
  propagation: string; // generation -> propagation
  size: string;
  // sexなし
};

// 哺乳類 (MAMMAL)
export type MammalDetails = {
  kind: "MAMMAL";
  origin: string;
  birth_date: string;
  lineage: string;
  size: string;
  sex: SexType;
};

// 魚類 (FISH)
export type FishDetails = {
  kind: "FISH";
  origin: string;
  arrival_date: string;
  generation: string;
  size: string;
  sex: SexType;
};

// すべての詳細型のユニオン
export type AnyDetails =
  | InsectDetails
  | ReptileDetails
  | PlantDetails
  | MammalDetails
  | FishDetails
  | SupplyDetails;

// ==========================================
// 6. 確認画面・送信用のサマリー型
// ==========================================
export type PublishSummary = {
  name: string;
  price: number;
  seller_plus_pct: number;
  quantity: number;
  total: number;
  isMultiPurchasable: boolean;
  type: ItemType;
  description: string;
  shippingFeeType: 0 | 1 | 2;
  shipFromId: number | undefined;
  shipsWithinDays: number | undefined;
  mainIndex: number;

  category_name?: string | null; // 表示用

  details: AnyDetails;

  images: ImageAsset[];
};

// エラーレスポンス用
export type ApiErrorResponse = {
  message?: string;
  errors?: Array<{ field: string; msg: string }>;
};
