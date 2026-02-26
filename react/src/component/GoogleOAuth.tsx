import { GoogleOAuthProvider } from "@react-oauth/google";
import { GoogleLogin } from "@react-oauth/google";
import api from "../conf/api.ts";
import { afterLogin } from "../conf/api.ts";
import React, { useState } from "react";
import axios from "axios";
import { Spinner } from "./Spinner";

type Props = {
    onLoginSuccess?: () => void;
    onError?: (message: string) => void; // エラー通知用の関数を追加
    mode: 'login' | 'signup';
};

export const GoogleOAuth: React.FC<Props> = ({ onLoginSuccess, onError, mode }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleLoginSuccess = async (response: { credential?: string }) => {
        if (!response.credential) return;

        setIsProcessing(true);
        // 親のエラー表示を一旦クリアする（任意）
        onError?.("");

        try {
            const token = { token: response.credential };
            const endpoint = mode === 'signup' ? "/auth/google/signup" : "/auth/google";
            const res = await api.post(endpoint, token);

            if (res.data.err_message) {
                onError?.(res.data.err_message); // 親にエラーを渡す
                setIsProcessing(false);
                return;
            }

            await afterLogin(res.data.access_token);
            onLoginSuccess?.();
        } catch (err) {
            let msg = "認証に失敗しました。";
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.err_message ?? msg;
            }
            onError?.(msg); // 親にエラーを渡す
            setIsProcessing(false);
        }
    };

    return (
        <GoogleOAuthProvider clientId="301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com">
            <div className="flex justify-center items-center min-h-[40px]">
                {isProcessing ? (
                    <Spinner size="sm" />
                ) : (
                    <GoogleLogin
                        onSuccess={handleLoginSuccess}
                        onError={() => onError?.("Googleログインに失敗しました")}
                    />
                )}
            </div>
        </GoogleOAuthProvider>
    );
};

export default GoogleOAuth;
