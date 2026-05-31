import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, SubmitHandler } from "react-hook-form";
import { Header } from "../component/Header";
import { LoadingButton } from "../component/LoadingButton";
import api from "../conf/api";
import { s } from "../styles/page/ContactForm.styles";

type ContactInput = {
  name: string;
  email: string;
  category: string;
  body: string;
};

const ContactForm: React.FC = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>();
  const [sendError, setSendError] = useState<string | null>(null);

  const onSubmit: SubmitHandler<ContactInput> = async (data) => {
    setSendError(null);
    try {
      await api.post("/contact/send", data);
      navigate("/contact/complete");
    } catch {
      setSendError("送信に失敗しました。時間をおいて再度お試しください。");
    }
  };

  return (
    <>
      <Header />
      <main style={s.wrap}>
        <h1 style={s.title}>お問い合わせフォーム</h1>
        <div
          style={{
            backgroundColor: "#fff",
            padding: 24,
            borderRadius: 12,
            border: "1px solid #e0ddd8",
          }}
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            {[
              {
                name: "name",
                label: "お名前",
                type: "text",
                placeholder: "例：動物 太郎",
              },
              {
                name: "email",
                label: "メールアドレス",
                type: "email",
                placeholder: "example@aftialoop.com",
              },
            ].map(({ name, label, type, placeholder }) => (
              <div key={name} style={s.formGroup}>
                <label style={s.label}>
                  {label} <span style={{ color: "#d63c20" }}>*</span>
                </label>
                <input
                  type={type}
                  placeholder={placeholder}
                  {...register(name as keyof ContactInput, {
                    required: `${label}は必須です`,
                  })}
                  style={s.input}
                />
                {errors[name as keyof ContactInput] && (
                  <p style={{ color: "#d63c20", fontSize: 13, marginTop: 4 }}>
                    {errors[name as keyof ContactInput]?.message}
                  </p>
                )}
              </div>
            ))}
            <div style={s.formGroup}>
              <label style={s.label}>
                お問い合わせ内容 <span style={{ color: "#d63c20" }}>*</span>
              </label>
              <textarea
                placeholder="具体的な内容をご記入ください"
                rows={6}
                {...register("body", {
                  required: "内容は必須です",
                  minLength: {
                    value: 10,
                    message: "10文字以上で入力してください",
                  },
                })}
                style={s.textarea}
              />
              {errors.body && (
                <p style={{ color: "#d63c20", fontSize: 13, marginTop: 4 }}>
                  {errors.body.message}
                </p>
              )}
            </div>
            {sendError && (
              <div
                style={{
                  backgroundColor: "#fef0ec",
                  color: "#d63c20",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 14,
                  marginBottom: 16,
                }}
              >
                {sendError}
              </div>
            )}
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              style={s.submitBtn}
            >
              送信する
            </LoadingButton>
          </form>
        </div>
      </main>
    </>
  );
};

export default ContactForm;
