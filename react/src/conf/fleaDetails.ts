// src/api/fleaDetails.ts
import axios from "axios";
import { CONFIG } from "../conf/config";

// コンポーネント側の state そのまま渡せるように型を定義
export type LiveDetailsState = {
  locality: string;
  hatch_date: string;
  generation: string;
  size: string;
  sex: "male" | "female" | "unknown" | "pair";
};

export type SupplyDetailsState = {
  brand: string;
  sku: string;
  net_weight_g: string; // 入力は文字列でOK
};

// 「何か入力されてるか？」チェックもここで共通化しておくと便利
export const hasAnimalDetails = (d: LiveDetailsState): boolean => {
  return (
    !!d.locality ||
    !!d.hatch_date ||
    !!d.generation ||
    !!d.size ||
    d.sex !== "unknown"
  );
};

export const hasSupplyDetails = (d: SupplyDetailsState): boolean => {
  return !!d.brand || !!d.sku || !!d.net_weight_g;
};

// 生体詳細の upsert
export async function upsertAnimalDetails(
  itemId: number,
  details: LiveDetailsState,
): Promise<void> {
  if (!hasAnimalDetails(details)) return; // 何も入ってなければ投げない

  const token = localStorage.getItem("token") ?? "";

  await axios.post(
    `${CONFIG.BASE_URL}/flea-market/item/${itemId}/animal-details`,
    {
      animal: {
        locality: details.locality || null,
        hatch_date: details.hatch_date || null,
        generation: details.generation || null,
        size: details.size || null,
        sex: details.sex || "unknown",
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      withCredentials: true,
      timeout: 10000,
    },
  );
}

// 用品詳細の upsert
export async function upsertSupplyDetails(
  itemId: number,
  details: SupplyDetailsState,
): Promise<void> {
  if (!hasSupplyDetails(details)) return;

  const token = localStorage.getItem("token") ?? "";

  await axios.post(
    `${CONFIG.BASE_URL}/flea-market/item/${itemId}/supply-details`,
    {
      supply: {
        brand: details.brand || null,
        sku: details.sku || null,
        net_weight_g: details.net_weight_g
          ? Number(details.net_weight_g)
          : null,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      withCredentials: true,
      timeout: 10000,
    },
  );
}
