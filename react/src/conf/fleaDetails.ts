import api from "./api";

// ── 型定義 ────────────────────────────────────────────────

export type LiveDetailsState = {
  locality: string;
  hatch_date: string;
  generation: string;
  size: string;
  sex: "male" | "female" | "unknown" | "pair";
};

export type SupplyDetailsState = {
  brand: string;
  sku: string;FEE_BASE
  net_weight_g: string;
};

// ── バリデーション ────────────────────────────────────────

export const hasAnimalDetails = (d: LiveDetailsState): boolean =>
  !!d.locality || !!d.hatch_date || !!d.generation || !!d.size || d.sex !== "unknown";

export const hasSupplyDetails = (d: SupplyDetailsState): boolean =>
  !!d.brand || !!d.sku || !!d.net_weight_g;

// ── API 関数 ─────────────────────────────────────────────
// ✅ 生の axios + localStorage.getItem("token") をやめて api インスタンスに統一
//    → api.ts のトークン自動付与・リフレッシュ機能が正しく動くようになる

export async function upsertAnimalDetails(
  itemId: number,
  details: LiveDetailsState,
): Promise<void> {
  if (!hasAnimalDetails(details)) return;

  await api.post(`/flea-market/item/${itemId}/animal-details`, {
    animal: {
      locality: details.locality || null,
      hatch_date: details.hatch_date || null,
      generation: details.generation || null,
      size: details.size || null,
      sex: details.sex || "unknown",
    },
  });
}

export async function upsertSupplyDetails(
  itemId: number,
  details: SupplyDetailsState,
): Promise<void> {
  if (!hasSupplyDetails(details)) return;

  await api.post(`/flea-market/item/${itemId}/supply-details`, {
    supply: {
      brand: details.brand || null,
      sku: details.sku || null,
      net_weight_g: details.net_weight_g ? Number(details.net_weight_g) : null,
    },
  });
}