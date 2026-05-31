import { useEffect, useRef } from "react";
import { s } from "../styles/component/GoogleOAuth.styles";

// Google Identity Services の最小限の型定義
type GoogleCredentialResponse = { credential: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme: string;
              size: string;
              width: number;
              text: string;
              locale: string;
            },
          ) => void;
        };
      };
    };
  }
}

type Props = {
  mode: "login" | "signup";
  onLoginSuccess: () => void;
  onError: (msg: string) => void;
};

const GoogleOAuth = ({ mode, onLoginSuccess, onError }: Props) => {
  const btnRef = useRef<HTMLDivElement>(null);

  // コールバックを ref に保持することで useEffect の依存配列から外す
  const onLoginSuccessRef = useRef(onLoginSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onLoginSuccessRef.current = onLoginSuccess;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const g = window.google;
    if (!g?.accounts?.id) return;

    g.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (res: GoogleCredentialResponse) => {
        try {
          const { default: api, afterLogin } = await import("../conf/api");
          const r = await api.post(
            `/${mode === "signup" ? "signup" : "login"}/google`,
            { token: res.credential },
          );
          await afterLogin(r.data.access_token);
          onLoginSuccessRef.current();
        } catch {
          onErrorRef.current("Google認証に失敗しました");
        }
      },
    });

    if (btnRef.current) {
      g.accounts.id.renderButton(btnRef.current, {
        theme: "outline",
        size: "large",
        width: btnRef.current.offsetWidth,
        text: mode === "signup" ? "signup_with" : "signin_with",
        locale: "ja",
      });
    }
  }, [mode]); // onLoginSuccess / onError は ref 経由なので依存不要

  return (
    <div style={s.wrap}>
      <div ref={btnRef} style={{ width: "100%" }} />
    </div>
  );
};

export default GoogleOAuth;
