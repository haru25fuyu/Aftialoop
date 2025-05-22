import { GoogleOAuthProvider } from "@react-oauth/google";
import { GoogleLogin } from "@react-oauth/google";
import api from "../conf/api.ts";

type Props = {
    onLoginSuccess?: () => void;
};

export const GoogleOAuth: React.FC<Props> = ({ onLoginSuccess }) => {

    const handleLoginSuccess = (response: { credential?: string }) => {
        if (!response.credential) {
            console.error("ログイン失敗: credential が undefined です");
            return;
        }
        console.log("ログイン成功:", response);
        const token = { token: response.credential };

        api.post("/auth/google", token)
            .then((res) => {
                console.log("ログイン成功:", res.data.access_token);
                const expiresIn = res.data.expires_in;
                const expirationTime = Date.now() / 1000 + expiresIn; // 秒単位で保存

                localStorage.setItem("token", res.data.access_token);
                localStorage.setItem("expirationTime", expirationTime);

                if (onLoginSuccess) {
                    onLoginSuccess();
                } else {
                    window.location.href = '/';
                }

            })
            .catch((err) => {
                console.error("ログイン失敗:", err);
                localStorage.setItem("token", "");
                localStorage.setItem("expirationTime", "");
            });
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
