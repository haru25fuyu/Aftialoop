import { GoogleOAuthProvider } from "@react-oauth/google";
import { GoogleLogin } from "@react-oauth/google";
import api from "../conf/api.ts";
import { afterLogin } from "../conf/api.ts";
import React from "react";
import axios from "axios";

type Props = {
    onLoginSuccess?: () => void;
};

export const GoogleOAuth: React.FC<Props> = ({ onLoginSuccess }) => {

    const handleLoginSuccess = async (response: { credential?: string }) => {
        if (!response.credential) {
            console.error("ログイン失敗: credential が undefined です");
            return;
        }
        console.log("ログイン成功:", response);
        const token = { token: response.credential };

        try {
            const res = await api.post("/auth/google", token);

            console.log("ログイン成功:", res.data.access_token);

            await afterLogin(res.data.access_token);

            onLoginSuccess?.();
            if (!onLoginSuccess) window.location.href = "/";
        } catch (err) {
            if (axios.isAxiosError(err)) {
                console.error(
                    "ログイン失敗:",
                    err.response?.data?.err_message ?? "ログインに失敗しました"
                );
            } else {
                console.error("予期しないエラー:", err);
            }
        }
    };

    const handleLoginFailure = () => {
        console.error("ログイン失敗");
    };

    return (
        <GoogleOAuthProvider clientId="301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com">
            <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginFailure} useOneTap />
        </GoogleOAuthProvider>
    );
};

export default GoogleOAuth;
