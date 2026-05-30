import React, { useEffect, useRef } from "react";
import { Spinner } from "./Spinner";
import { s } from "../styles/component/GoogleOAuth.styles";

type Props = { mode: "login" | "signup"; onLoginSuccess: () => void; onError: (msg: string) => void; };

const GoogleOAuth: React.FC<Props> = ({ mode, onLoginSuccess, onError }) => {
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const g = (window as any).google;
    if (!g?.accounts?.id) return;
    g.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (res: any) => {
        try {
          const { default: api, afterLogin } = await import("../conf/api");
          const r = await api.post(`/${mode === "signup" ? "signup" : "login"}/google`, { token: res.credential });
          await afterLogin(r.data.access_token);
          onLoginSuccess();
        } catch {
          onError("Google認証に失敗しました");
        }
      },
    });
    if (btnRef.current) {
      g.accounts.id.renderButton(btnRef.current, { theme: "outline", size: "large", width: btnRef.current.offsetWidth, text: mode === "signup" ? "signup_with" : "signin_with", locale: "ja" });
    }
  }, [mode]);

  return (
    <div style={s.wrap}>
      <div ref={btnRef} style={{ width: "100%" }} />
    </div>
  );
};

export default GoogleOAuth;
