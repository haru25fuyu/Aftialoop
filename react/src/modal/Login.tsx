import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import axios from "axios";
import GoogleOAuth from "../component/GoogleOAuth";
import api, { afterLogin } from "../conf/api";
import { LoadingButton } from "../component/LoadingButton";
import { s } from "../styles/modal/Login.styles";

type Inputs = { name: string; email: string; password: string };
type Props = {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  showCloseButton?: boolean;
};

const LoginModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  showCloseButton = false,
}) => {
  const { register, handleSubmit } = useForm<Inputs>();
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      window.scrollTo({ top: 0, behavior: "instant" } as ScrollToOptions);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const onSubmit = async (data: Inputs) => {
    setIsProcessing(true);
    try {
      const res = await api.post("/login", data);
      await afterLogin(res.data.access_token);
      onLoginSuccess();
      onClose();
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? (err.response?.data?.err_message ?? "ログインに失敗しました")
          : "予期しないエラーが発生しました",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={s.overlay}>
      {showCloseButton && (
        <button onClick={onClose} style={s.closeBtn}>
          ×
        </button>
      )}
      <div style={s.card}>
        <h2 style={s.title}>ログイン</h2>
        <GoogleOAuth
          mode="login"
          onLoginSuccess={() => {
            onLoginSuccess();
            onClose();
          }}
          onError={(msg) => setError(msg)}
        />
        <div style={s.divider}>
          <hr style={{ flex: 1 }} />
          <span style={s.divText}>or</span>
          <hr style={{ flex: 1 }} />
        </div>
        {error && <div style={s.errAlert}>{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={s.formGroup}>
            <label style={s.label}>メールアドレス</label>
            <input
              type="email"
              {...register("email", { required: true })}
              style={s.input}
            />
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>パスワード</label>
            <input
              type="password"
              {...register("password", { required: true })}
              style={s.input}
            />
          </div>
          <LoadingButton
            type="submit"
            loading={isProcessing}
            style={s.submitBtn}
          >
            ログイン
          </LoadingButton>
        </form>
        <hr style={{ margin: "16px 0" }} />
        <div style={{ textAlign: "center" }}>
          <Link to="/signup" style={s.link}>
            新規登録はこちら
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
