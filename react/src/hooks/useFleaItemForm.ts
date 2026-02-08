import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";

import { CONFIG } from "../conf/config";
import api, { getAccessToken } from "../conf/api";
import { useToast } from "../conf/function";
import { upsertAnimalDetails, upsertSupplyDetails } from "../conf/fleaDetails";

import { ItemType } from "../types/Market";
import { ImageAsset } from "../types/FleaMarket";
import { LiveDetails, SupplyDetails } from "../types/FleaMarketForm";

// 型定義
export type SexType = "male" | "female" | "unknown" | "pair";
type ApiErrorResponse = {
  message?: string;
  errors?: Array<{ field: string; msg: string }>;
};
type StepKey = "main" | "details";

const FEE_BASE = 0.1;
const FEE_PER_PLUS_PCT = 0.01;
const FEE_MAX = 0.25;
const MIN_PLUS_PCT = 0;
const MAX_PLUS_PCT = 8;
const STEP_PLUS_PCT = 1;
const AUTOSAVE_MS = 1500;

export function useFleaItemForm() {
  const toast = useToast();
  const navigate = useNavigate();
  const { id: pathParamId } = useParams();
  const [searchParams] = useSearchParams();
  const targetDraftId = pathParamId || searchParams.get("id");

  // ===== States =====
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [sellerPlusPct, setSellerPlusPct] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [isMultiPurchasable, setIsMultiPurchasable] = useState(false);
  const [type, setType] = useState<ItemType>("ANIMAL");
  const [description, setDescription] = useState("");
  const [shippingFeeType, setShippingFeeType] = useState<0 | 1 | 2>(0);
  const [shipFromId, setShipFromId] = useState<number | null>(null);
  const [shipsWithinDays, setShipsWithinDays] = useState<number | "">(2);
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [mainIndex, setMainIndex] = useState<number>(0);

  const [liveDetails, setLiveDetails] = useState<LiveDetails>({
    locality: "",
    hatch_date: "",
    generation: "",
    size: "",
    sex: "unknown" as SexType,
    category_id: null as number | null,
    category_name: "",
  });
  
  const [supplyDetails, setSupplyDetails] = useState<SupplyDetails>({
     brand: "",;
    sku: "",
    net_weight_g: "",
    supply_type_id: null,
    target_category_id: null,
    target_category_name: "",

  });

  const [draftId, setDraftId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<StepKey>("main");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastItemId, setLastItemId] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  // Refs
  const isSubmittingRef = useRef(false);
  const draftIdRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    draftIdRef.current = draftId;
  }, [draftId]);

  // ===== Calculations =====
  const priceNum = Number(price) || 0;
  const plusPct = Math.max(
    MIN_PLUS_PCT,
    Math.min(MAX_PLUS_PCT, Math.floor(sellerPlusPct)),
  );
  const feeRate = Math.min(FEE_MAX, FEE_BASE + plusPct * FEE_PER_PLUS_PCT);
  const feeYen = Math.floor(priceNum * feeRate);
  const payoutYen = Math.max(0, Math.floor(priceNum - feeYen));
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

  // ===== Helpers =====
  const normalizeType = (t: string): "ANIMAL" | "SUPPLY" =>
    t === "SUPPLY" ? "SUPPLY" : "ANIMAL";
  const prune = <T extends object>(obj: T): Partial<T> =>
    Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as Partial<T>;

  // Payload Builder
  const buildDraftPayload = useCallback(() => {
    const p = Number(price);
    const details =
      type === "ANIMAL"
        ? {
            kind: "ANIMAL",
            locality: liveDetails.locality || undefined,
            hatch_date: liveDetails.hatch_date || undefined,
            generation: liveDetails.generation || undefined,
            size: liveDetails.size || undefined,
            sex: liveDetails.sex || "unknown",
            category_id: liveDetails.category_id || undefined,
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
          };

    const uploadedImages = images
      .filter((img) => img.serverId && img.url)
      .map((img) => ({ id: img.id, serverId: img.serverId, url: img.url }));

    return {
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      price: price !== "" && !isNaN(p) && p > 0 ? String(p) : undefined,
      seller_plus_pct: plusPct,
      quantity: isMultiPurchasable ? Math.max(1, quantity) : 1,
      type: normalizeType(type),
      is_multi_purchasable: isMultiPurchasable ? 1 : 0,
      shipping_fee_type: shippingFeeType,
      ship_from: shipFromId ? Number(shipFromId) : undefined,
      ships_within_days:
        shipsWithinDays === "" ? undefined : Number(shipsWithinDays),
      details,
      uploaded_images: uploadedImages,
      main_index: mainIndex,
      main_image_url:
        uploadedImages.length > 0 ? uploadedImages[0].url : undefined,
    };
  }, [
    name,
    description,
    price,
    plusPct,
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

  // ===== Autosave =====
  const autosaveNow = useCallback(
    async (signal?: AbortSignal) => {
      if (isSavingRef.current || isSubmittingRef.current) return;
      const rawPayload = buildDraftPayload();
      if (Number.isNaN(Number(rawPayload.price))) rawPayload.price = undefined;
      const payload = prune(rawPayload);
      const currentId = draftIdRef.current;

      try {
        isSavingRef.current = true;
        setSaving("saving");
        const res = await api.post(
          "/flea-market/draft/save",
          { draft_id: currentId ?? undefined, payload },
          { signal },
        );
        const { draft_id, saved_at } = res.data;

        if (draft_id) {
          draftIdRef.current = draft_id;
          setDraftId((prev) => (prev !== draft_id ? draft_id : prev));
        }
        if (saved_at) setLastSavedAt(saved_at);
        setSaving("saved");
      } catch (e: unknown) {
        if (axios.isCancel(e)) return;
        console.error("autosave error", e);
        setSaving("error");
      } finally {
        isSavingRef.current = false;
      }
    },
    [buildDraftPayload],
  );

  useEffect(() => {
    const controller = new AbortController();
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(
      () => autosaveNow(controller.signal),
      AUTOSAVE_MS,
    );
    return () => {
      controller.abort();
      if (autosaveTimerRef.current)
        window.clearTimeout(autosaveTimerRef.current);
    };
  }, [autosaveNow]);

  // Save on Leave
  useEffect(() => {
    const endpoint = CONFIG.BASE_URL + "/flea-market/draft/save";
    const saveOnLeave = () => {
      if (isSubmittingRef.current || getAccessToken() == null) return;
      try {
        const body = JSON.stringify({
          draft_id: draftIdRef.current,
          payload: buildDraftPayload(),
        });
        fetch(endpoint, {
          method: "POST",
          body,
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        }).catch(() => void 0);
      } catch {}
    };
    const onPageHide = () => saveOnLeave();
    const onVisChange = () => {
      if (document.visibilityState === "hidden") saveOnLeave();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisChange);
    window.addEventListener("beforeunload", saveOnLeave);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("beforeunload", saveOnLeave);
    };
  }, [buildDraftPayload]);

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
  const validateStep = (key: StepKey) => (key === "main" ? validate() : true);

  // ===== Image Upload =====
  // ★ここ重要: フック内に移動しました
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

  const handleAddImages = async (nextImages: ImageAsset[]) => {
    // ユーザー提供のコードと同じロジック
    setImages(nextImages);
    // モーダルを閉じる処理はUI側でやるか、ここでコールバックをもらうかですが、
    // 今回はstate操作だけ提供します

    const uploadedAssets = await Promise.all(
      nextImages.map(async (img) => {
        if (img.serverId) return img;
        if (!img.file) return img;
        const result = await uploadImageFile(img.file);
        if (result)
          return { ...img, url: result.url, serverId: result.serverId };
        return img;
      }),
    );
    setImages(uploadedAssets);
  };

  // ===== Submit =====
  const doSubmit = async (): Promise<boolean> => {
    if (submitting || !validate()) return false;
    isSubmittingRef.current = true;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("price", String(Number(price)));
      fd.append("seller_plus_pct", String(plusPct));
      fd.append("quantity", String(isMultiPurchasable ? quantity : 1));
      fd.append("is_multi_purchasable", String(isMultiPurchasable ? 1 : 0));
      fd.append("type", normalizeType(type));
      fd.append("description", description.trim());
      fd.append("shipping_fee_type", String(shippingFeeType));
      if (shipFromId !== null) fd.append("ship_from_id", String(shipFromId));
      if (shipsWithinDays !== "")
        fd.append("ships_within_days", String(shipsWithinDays));
      fd.append("main_index", String(mainIndex));
      if (draftId != null) fd.append("draft_id", String(draftId));

      images.forEach((img, i) => {
        if (img.serverId) fd.append("image_ids", String(img.serverId));
        else if (img.file)
          fd.append("images", img.file, img.file.name || `image_${i}.jpg`);
      });

      const res = await api.post("/flea-market/add/item", fd, {
        headers: { "Content-Type": undefined },
      });
      const newId = res.data?.itemId ?? null;
      setLastItemId(newId);

      if (newId) {
        if (type === "ANIMAL") await upsertAnimalDetails(newId, liveDetails);
        else if (type === "SUPPLY")
          await upsertSupplyDetails(newId, supplyDetails);
      }

      localStorage.removeItem("flea_item_draft");
      if (draftId)
        await api
          .delete(CONFIG.BASE_URL + "/flea-market/draft/" + draftId)
          .catch(() => {});
      toast({ text: "出品が完了しました！", kind: "success" });
      return true; // 完了
    } catch (err: unknown) {
      let msg = "エラーが発生しました";
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as ApiErrorResponse | undefined;
        if (err.response?.status === 400 && data?.errors) {
          const map: Record<string, string> = {};
          for (const e of data.errors) map[e.field] = e.msg;
          setErrors(map);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return false;
        }
        msg = data?.message ?? "通信に失敗しました。";
      }
      toast({ text: msg, kind: "error" });
      return false;
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // ===== Reset =====
  const resetForm = useCallback(() => {
    if (
      !window.confirm(
        "入力内容をクリアして、新規作成に戻りますか？\n（現在の下書きへの変更は保存されません）",
      )
    )
      return;
    setName("");
    setPrice("");
    setSellerPlusPct(0);
    setQuantity(1);
    setIsMultiPurchasable(false);
    setType("ANIMAL");
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
      category_id: null,
      category_name: "",
    });
    setSupplyDetails({ brand: "", sku: "", net_weight_g: "", supply_type_id: null, target_category_id: null, target_category_name: "" });
    setDraftId(null);
    setLastItemId(null);
    setLastSavedAt(null);
    setSaving("idle");
    localStorage.removeItem("flea_item_draft");
    navigate("/flea-market/sell/create", { replace: true });
  }, [navigate]);

  // ===== Fetch =====
  const fetchDraftData = async (id: number) => {
    try {
      const res = await api.get(`/flea-market/draft/${id}`);
      const d = res.data;
      // ... (省略: セットロジックは提供コードと同じ) ...
      if (d.name) setName(d.name);
      if (d.price) setPrice(d.price);
      if (typeof d.seller_plus_pct === "number")
        setSellerPlusPct(d.seller_plus_pct);
      if (d.quantity) setQuantity(d.quantity);
      if (d.type) setType(d.type);
      if (d.description) setDescription(d.description);
      if (d.shipping_fee_type !== undefined)
        setShippingFeeType(Number(d.shipping_fee_type) as 0 | 1 | 2);
      if (d.ship_from || d.ship_from_id)
        setShipFromId(Number(d.ship_from ?? d.ship_from_id));
      if (d.ships_within_days !== undefined)
        setShipsWithinDays(Number(d.ships_within_days) || "");

      if (d.uploaded_images && Array.isArray(d.uploaded_images)) {
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
        if (d.type === "ANIMAL")
          setLiveDetails((prev) => ({ ...prev, ...d.details }));
        else if (d.type === "SUPPLY")
          setSupplyDetails((prev) => ({ ...prev, ...d.details }));
      }
      setDraftId(id);
      if (d.updated_at) setLastSavedAt(d.updated_at);
      setSaving("saved");
    } catch (e) {
      console.error("Failed to fetch draft:", e);
      toast({ text: "下書きが見つかりませんでした", kind: "error" });
      localStorage.removeItem("flea_item_draft");
      setDraftId(null);
      navigate("/flea-market/sell/create", { replace: true });
    }
  };

  useEffect(() => {
    // 1. URLパラメータ (?draft_id=123) がある場合
    if (targetDraftId) {
      const id = Number(targetDraftId);
      if (!isNaN(id) && id > 0) {
        // LocalStorageは見ずに、サーバーから直接データを取る
        fetchDraftData(id);
        return;
      }
    }

    // 2. URL指定がない場合、LocalStorage から復元
    const saved = localStorage.getItem("flea_item_draft");
    let restoredId: number | null = null;

    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.name) setName(d.name);
        if (d.price) setPrice(d.price);
        if (typeof d.sellerPlusPct === "number")
          setSellerPlusPct(d.sellerPlusPct);
        if (d.quantity) setQuantity(d.quantity);
        if (d.isMultiPurchasable !== undefined)
          setIsMultiPurchasable(d.isMultiPurchasable);
        if (d.type) setType(d.type);
        if (d.description) setDescription(d.description);
        if (d.shippingFeeType !== undefined)
          setShippingFeeType(d.shippingFeeType);
        if (d.shipFromId) setShipFromId(d.shipFromId);
        if (d.shipsWithinDays) setShipsWithinDays(d.shipsWithinDays);
        if (d.mainIndex) setMainIndex(d.mainIndex);
        if (d._draftId) setDraftId(d._draftId);
        if (d.liveDetails)
          setLiveDetails((prev) => ({ ...prev, ...d.liveDetails }));
        if (d.supplyDetails)
          setSupplyDetails((prev) => ({ ...prev, ...d.supplyDetails }));
        if (d.uploaded_images && Array.isArray(d.uploaded_images)) {
          const restoredImages: ImageAsset[] = d.uploaded_images.map(
            (img: ImageAsset) => ({
              id: img.id || Math.random().toString(36), // IDがなければ仮発行
              url: img.url,
              serverId: img.serverId,
              // file: undefined  // 復元時はファイル実体はない
            }),
          );
          setImages(restoredImages);
          if (d._draftId) {
            setDraftId(d._draftId);
            restoredId = d._draftId;
          }
        }

        if (d.mainIndex !== undefined) setMainIndex(d.mainIndex);
      } catch (e) {
        console.error(e);
      }
    }
    // 2. IDがあれば、サーバーから最新情報を取得して上書き（確実性のため）
    if (restoredId) {
      fetchDraftData(restoredId);
    }
  }, [targetDraftId]);

  // Return
  return {
    formState: {
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
    },
    systemState: {
      draftId,
      currentStep,
      submitting,
      errors,
      lastItemId,
      lastSavedAt,
      saving,
    },
    setters: {
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
    },
    calc: { feeRate, feeYen, payoutYen, sellerPlusPctOptions },
    actions: {
      autosaveNow,
      doSubmit,
      resetForm,
      validate,
      validateStep,
      handleAddImages,
    },
  };
}
