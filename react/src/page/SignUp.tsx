import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Header } from "../component/Header";
import GoogleOAuth from "../component/GoogleOAuth";
import { LoadingButton } from "../component/LoadingButton";
import api from "../conf/api";
import { s } from "../styles/page/SignUp.styles";

type Inputs = { email: string; password: string; password2: string };

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Inputs>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const password = watch("password");
  const password2 = watch("password2");

  const onSubmit = async (data: Inputs) => {
    setLoading(true);
    try {
      await api.post("/signup", data);
      navigate("/signup/complete");
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? (err.response?.data?.err_message ?? "登録に失敗しました")
          : "予期しないエラーが発生しました",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <Header />
      <div style={s.wrap}>
        <div style={s.card}>
          <h2 style={s.title}>サインアップ</h2>
          <GoogleOAuth
            mode="signup"
            onLoginSuccess={() => navigate("/signup/complete")}
            onError={(msg) => setError(msg)}
          />
          <div style={s.divider}>
            <div style={s.divLine} />
            <span>or</span>
            <div style={s.divLine} />
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div
                style={{
                  ...s.input,
                  backgroundColor: "#fef0ec",
                  color: "#d63c20",
                  padding: 12,
                  marginBottom: 16,
                  borderRadius: 8,
                  border: "none",
                }}
              >
                {error}
              </div>
            )}
            <div style={s.formGroup}>
              <label style={s.label}>メールアドレス</label>
              <p style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 4 }}>
                ※メールアドレスはログインIDとして使用します
              </p>
              <input
                type="email"
                {...register("email", { required: "メールアドレスは必須です" })}
                style={s.input}
              />
              {errors.email && <p style={s.errMsg}>{errors.email.message}</p>}
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>パスワード</label>
              <input
                type="password"
                {...register("password", { required: "パスワードは必須です" })}
                style={s.input}
              />
              {errors.password && (
                <p style={s.errMsg}>{errors.password.message}</p>
              )}
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>パスワード再入力</label>
              <input
                type="password"
                {...register("password2", {
                  required: "パスワード再入力は必須です",
                })}
                style={s.input}
              />
              {password && password2 && password !== password2 && (
                <p style={s.errMsg}>パスワードが一致しません</p>
              )}
            </div>
            <LoadingButton type="submit" loading={loading} style={s.submitBtn}>
              サインアップ
            </LoadingButton>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
