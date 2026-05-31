import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, CheckCircle2, Loader2 } from "lucide-react";
import { Header } from "../../component/Header";
import api from "../../conf/api";
import { s } from "../../styles/page/mypage/IdentityVerification.styles";

type VerificationStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

export default function IdentityVerificationPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>("NONE");
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api
      .get("/identity/status")
      .then((res) => setStatus(res.data.status || "NONE"))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (files.length === 0) {
      alert("書類をアップロードしてください");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("documents", f));
      await api.post("/identity/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus("PENDING");
    } catch {
      alert("送信に失敗しました");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={s.page}>
      <Header />
      <div style={s.body}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <ArrowLeft size={20} />
          </button>
          <Shield size={20} />
          <h2 style={s.title}>本人確認</h2>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Loader2
              size={32}
              style={{
                animation: "spin 0.7s linear infinite",
                color: "#8c8c8c",
              }}
            />
          </div>
        ) : status === "VERIFIED" ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <CheckCircle2
              size={64}
              style={{ color: "#3a7a22", marginBottom: 16 }}
            />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              本人確認済みです
            </h3>
            <p style={{ color: "#8c8c8c" }}>
              すべての機能をご利用いただけます。
            </p>
          </div>
        ) : status === "PENDING" ? (
          <div
            style={{
              backgroundColor: "#fdf5e8",
              border: "1px solid #f3cc88",
              padding: 20,
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#935c24",
                marginBottom: 8,
              }}
            >
              審査中
            </h3>
            <p style={{ fontSize: 14, color: "#6b421a" }}>
              書類を確認しています。しばらくお待ちください（通常1〜3営業日）。
            </p>
          </div>
        ) : (
          <div>
            {status === "REJECTED" && (
              <div
                style={{
                  backgroundColor: "#fef0ec",
                  border: "1px solid #f0a890",
                  color: "#d63c20",
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 24,
                  fontSize: 14,
                }}
              >
                本人確認が拒否されました。再提出が必要です。
              </div>
            )}
            <p style={{ fontSize: 14, color: "#5c5a56", marginBottom: 24 }}>
              身分証明書（運転免許証・パスポート等）をアップロードしてください。
            </p>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              style={{ marginBottom: 16 }}
            />
            {files.length > 0 && (
              <p style={{ fontSize: 14, color: "#8c8c8c", marginBottom: 16 }}>
                {files.length}件選択済み
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={uploading || files.length === 0}
              style={{ ...s.submitBtn, opacity: files.length === 0 ? 0.4 : 1 }}
            >
              {uploading ? (
                <Loader2
                  size={16}
                  style={{ animation: "spin 0.7s linear infinite" }}
                />
              ) : (
                "書類を提出する"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
