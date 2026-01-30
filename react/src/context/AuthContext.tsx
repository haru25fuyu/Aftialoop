import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import api, { initAuthOnce, getAccessToken } from "../conf/api";
import LoginModal from "../modal/Login";
import { Customer } from "../types/Content"; // ユーザーの型定義があればインポート

// Contextで使える機能の型定義
interface AuthContextType {
    user: Customer | null;       // ログイン中のユーザー情報 (型は適宜調整)
    loading: boolean;       // 読み込み中かどうか
    isAuthenticated: boolean;
    openLoginModal: () => void; // どこからでもログイン画面を出せる関数
    logout: () => void;     // ログアウト関数
    refreshUser: () => void; // ユーザー情報を再取得する関数
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // 初回ロード時にトークンチェックとユーザー取得を行う
    useEffect(() => {
        initAuthOnce().finally(() => {
            fetchUser();
        });
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
            if (res.data.user) {
                setUser(res.data.user);
                console.log("Authenticated user:", res.data.user);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("Auth check failed", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        // トークン削除などの処理 (API側にログアウトエンドポイントがあれば叩く)
        localStorage.removeItem("accessToken"); // 仮
        // 必要なら api.post("/logout")
        setUser(null);
        window.location.href = "/"; // トップへ戻す
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isAuthenticated: !!user,
            openLoginModal: () => setShowModal(true),
            logout,
            refreshUser: fetchUser
        }}>
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

// 簡単に使うためのカスタムフック
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};