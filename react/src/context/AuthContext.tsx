import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";

import api, { initAuthOnce, getAccessToken, setAccessToken } from "../conf/api";
import { clearUserProfile } from "../conf/function";
import LoginModal from "../modal/Login";
import { Customer } from "../types/Content";

// ── 型定義 ────────────────────────────────────────────────

interface AuthContextType {
  user: Customer | null;
  loading: boolean;
  isAuthenticated: boolean;
  openLoginModal: () => void;
  logout: () => void;
  refreshUser: () => void;
}

// ── Context ───────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const location = useLocation();

  // パスが変わったらモーダルを閉じる
  useEffect(() => {
    setShowModal(false);
  }, [location.pathname]);

  // ✅ initAuthOnce は AuthContext の1箇所だけで呼ぶ（App.tsx 側の呼び出しは削除）
  useEffect(() => {
    initAuthOnce().finally(fetchUser);
  }, []);

  const fetchUser = async () => {
    const token = getAccessToken();
    if (!token || token === "undefined") {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.post("/customer", {});
      setUser(res.data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ✅ メモリ上のトークンもリセットしてからログアウト
  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* サーバー側エラーは無視 */ }
    setAccessToken(null);
    clearUserProfile();
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        openLoginModal: () => setShowModal(true),
        logout,
        refreshUser: fetchUser,
      }}
    >
      {children}
      <LoginModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onLoginSuccess={async () => {
          await fetchUser();
          setShowModal(false);
        }}
        showCloseButton={true}
      />
    </AuthContext.Provider>
  );
};

// ── カスタムフック ────────────────────────────────────────
// NOTE: fast-refresh の警告を完全に消すには useAuth を useAuth.ts に分離するのが理想だが、
//       AuthContext と密結合しているため eslint-disable で抑制する
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};