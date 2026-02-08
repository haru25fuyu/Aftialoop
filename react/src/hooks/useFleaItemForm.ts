import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { CONFIG } from "../conf/config";
import api, { getAccessToken } from "../conf/api";
import { useToast } from "../conf/function";
import { upsertAnimalDetails, upsertSupplyDetails } from "../conf/fleaDetails";
// Import types
import { ImageAsset } from "../types/FleaMarket";
import {
  FormState,
  FormSetters,
  FormCalculations,
  LiveDetails,
  SupplyDetails,
  ApiErrorResponse,
} from "../types/FleaMarketForm";
import { ItemType } from "../types/Market";

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

  // Details States
  const [liveDetails, setLiveDetails] = useState<LiveDetails>({
    category_id: null,
    category_name: "",
    locality: "",
    hatch_date: "",
    generation: "",
    size: "",
    sex: "unknown",
  });
  const [supplyDetails, setSupplyDetails] = useState<SupplyDetails>({
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
      .get("/supply-types")
      .then((res) => setSupplyTypes(res.data))
      .catch(console.error);
  }, []);

  // ===== Logic: Draft Restore =====
  const fetchDraftData = async (id: number) => {
    try {
      const res = await api.get(`/flea-market/draft/${id}`);
      const d = res.data;

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

      // Robust Image Restoration
      if (d.uploaded_images && Array.isArray(d.uploaded_images)) {
        // any回避のための型定義
        type RawDraftImage = {
          id?: string | number;
          url?: string;
          serverId?: number;
          server_id?: number;
        };
        const rawImages = d.uploaded_images as RawDraftImage[];

        const restoredImages: ImageAsset[] = rawImages.map((img) => ({
          id:
            img.id && typeof img.id === "string"
              ? img.id
              : Math.random().toString(36).substring(2, 15),
          url: img.url || "",
          serverId:
            img.serverId ??
            img.server_id ??
            (typeof img.id === "number" ? img.id : undefined),
        }));
        setImages(restoredImages.filter((i) => !!i.url));
      }

      if (d.details) {
        if (d.type !== "SUPPLY") {
          setLiveDetails((prev) => ({
            ...prev,
            ...d.details,
            category_id: d.details.category_id,
            category_name: d.details.category_name || "",
          }));
        } else {
          setSupplyDetails((prev) => ({ ...prev, ...d.details }));
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
    const details =
      type !== "SUPPLY"
        ? {
            kind: "ANIMAL",
            category_id: liveDetails.category_id || undefined,
            locality: liveDetails.locality || undefined,
            hatch_date: liveDetails.hatch_date || undefined,
            generation: liveDetails.generation || undefined,
            size: liveDetails.size || undefined,
            sex: liveDetails.sex || "unknown",
          }
        : {
            kind: "SUPPLY",
            brand: supplyDetails.brand || undefined,
            sku: supplyDetails.sku || undefined,
            net_weight_g:
              supplyDetails.net_weight_g &&
              !isNaN(Number(supplyDetails.net_weight_g))
                ? Number(supplyDetails.net_weight_g)
                : undefined,
            supply_type_id: supplyDetails.supply_type_id || undefined,
            target_category_id: supplyDetails.target_category_id || undefined,
          };

    return {
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      price: price !== "" && !isNaN(p) && p > 0 ? String(p) : undefined,
      seller_plus_pct: Math.max(
        MIN_PLUS_PCT,
        Math.min(MAX_PLUS_PCT, Math.floor(sellerPlusPct)),
      ),
      quantity: isMultiPurchasable ? Math.max(1, quantity) : 1,
      type,
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
          draftIdRef.current = res.data.draft_id;
          setDraftId((prev) =>
            prev !== res.data.draft_id ? res.data.draft_id : prev,
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
      const p = buildPayload();

      // Payload to FormData
      Object.entries(p).forEach(([k, v]) => {
        if (k === "details" || k === "uploaded_images") return;
        if (v !== undefined) fd.append(k, String(v));
      });

      // Image Handling for Submit
      images.forEach((img, i) => {
        if (img.serverId) {
          fd.append("image_ids", String(img.serverId));
        } else if (img.file) {
          fd.append("images", img.file, img.file.name || `image_${i}.jpg`);
        }
      });

      if (draftId) fd.append("draft_id", String(draftId));

      const res = await api.post("/flea-market/add/item", fd, {
        headers: { "Content-Type": undefined },
      });
      const newId = res.data?.itemId ?? null;
      setLastItemId(newId);

      if (newId) {
        if (type !== "SUPPLY") await upsertAnimalDetails(newId, liveDetails);
        else await upsertSupplyDetails(newId, supplyDetails);
      }

      localStorage.removeItem("flea_item_draft");
      if (draftId) {
        await api
          .delete(CONFIG.BASE_URL + "/flea-market/draft/" + draftId)
          .catch(() => {});
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

  // Reset Form
  const resetForm = useCallback(() => {
    if (!window.confirm("入力内容をクリアしますか？")) return;
    setName("");
    setPrice("");
    setSellerPlusPct(0);
    setQuantity(1);
    setIsMultiPurchasable(false);
    setType("INSECT");
    setDescription("");
    setShippingFeeType(0);
    setShipFromId(null);
    setShipsWithinDays(2);
    setImages([]);
    setMainIndex(0);
    setLiveDetails({
      category_id: null,
      category_name: "",
      locality: "",
      hatch_date: "",
      generation: "",
      size: "",
      sex: "unknown",
    });
    setSupplyDetails({
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
