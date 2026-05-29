import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { CONFIG } from "./config";
import { setUserProfile } from "./function";

// ── トークン管理 ──────────────────────────────────────────

let accessToken: string | null = null;
let authReady = false;
let authInitPromise: Promise<void> | null = null;

export const setAccessToken = (t: string | null) => { accessToken = t; };
export const getAccessToken = () => accessToken;
export const isAuthReady = () => authReady;

export const initAuthOnce = () => {
  if (!authInitPromise) {
    authInitPromise = bootstrapAuth().finally(() => {
      authReady = true;
    });
  }
  return authInitPromise;
};

export const afterLogin = async (token: string) => {
  setAccessToken(token);
  await bootstrapProfile();
};

// ── axios インスタンス ────────────────────────────────────

const api = axios.create({
  baseURL: CONFIG.BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// refresh / me は interceptor の再帰を防ぐため素のクライアントで叩く
const rawApi = axios.create({
  baseURL: CONFIG.BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor ───────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers = config.headers ?? new AxiosHeaders();
  if (accessToken) config.headers.set("Authorization", `Bearer ${accessToken}`);
  else config.headers.delete("Authorization");
  return config;
});

// ── 型ガード ──────────────────────────────────────────────

type RefreshJson = { access_token: string };
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const isRefreshJson = (v: unknown): v is RefreshJson =>
  isObject(v) && typeof v["access_token"] === "string";

// ── プロフィール初期化 ────────────────────────────────────

const bootstrapProfile = async (): Promise<void> => {
  try {
    const t = getAccessToken();
    if (!t) return;
    const res = await rawApi.get("/me", {
      headers: { Authorization: `Bearer ${t}` },
    });
    const u = res.data?.user;
    if (!u) return;
    setUserProfile({
      name: String(u.name ?? u.Name ?? "user"),
      iconUrl: String(u.iconUrl ?? ""),
    });
  } catch {
    // 無視（未ログイン時は正常）
  }
};

// ── 認証初期化 ────────────────────────────────────────────

let refreshing: Promise<void> | null = null;

export const bootstrapAuth = async (): Promise<void> => {
  try {
    const res = await rawApi.post("/auth/refresh");

    const headerToken =
      (res.headers as Record<string, unknown>)["x-new-access-token"] ??
      (res.headers as Record<string, unknown>)["X-New-Access-Token"];

    if (typeof headerToken === "string" && headerToken.length > 0) {
      setAccessToken(headerToken);
      await bootstrapProfile();
      return;
    }
    if (isRefreshJson(res.data)) {
      setAccessToken(res.data.access_token);
      await bootstrapProfile();
      return;
    }

    setAccessToken(null);
    setUserProfile(null);
  } catch {
    setAccessToken(null);
    setUserProfile(null);
  }
};

// ── Response interceptor（401 → リフレッシュ → リトライ） ─

api.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (err: AxiosError) => {
    const status = err.response?.status;
    const config = err.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!config) return Promise.reject(err);

    const url = String(config.url ?? "");

    // ✅ console.log を開発環境のみに制限
    if (import.meta.env.DEV) {
      console.log("APIエラー:", status, "URL:", url);
    }

    if (url.includes("/auth/refresh") || url.includes("/me")) {
      return Promise.reject(err);
    }

    if (status === 401 && !config._retry) {
      config._retry = true;

      if (import.meta.env.DEV) {
        console.log("アクセストークン期限切れ。リフレッシュを試みます");
      }

      refreshing ??= bootstrapAuth().finally(() => { refreshing = null; });
      await refreshing;

      if (!accessToken) return Promise.reject(err);

      config.headers = config.headers ?? new AxiosHeaders();
      config.headers.set("Authorization", `Bearer ${accessToken}`);
      return api.request(config);
    }

    return Promise.reject(err);
  }
);

export default api;