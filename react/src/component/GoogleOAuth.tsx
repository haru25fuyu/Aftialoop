import { GoogleOAuthProvider } from "@react-oauth/google";
import { GoogleLogin } from "@react-oauth/google";
import api from "../conf/api.ts";
import { afterLogin } from "../conf/api.ts";
import React from "react";
import axios from "axios";

type Props = {
    onLoginSuccess?: () => void;
    mode: 'login' | 'signup'; // モードを追加
};

export const GoogleOAuth: React.FC<Props> = ({ onLoginSuccess, mode }) => {

    const handleLoginSuccess = async (response: { credential?: string }) => {
        if (!response.credential) {
            console.error("ログイン失敗: credential が undefined です");
            return;
        }
        console.log(`${mode}成功:`, response);
        const token = { token: response.credential };

        try {
            const endpoint = mode === 'signup' ? "/auth/google/signup" : "/auth/google";
            const res = await api.post(endpoint, token);

            console.log(`${mode}成功:`, res.data.access_token);

            await afterLogin(res.data.access_token);

            onLoginSuccess?.();
            if (!onLoginSuccess) window.location.href = "/";
        } catch (err) {
            console.error(`${mode}失敗:`, err);
            if (axios.isAxiosError(err)) {
                console.error(
                    `${mode}失敗:`,
                    err.response?.data?.err_message ?? `${mode}に失敗しました`
                );
            } else {
                console.error("予期しないエラー:", err);
            }
        }
    };

    const handleLoginFailure = () => {
        console.error(`${mode}失敗`);
    };

    return (
        <GoogleOAuthProvider clientId="301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com">
            <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginFailure} useOneTap />
        </GoogleOAuthProvider>
    );
};

export default GoogleOAuth;
