import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { CONFIG } from "../conf/config";
import api, { getAccessToken } from "../conf/api";
import { useToast } from "../conf/function";
//import { upsertAnimalDetails, upsertSupplyDetails } from "../conf/fleaDetails";
// Import types
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

type DraftResponse = {
  draft_id: number;
  name?: string;
  description?: string;
  price?: string;
  quantity?: number;
  type?: string; // APIからは文字列で来る
  category_id?: number;
  category_name?: string;
  details?: AnyDetails; // ここで AnyDetails を使う
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

// Constants
const FEE_BASE = 0.1;
const FEE_PER_PLUS_PCT = 0.01;
const FEE_MAX = 0.25;
const MIN_PLUS_PCT = 0;
const MAX_PLUS_PCT = 8;
const STEP_PLUS_PCT = 1;
const AUTOSAVE_MS = 1500;

type StepKey = "main" | "details";

export function useFleaItemForm() {
  const toast = useToast();
  const navigate = useNavigate();
  const { id: pathParamId } = useParams();
  const [searchParams] = useSearchParams();
  const queryParamId = searchParams.get("id");
  const targetDraftId = pathParamId || queryParamId;

  // ===== States (Explicit Types) =====
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
  const [categoryName, setCategoryName] = useState<string | null>("");

  // Details States
  const [liveDetails, setLiveDetails] = useState<LiveDetails>({
    locality: "",
    hatch_date: "",
    generation: "",
    size: "",
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

  // System States
  const [draftId, setDraftId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<StepKey>("main");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastItemId, setLastItemId] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [supplyTypes, setSupplyTypes] = useState<
    { id: number; name: string }[]
  >([]);

  // Refs
  const isSubmittingRef = useRef(false);
  const draftIdRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    draftIdRef.current = draftId;
  }, [draftId]);

  // ===== Initial Data Load =====
  useEffect(() => {
    api
      .get("api/supply-types")
      .then((res) => setSupplyTypes(res.data))
      .catch(console.error);
  }, []);

  // ===== Logic: Draft Restore =====
  const fetchDraftData = async (id: number) => {
    try {
      const res = await api.get(`/flea-market/draft/${id}`);
      // ▼ 修正: ここで型アサーションを行う
      const d = res.data as DraftResponse;
      console.log("Draft Data:", d);

      if (d.name) setName(d.name);
      if (d.price) setPrice(d.price);
      if (typeof d.seller_plus_pct === "number")
        setSellerPlusPct(d.seller_plus_pct);
      if (d.quantity) setQuantity(d.quantity);
      if (d.type) setType(d.type as ItemType);
      if (d.description) setDescription(d.description);
      if (d.shipping_fee_type !== undefined)
        setShippingFeeType(Number(d.shipping_fee_type) as 0 | 1 | 2);
      if (d.ship_from || d.ship_from_id)
        setShipFromId(Number(d.ship_from ?? d.ship_from_id));
      if (d.ships_within_days !== undefined)
        setShipsWithinDays(Number(d.ships_within_days) || "");
      if (d.category_id) setCategoryId(d.category_id);
      if (d.category_name) setCategoryName(d.category_name);

      // ▼ 修正: 画像の型定義と復元
      if (d.uploaded_images && Array.isArray(d.uploaded_images)) {
        const restoredImages: ImageAsset[] = d.uploaded_images.map((img) => ({
          id:
            img.id && typeof img.id === "string"
              ? img.id
              : Math.random().toString(36).substring(2, 15),
          url: img.url || "",
          // serverId があることで「アップロード済み」と判定される
          serverId:
            img.serverId ?? (typeof img.id === "number" ? img.id : undefined),
        }));
        setImages(restoredImages.filter((i) => !!i.url));
      }

      // ▼ 修正: 詳細情報の復元 (any を使わず型安全に)
      if (d.details) {
        if (d.type !== "SUPPLY") {
          const restored: LiveDetails = {
            locality: "",
            hatch_date: "",
            generation: "",
            size: "",
            sex: "unknown",
          };

          // details は AnyDetails 型なので、type に応じて適切な型として扱う
          switch (d.type) {
            case "REPTILE":
            case "AMPHIBIAN": {
              // Extract<T, U> で AnyDetails から特定の型を抜き出す
              const det = d.details as Extract<
                AnyDetails,
                { kind: "REPTILE" | "AMPHIBIAN" }
              >;
              restored.locality = det.morph; // locality <- morph
              restored.hatch_date = det.birth_date; // hatch_date <- birth_date
              restored.generation = det.lineage; // generation <- lineage
              restored.size = det.size;
              restored.sex = det.sex;
              break;
            }
            case "MAMMAL": {
              const det = d.details as Extract<AnyDetails, { kind: "MAMMAL" }>;
              restored.locality = det.origin;
              restored.hatch_date = det.birth_date;
              restored.generation = det.lineage;
              restored.size = det.size;
              restored.sex = det.sex;
              break;
            }
            case "FISH": {
              const det = d.details as Extract<AnyDetails, { kind: "FISH" }>;
              restored.locality = det.origin;
              restored.hatch_date = det.arrival_date;
              restored.generation = det.generation;
              restored.size = det.size;
              restored.sex = det.sex;
              break;
            }
            case "PLANT_ORNAMENTAL":
            case "PLANT_FOOD": {
              const det = d.details as Extract<AnyDetails, { kind: "PLANT" }>;
              restored.locality = det.origin;
              restored.hatch_date = det.acquisition_date;
              restored.generation = det.propagation;
              restored.size = det.size;
              // sex なし
              break;
            }
            default: {
              // INSECT など
              // 共通項目の fallback
              if ("locality" in d.details)
                restored.locality = d.details.locality;
              if ("hatch_date" in d.details)
                restored.hatch_date = d.details.hatch_date;
              if ("generation" in d.details)
                restored.generation = d.details.generation;
              if ("size" in d.details) restored.size = d.details.size;
              if ("sex" in d.details) restored.sex = d.details.sex as SexType;
              break;
            }
          }
          setLiveDetails(restored);
        } else {
          // SUPPLY
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
  };

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
  }, [targetDraftId]);

  // ===== Logic: Payload & Autosave =====
  const prune = <T extends object>(obj: T): Partial<T> => {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as Partial<T>;
  };

  const buildPayload = useCallback(() => {
    const p = Number(price);

    let details: AnyDetails;

    if (type === "SUPPLY") {
      details = {
        kind: "SUPPLY",
        brand: supplyDetails.brand || "",
        sku: supplyDetails.sku || "",
        net_weight_g:
          supplyDetails.net_weight_g &&
          !isNaN(Number(supplyDetails.net_weight_g))
            ? String(supplyDetails.net_weight_g)
            : "",
        supply_type_id: supplyDetails.supply_type_id || null,
        target_category_id: supplyDetails.target_category_id || null,
        target_category_name: "", // 必要なら入れる
      };
    } else {
      const d = liveDetails;
      // 性別の型合わせ (string -> SexType)
      const sexValue = (d.sex || "unknown") as SexType;

      switch (type) {
        case "REPTILE":
        case "AMPHIBIAN":
          details = {
            kind: type, // "REPTILE" | "AMPHIBIAN"
            morph: d.locality || "",
            birth_date: d.hatch_date || "",
            lineage: d.generation || "",
            size: d.size || "",
            sex: sexValue,
          };
          break;

        case "PLANT_ORNAMENTAL":
        case "PLANT_FOOD":
          details = {
            kind: "PLANT",
            origin: d.locality || "",
            acquisition_date: d.hatch_date || "",
            propagation: d.generation || "",
            size: d.size || "",
            // sexプロパティは存在しないので指定しない
          };
          break;

        case "MAMMAL":
          details = {
            kind: "MAMMAL",
            origin: d.locality || "",
            birth_date: d.hatch_date || "",
            lineage: d.generation || "",
            size: d.size || "",
            sex: sexValue,
          };
          break;

        case "FISH":
          details = {
            kind: "FISH",
            origin: d.locality || "",
            arrival_date: d.hatch_date || "",
            generation: d.generation || "",
            size: d.size || "",
            sex: sexValue,
          };
          break;

        case "INSECT":
        default:
          details = {
            kind: "INSECT",
            locality: d.locality || "",
            hatch_date: d.hatch_date || "",
            generation: d.generation || "",
            size: d.size || "",
            sex: sexValue,
          };
          break;
      }
    }

    return {
      // ... (以下変更なし)
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      price: price !== "" && !isNaN(p) && p > 0 ? String(p) : undefined,
      seller_plus_pct: Math.max(0, Math.min(10, Math.floor(sellerPlusPct))),
      quantity: isMultiPurchasable ? Math.max(1, quantity) : 1,
      type,
      category_id: categoryId || undefined,
      category_name: categoryName || undefined,
      is_multi_purchasable: isMultiPurchasable ? 1 : 0,
      shipping_fee_type: shippingFeeType,
      ship_from: shipFromId ? Number(shipFromId) : undefined,
      ships_within_days:
        shipsWithinDays === "" ? undefined : Number(shipsWithinDays),

      details, // 型が一致しているのでエラー消えるはず

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
    categoryName,
    shippingFeeType,
    shipFromId,
    shipsWithinDays,
    liveDetails,
    supplyDetails,
    images,
    mainIndex,
  ]);

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

          // ▼ 追加: ローカルストレージにIDを保存
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
    [buildPayload], // 依存配列はそのままでOK
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

  // ===== Save on Leave Logic =====
  useEffect(() => {
    const endpoint = CONFIG.BASE_URL + "/flea-market/draft/save";
    const saveOnLeave = () => {
      if (isSubmittingRef.current) return;
      try {
        if (getAccessToken() == null) return;
        const currentId = draftIdRef.current;
        const body = JSON.stringify({
          draft_id: currentId,
          payload: buildPayload(), // Note: buildPayload might depend on state that is stale in closure if not careful, but usually okay for unload
        });

        fetch(endpoint, {
          method: "POST",
          body,
          keepalive: true,
          headers: {
            "Content-Type": "application/json",
          },
          // Add credentials if needed, often 'include' or tokens in headers
        }).catch(() => void 0);
      } catch {
        // ignore
      }
    };

    const onPageHide = () => saveOnLeave();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveOnLeave();
    };
    const onBeforeUnload = () => saveOnLeave();

    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [buildPayload]); // Re-bind when payload builder changes

  // ===== Validation =====
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "商品名を入力してください";
    const p = Number(price);
    if (!price || isNaN(p) || p <= 0)
      e.price = "価格は 1 以上の数値で入力してください";
    if (!isMultiPurchasable && quantity !== 1)
      e.quantity = "単品出品では数量は 1 固定です";
    if (quantity < 1) e.quantity = "数量は 1 以上";
    if (images.length === 0) e.images = "商品画像を 1 枚以上追加してください";
    if (shipFromId === null) e.shipFrom = "発送元を選択してください";
    if (shipsWithinDays === "")
      e.shipsWithinDays = "発送目安を選択してください";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ===== Image Upload Helper =====
  const uploadImageFile = async (
    file: File,
  ): Promise<{ url: string; serverId: number } | null> => {
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await api.post("/flea-market/upload/temp", fd, {
        headers: { "Content-Type": undefined },
      });
      return { url: res.data.url, serverId: res.data.id };
    } catch (e) {
      console.error("Upload failed", e);
      return null;
    }
  };

  // ===== Handle Adding Images (Public Action) =====
  const handleAddImages = async (nextImages: ImageAsset[]) => {
    // 1. Update UI immediately
    setImages(nextImages);

    // 2. Upload new images in background
    const uploadedAssets = await Promise.all(
      nextImages.map(async (img) => {
        if (img.serverId) return img; // Already uploaded
        if (!img.file) return img; // No file to upload

        const result = await uploadImageFile(img.file);
        if (result) {
          return { ...img, url: result.url, serverId: result.serverId };
        }
        return img;
      }),
    );

    // 3. Update state with uploaded details
    setImages(uploadedAssets);

    // 4. Trigger autosave to persist new image IDs
    // We don't call autosaveNow() directly here to avoid race conditions,
    // relying on the useEffect timer or user action is safer,
    // but if you want immediate save, you can trigger it.
    // actions.autosaveNow();
  };

  // ===== Submit =====
  const doSubmit = async (): Promise<boolean> => {
    if (submitting || !validate()) return false;
    isSubmittingRef.current = true;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    try {
      setSubmitting(true);
      const fd = new FormData();
      const p = buildPayload(); // ここで適切な details オブジェクトが作られている前提

      // Payload to FormData
      Object.entries(p).forEach(([k, v]) => {
        // ★修正1: "details" を除外しない！
        if (k === "uploaded_images") return;

        // ★修正2: details は JSON文字列に変換して FormData に入れる
        if (k === "details") {
          fd.append(k, JSON.stringify(v));
          return;
        }

        if (v !== undefined && v !== null) {
          fd.append(k, String(v));
        }
      });

      // カテゴリー名などが buildPayload に含まれていない場合の予備処理
      if (!p.category_id && categoryId)
        fd.append("category_id", String(categoryId));
      if (!p.category_name && categoryName)
        fd.append("category_name", categoryName);

      // 画像処理 (既存のまま)
      images.forEach((img, i) => {
        if (img.serverId) {
          fd.append("image_ids", String(img.serverId));
        } else if (img.file) {
          fd.append("images", img.file, img.file.name || `image_${i}.jpg`);
        }
      });

      if (draftId) fd.append("draft_id", String(draftId));

      // API送信
      const res = await api.post("/flea-market/add/item", fd, {
        headers: { "Content-Type": undefined },
      });

      const newId = res.data?.itemId ?? null;
      setLastItemId(newId);

      // ★修正3: 以前あった upsertAnimalDetails / upsertSupplyDetails の呼び出しを削除！
      // バックエンド側で一括保存されるようになったため不要です。

      // ローカルストレージとドラフトの削除 (既存のまま)
      localStorage.removeItem("flea_item_draft");
      if (draftId) {
        await api
          .delete(CONFIG.BASE_URL + "/flea-market/draft/" + draftId)
          .catch(() => {});
      }

      toast({ text: "出品が完了しました！", kind: "success" });
      return true;
    } catch (err: unknown) {
      // エラーハンドリング (既存のまま)
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

  // Reset Form
  const resetForm = useCallback(() => {
    if (!window.confirm("入力内容をクリアしますか？")) return;
    setName("");
    setPrice("");
    setSellerPlusPct(0);
    setQuantity(1);
    setIsMultiPurchasable(false);
    setType("INSECT");
    setCategoryId(null);
    setCategoryName("");
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
      size: "",
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

  // Calculations
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

  const formState: FormState = {
    name,
    price,
    sellerPlusPct,
    quantity,
    isMultiPurchasable,
    type,
    categoryId,
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
    actions: {
      autosaveNow,
      doSubmit,
      resetForm,
      validate,
      handleAddImages, // Added this action
    },
  };
}
