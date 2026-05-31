import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { s } from "../styles/modal/PublishCompleteDialog.styles";

type Props = {
  open: boolean;
  itemId: number | null;
  onClose: () => void;
  onContinue: () => void;
};

export function PublishCompleteDialog({ open, itemId, onContinue }: Props) {
  const nav = useNavigate();
  const [copied, setCopied] = useState(false);
  const itemUrl = itemId ? `/flea-market/item/${itemId}` : "";
  const fullUrl =
    typeof window !== "undefined" ? window.location.origin + itemUrl : "";
  const editUrl = itemId ? `/flea-market/item/edit/${itemId}` : "";
  const myPageUrl = "/mypage/selling/list";

  if (!open) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const handleShare = () => {
    if (navigator.share)
      navigator.share({ url: fullUrl, title: "出品しました" });
  };

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.successBanner}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: 8,
            }}
          >
            出品完了！
          </h2>
          <p style={{ fontSize: 14, color: "#5c5a56" }}>商品が公開されました</p>
        </div>
        <div style={s.body}>
          {/* URL共有 */}
          <div
            style={{
              backgroundColor: "#f8f7f5",
              borderRadius: 12,
              padding: 12,
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: 13,
                color: "#5c5a56",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {fullUrl}
            </span>
            <button
              onClick={handleCopy}
              style={{
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e0ddd8",
                backgroundColor: copied ? "#3a7a22" : "#fff",
                color: copied ? "#fff" : "#2e3128",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {copied ? (
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={handleShare}
              style={{
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e0ddd8",
                backgroundColor: "#fff",
                color: "#2e3128",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </button>
          </div>
          {/* ボタン */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={onContinue} style={s.primaryBtn}>
              続けて出品する
            </button>
            <button
              onClick={() => itemId && nav(itemUrl)}
              disabled={!itemId}
              style={s.secondaryBtn}
            >
              商品ページを見る →
            </button>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 24,
              marginTop: 16,
            }}
          >
            <button onClick={() => nav(myPageUrl)} style={s.linkBtn}>
              出品した商品一覧へ
            </button>
            {itemId && (
              <button onClick={() => nav(editUrl)} style={s.linkBtn}>
                編集する
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
