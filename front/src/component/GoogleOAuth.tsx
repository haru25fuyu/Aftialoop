import { GoogleOAuthProvider } from "@react-oauth/google";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { NODE_API } from "../conf/config";

export const GoogleOAuth = () => {
    const navigate = useNavigate(); // ✅ useNavigate をコンポーネント内で定義

    const handleLoginSuccess = (response: any) => {
        console.log("ログイン成功:", response);
        const token = { token: response.credential };

        axios
            .post(NODE_API.URL + "/api/auth/google", token, {
                headers: NODE_API.HEADER,
            })
            .then((res) => {
                console.log("ログイン成功:", res.data.response);
                const expiresIn = res.data.expires_in;
                const expirationTime = Date.now() / 1000 + expiresIn; // 秒単位で保存

                localStorage.setItem("token", res.data.response.AccessToken);
                localStorage.setItem("expirationTime", expirationTime);

                navigate("/"); // ✅ 認証成功後にリダイレクト
            })
            .catch((err) => {
                console.error("ログイン失敗:", err);
                localStorage.setItem("token", "");
                localStorage.setItem("expirationTime", "");
            });
    };

    const handleLoginFailure = (error: any) => {
        console.error("ログイン失敗:", error);
    };

    return (
        <GoogleOAuthProvider clientId="301597739219-5s828gi856ag0vng8e50hds2re77rj00.apps.googleusercontent.com">
            <GoogleLogin onSuccess={handleLoginSuccess} onError={handleLoginFailure} useOneTap />
        </GoogleOAuthProvider>
    );
};

export default GoogleOAuth;
