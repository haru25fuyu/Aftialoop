import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth({ children }: { children: JSX.Element }) {
    const { isAuthenticated, loading, openLoginModal } = useAuth();

    // ★ここがポイント！
    // 読み込みが終わって「未ログイン」だとわかった瞬間、自動でモーダルを開く
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            openLoginModal();
        }
    }, [loading, isAuthenticated, openLoginModal]);


    // 1. ロード中（真っ白画面、あるいはくるくる）
    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;

    // 2. ログイン済みなら中身を表示（ここがゴール）
    if (isAuthenticated) return children;

    // 3. 未ログイン時
    // モーダルが自動で開いているので、背景は「ボタン」ではなく「待機メッセージ」だけでOK
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
            <p>ログインが必要です</p>
            <p className="text-sm mt-2">画面の案内またはボタンからログインしてください</p>

            <button
                onClick={openLoginModal}
                className="mt-4 text-blue-500 underline text-sm hover:text-blue-700"
            >
                ログイン画面を再表示
            </button>
        </div>
    );
}