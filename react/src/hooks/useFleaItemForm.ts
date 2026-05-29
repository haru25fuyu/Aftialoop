import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";

import api, { getAccessToken } from "../conf/api";
import { useToast } from "../conf/function";

// ✅ 重複定数を feeConstants から import（FleaItemEdit.tsx と二重定義していたものを統一）
import {
  FEE_BASE,
  FEE_PER_PLUS_PCT,
  FEE_MAX,
  MIN_PLUS_PCT,
  MAX_PLUS_PCT,
  STEP_PLUS_PCT,
  AUTOSAVE_MS,
} from "../conf/feeConstants";

import { ImageAsset } from "../types/FleaMarket";
import {
  FormState,
  FormSetters,
  FormCalculations,
  LiveDetails,
  SupplyDetails,
  ApiErrorResponse,
  AnyDetails,
  SexType,
} from "../types/FleaMarketForm";
import { ItemType } from "../types/Market";

// ── 型定義 ────────────────────────────────────────────────

type DraftResponse = {
  draft_id: number;
  name?: string;
  description?: string;
  price?: string;
  quantity?: number;
  type?: string;
  category_id?: number;
  supply_type_id?: number;
  category_name?: string;
  details?: AnyDetails;
  is_multi_purchasable?: number;
  shipping_fee_type?: number;
  ship_from?: number;
  ship_from_id?: number;
  ships_within_days?: number;
  main_image_url?: string;
  uploaded_images?: Array<{
    id?: string | number;
    serverId?: number;
    url?: string;
  }>;
  seller_plus_pct?: number;
  updated_at?: string;
};

type StepKey = "main" | "details";

// ── Hook 本体 ─────────────────────────────────────────────

export function useFleaItemForm() {
  const toast = useToast();
  const navigate = useNavigate();
  const { id: pathParamId } = useParams();
  const [searchParams] = useSearchParams();
  const queryParamId = searchParams.get("id");
  const targetDraftId = pathParamId || queryParamId;

  // ===== States =====
  const [name, setName] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [sellerPlusPct, setSellerPlusPct] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [isMultiPurchasable, setIsMultiPurchasable] = useState<boolean>(false);
  const [type, setType] = useState<ItemType>("INSECT");
  const [description, setDescription] = useState<string>("");
  const [shippingFeeType, setShippingFeeType] = useState<0 | 1 | 2>(0);
  const [shipFromId, setShipFromId] = useState<number | null>(null);
  const [shipsWithinDays, setShipsWithinDays] = useState<number | "">(2);
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [mainIndex, setMainIndex] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [supplyTypeId, setSupplyTypeId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [liveDetails, setLiveDetails] = useState<LiveDetails>({
    locality: "",
    hatch_date: "",
    generation: "",
    size_value: 0,
    size_unit: "mm",
    size_mm: null,
    sex: "unknown",
  });
  const [supplyDetails, setSupplyDetails] = useState<SupplyDetails>({
    kind: "SUPPLY",
    brand: "",
    sku: "",
    net_weight_g: "",
    supply_type_id: null,
    target_category_id: null,
    target_category_name: "",
  });
  const [supplyTypes, setSupplyTypes] = useState<
    { id: number; name: string }[]
  >([]);
  const [currentStep, setCurrentStep] = useState<StepKey>("main");
  const [draftId, setDraftId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastItemId, setLastItemId] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  const autosaveTimerRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const draftIdRef = useRef<number | null>(null);

  useEffect(() => {
    draftIdRef.current = draftId;
  }, [draftId]);

  // ===== 用品タイプ取得 =====
  // ✅ バックエンドのルートは /api/supply-types (category.go) に合わせる
  useEffect(() => {
    api
      .get<{ supply_types: { id: number; name: string }[] }>(
        "/api/supply-types",
      )
      .then((res) => setSupplyTypes(res.data.supply_types ?? []))
      .catch(() => {});
  }, []);

  // ===== 下書き取得 =====
  const fetchDraftData = useCallback(
    async (id: number) => {
      try {
        const res = await api.get<{ draft: DraftResponse }>(
          `/flea-market/draft/${id}`,
        );
        const d = res.data.draft;
        if (!d) throw new Error("draft not found");

        if (d.name) setName(d.name);
        if (d.description) setDescription(d.description);
        if (d.price) setPrice(d.price);
        if (d.quantity) setQuantity(Number(d.quantity));
        if (d.type) setType(d.type as ItemType);
        if (d.is_multi_purchasable !== undefined)
          setIsMultiPurchasable(!!d.is_multi_purchasable);
        if (d.shipping_fee_type !== undefined)
          setShippingFeeType(d.shipping_fee_type as 0 | 1 | 2);
        if (d.ship_from !== undefined) setShipFromId(Number(d.ship_from));
        if (d.ship_from_id !== undefined) setShipFromId(Number(d.ship_from_id));
        if (d.ships_within_days !== undefined) {
          const v = Number(d.ships_within_days);
          setShipsWithinDays(isNaN(v) || v === 0 ? "" : v);
        }
        if (d.seller_plus_pct !== undefined)
          setSellerPlusPct(d.seller_plus_pct);
        if (d.category_id) setCategoryId(d.category_id);
        if (d.supply_type_id) setSupplyTypeId(d.supply_type_id);
        if (d.category_name) setCategoryName(d.category_name);

        if (d.uploaded_images && Array.isArray(d.uploaded_images)) {
          const restoredImages: ImageAsset[] = d.uploaded_images
            .map((img) => ({
              id:
                img.id && typeof img.id === "string"
                  ? img.id
                  : Math.random().toString(36).substring(2, 15),
              url: img.url || "",
              serverId:
                img.serverId ??
                (typeof img.id === "number" ? img.id : undefined),
            }))
            .filter((i) => !!i.url);
          setImages(restoredImages);
        }

        if (d.details) {
          if (d.type !== "SUPPLY") {
            const restored: LiveDetails = {
              locality: "",
              hatch_date: "",
              generation: "",
              size_value: 0,
              size_unit: "mm",
              size_mm: null,
              sex: "unknown",
            };
            switch (d.type) {
              case "REPTILE":
              case "AMPHIBIAN": {
                const det = d.details as Extract<
                  AnyDetails,
                  { kind: "REPTILE" | "AMPHIBIAN" }
                >;
                restored.locality = det.morph;
                restored.hatch_date = det.birth_date;
                restored.generation = det.lineage;
                restored.size_value = det.size_value;
                restored.size_unit = det.size_unit;
                restored.size_mm = det.size_mm;
                restored.sex = det.sex;
                break;
              }
              case "MAMMAL": {
                const det = d.details as Extract<
                  AnyDetails,
                  { kind: "MAMMAL" }
                >;
                restored.locality = det.origin;
                restored.hatch_date = det.birth_date;
                restored.generation = det.lineage;
                restored.size_value = det.size_value;
                restored.size_unit = det.size_unit;
                restored.size_mm = det.size_mm;
                restored.sex = det.sex;
                break;
              }
              case "FISH": {
                const det = d.details as Extract<AnyDetails, { kind: "FISH" }>;
                restored.locality = det.origin;
                restored.hatch_date = det.arrival_date;
                break;
              }
            }
            setLiveDetails(restored);
          } else {
            const det = d.details as Extract<AnyDetails, { kind: "SUPPLY" }>;
            setSupplyDetails((prev) => ({
              ...prev,
              brand: det.brand,
              sku: det.sku,
              net_weight_g: det.net_weight_g,
              supply_type_id: det.supply_type_id,
              target_category_id: det.target_category_id,
            }));
          }
        }

        setDraftId(id);
        if (d.updated_at) setLastSavedAt(d.updated_at);
        setSaving("saved");
      } catch (e) {
        console.error("Fetch Draft Error:", e);
        toast({ text: "下書きが見つかりませんでした", kind: "error" });
        navigate("/flea-market/sell/create", { replace: true });
      }
    },
    [toast, navigate],
  );

  useEffect(() => {
    if (targetDraftId) {
      const id = Number(targetDraftId);
      if (!isNaN(id) && id > 0) {
        fetchDraftData(id);
        return;
      }
    }
    const saved = localStorage.getItem("flea_item_draft");
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d._draftId) fetchDraftData(d._draftId);
      } catch (e) {
        console.error(e);
      }
    }
  }, [targetDraftId, fetchDraftData]);

  // ===== Payload 生成 =====
  const prune = <T extends object>(obj: T): Partial<T> =>
    Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as Partial<T>;

  const buildPayload = useCallback(() => {
    const p = Number(price);
    let details: AnyDetails;

    if (type === "SUPPLY") {
      details = {
        kind: "SUPPLY",
        brand: supplyDetails.brand || "",
        sku: supplyDetails.sku || "",
        net_weight_g: supplyDetails.net_weight_g,
        supply_type_id: supplyDetails.supply_type_id,
        target_category_id: supplyDetails.target_category_id,
        target_category_name: supplyDetails.target_category_name,
      };
    } else {
      details = {
        kind: type as Exclude<ItemType, "SUPPLY">,
        morph: liveDetails.locality || "",
        birth_date: liveDetails.hatch_date || "",
        lineage: liveDetails.generation || "",
        size_value: liveDetails.size_value,
        size_unit: liveDetails.size_unit,
        size_mm: liveDetails.size_mm,
        sex: liveDetails.sex as SexType,
        origin: liveDetails.locality || "",
        arrival_date: liveDetails.hatch_date || "",
      } as unknown as AnyDetails;
    }

    return {
      name: name || undefined,
      description: description || undefined,
      price: !isNaN(p) && p > 0 ? String(p) : undefined,
      seller_plus_pct: Math.max(0, Math.min(10, Math.floor(sellerPlusPct))),
      quantity: isMultiPurchasable ? Math.max(1, quantity) : 1,
      type,
      category_id: categoryId || undefined,
      supply_type_id: supplyTypeId || undefined,
      category_name: categoryName ?? undefined,
      is_multi_purchasable: isMultiPurchasable ? 1 : 0,
      shipping_fee_type: shippingFeeType,
      ship_from: shipFromId ? Number(shipFromId) : undefined,
      ships_within_days:
        shipsWithinDays === "" ? undefined : Number(shipsWithinDays),
      details,
      uploaded_images: images
        .filter((img) => img.serverId && img.url)
        .map((img) => ({ id: img.id, serverId: img.serverId, url: img.url })),
      main_index: mainIndex,
      main_image_url: images.length > 0 ? images[0].url : undefined,
    };
  }, [
    name,
    description,
    price,
    sellerPlusPct,
    isMultiPurchasable,
    quantity,
    type,
    categoryId,
    supplyTypeId,
    categoryName,
    shippingFeeType,
    shipFromId,
    shipsWithinDays,
    liveDetails,
    supplyDetails,
    images,
    mainIndex,
  ]);

  // ===== 自動保存 =====
  const autosaveNow = useCallback(
    async (signal?: AbortSignal) => {
      if (isSavingRef.current || isSubmittingRef.current) return;
      const payload = prune(buildPayload());
      if (Number.isNaN(Number(payload.price))) payload.price = undefined;

      try {
        isSavingRef.current = true;
        setSaving("saving");
        const res = await api.post(
          "/flea-market/draft/save",
          { draft_id: draftIdRef.current, payload },
          { signal },
        );
        if (res.data.draft_id) {
          const newDraftId = res.data.draft_id;
          draftIdRef.current = newDraftId;
          setDraftId((prev) => (prev !== newDraftId ? newDraftId : prev));
          localStorage.setItem(
            "flea_item_draft",
            JSON.stringify({ _draftId: newDraftId }),
          );
        }
        if (res.data.saved_at) setLastSavedAt(res.data.saved_at);
        setSaving("saved");
      } catch (e: unknown) {
        if (!axios.isCancel(e)) setSaving("error");
      } finally {
        isSavingRef.current = false;
      }
    },
    [buildPayload],
  );

  useEffect(() => {
    const controller = new AbortController();
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(
      () => autosaveNow(controller.signal),
      AUTOSAVE_MS,
    );
    return () => {
      controller.abort();
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [autosaveNow]);

  // ===== 離脱時保存（keepalive fetch — api インスタンスは使えないためここだけ fetch 直打ちが正しい） =====
  useEffect(() => {
    const saveOnLeave = () => {
      if (isSubmittingRef.current) return;
      const token = getAccessToken();
      if (!token) return;
      try {
        fetch("/flea-market/draft/save", {
          method: "POST",
          keepalive: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            draft_id: draftIdRef.current,
            payload: buildPayload(),
          }),
        }).catch(() => void 0);
      } catch {
        // ignore
      }
    };

    window.addEventListener("pagehide", saveOnLeave);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveOnLeave();
    });
    window.addEventListener("beforeunload", saveOnLeave);

    return () => {
      window.removeEventListener("pagehide", saveOnLeave);
      window.removeEventListener("beforeunload", saveOnLeave);
    };
  }, [buildPayload]);

  // ===== バリデーション =====
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "商品名を入力してください";
    const p = Number(price);
    if (!price || isNaN(p) || p <= 0)
      e.price = "価格は1以上の数値で入力してください";
    if (!isMultiPurchasable && quantity !== 1)
      e.quantity = "単品出品では数量は1固定です";
    if (quantity < 1) e.quantity = "数量は1以上";
    if (images.length === 0) e.images = "商品画像を1枚以上追加してください";
    if (shipFromId === null) e.shipFrom = "発送元を選択してください";
    if (shipsWithinDays === "")
      e.shipsWithinDays = "発送目安を選択してください";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ===== 画像アップロード =====
  const uploadImageFile = async (
    file: File,
  ): Promise<{ url: string; serverId: number } | null> => {
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await api.post<{ url: string; id: number }>(
        "/flea-market/upload/temp",
        fd,
        {
          headers: { "Content-Type": undefined },
        },
      );
      return { url: res.data.url, serverId: res.data.id };
    } catch {
      return null;
    }
  };

  const handleAddImages = async (nextImages: ImageAsset[]) => {
    const uploadedAssets = await Promise.all(
      nextImages.map(async (img) => {
        if (img.serverId || !img.file) return img;
        const result = await uploadImageFile(img.file);
        return result
          ? { ...img, url: result.url, serverId: result.serverId }
          : img;
      }),
    );
    setImages(uploadedAssets);
  };

  // ===== 出品 =====
  const doSubmit = async (): Promise<boolean> => {
    if (submitting || !validate()) return false;
    isSubmittingRef.current = true;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    try {
      setSubmitting(true);
      const fd = new FormData();
      const p = buildPayload();

      Object.entries(p).forEach(([k, v]) => {
        if (k === "uploaded_images") return;
        if (k === "details") {
          fd.append(k, JSON.stringify(v));
          return;
        }
        if (v !== undefined && v !== null) fd.append(k, String(v));
      });

      if (!p.category_id && categoryId)
        fd.append("category_id", String(categoryId));
      if (!p.category_name && categoryName)
        fd.append("category_name", String(categoryName));

      images.forEach((img, i) => {
        if (img.serverId) fd.append("image_ids", String(img.serverId));
        else if (img.file)
          fd.append("images", img.file, img.file.name || `image_${i}.jpg`);
      });

      if (draftId) fd.append("draft_id", String(draftId));

      const res = await api.post("/flea-market/add/item", fd, {
        headers: { "Content-Type": undefined },
      });

      setLastItemId(res.data?.itemId ?? null);
      localStorage.removeItem("flea_item_draft");

      // ✅ CONFIG.BASE_URL の直接結合をやめて api インスタンスで統一
      if (draftId) {
        await api.delete(`/flea-market/draft/${draftId}`).catch(() => {});
      }

      toast({ text: "出品が完了しました！", kind: "success" });
      return true;
    } catch (err: unknown) {
      let msg = "エラーが発生しました";
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as ApiErrorResponse | undefined;
        msg = data?.message ?? "通信エラーが発生しました";
        if (data?.errors && Array.isArray(data.errors)) {
          const serverErrors: Record<string, string> = {};
          data.errors.forEach((e) => {
            serverErrors[e.field] = e.msg;
          });
          setErrors((prev) => ({ ...prev, ...serverErrors }));
        }
      }
      toast({ text: msg, kind: "error" });
      return false;
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // ===== リセット =====
  const resetForm = useCallback(() => {
    if (!window.confirm("入力内容をクリアしますか？")) return;
    setName("");
    setPrice("");
    setSellerPlusPct(0);
    setQuantity(1);
    setIsMultiPurchasable(false);
    setType("INSECT");
    setCategoryId(null);
    setSupplyTypeId(null);
    setCategoryName(null);
    setDescription("");
    setShippingFeeType(0);
    setShipFromId(null);
    setShipsWithinDays(2);
    setImages([]);
    setMainIndex(0);
    setLiveDetails({
      locality: "",
      hatch_date: "",
      generation: "",
      size_value: 0,
      size_unit: "mm",
      size_mm: null,
      sex: "unknown",
    });
    setSupplyDetails({
      kind: "SUPPLY",
      brand: "",
      sku: "",
      net_weight_g: "",
      supply_type_id: null,
      target_category_id: null,
      target_category_name: "",
    });
    setDraftId(null);
    setLastItemId(null);
    setLastSavedAt(null);
    setSaving("idle");
    localStorage.removeItem("flea_item_draft");
    navigate("/flea-market/sell/create", { replace: true });
  }, [navigate]);

  // ===== 手数料計算 =====
  const feeRate = Math.min(
    FEE_MAX,
    FEE_BASE +
      Math.max(
        MIN_PLUS_PCT,
        Math.min(MAX_PLUS_PCT, Math.floor(sellerPlusPct)),
      ) *
        FEE_PER_PLUS_PCT,
  );
  const feeYen = Math.floor((Number(price) || 0) * feeRate);
  const payoutYen = Math.max(0, Math.floor((Number(price) || 0) - feeYen));
  const sellerPlusPctOptions = useMemo(
    () =>
      Array.from(
        {
          length: Math.round((MAX_PLUS_PCT - MIN_PLUS_PCT) / STEP_PLUS_PCT) + 1,
        },
        (_, i) => MIN_PLUS_PCT + STEP_PLUS_PCT * i,
      ),
    [],
  );

  // ===== 返却 =====
  const formState: FormState = {
    name,
    price,
    sellerPlusPct,
    quantity,
    isMultiPurchasable,
    type,
    categoryId,
    supplyTypeId,
    categoryName,
    description,
    shippingFeeType,
    shipFromId,
    shipsWithinDays,
    images,
    mainIndex,
    liveDetails,
    supplyDetails,
  };
  const systemState = {
    draftId,
    currentStep,
    submitting,
    errors,
    lastItemId,
    lastSavedAt,
    saving,
    supplyTypes,
  };
  const calc: FormCalculations = {
    feeRate,
    feeYen,
    payoutYen,
    sellerPlusPctOptions,
  };
  const setters: FormSetters = {
    setName,
    setPrice,
    setSellerPlusPct,
    setQuantity,
    setIsMultiPurchasable,
    setType,
    setCategoryId,
    setSupplyTypeId,
    setCategoryName,
    setDescription,
    setShippingFeeType,
    setShipFromId,
    setShipsWithinDays,
    setImages,
    setMainIndex,
    setLiveDetails,
    setSupplyDetails,
    setCurrentStep,
  };

  return {
    formState,
    systemState,
    calc,
    setters,
    actions: { autosaveNow, doSubmit, resetForm, validate, handleAddImages },
  };
}
