import React from "react";
import { Star, X, Check } from "lucide-react";
import { REVIEW_TEMPLATES } from "../conf/FleaMarket";
import { LoadingButton } from "../component/LoadingButton";
import { s } from "../styles/modal/FleaReviewModal.styles";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
};

export default function FleaReviewModal({ isOpen, onClose, onSubmit }: Props) {
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [isChecked, setIsChecked] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hoverRating, setHoverRating] = React.useState(0);

  React.useEffect(() => {
    if (isOpen) {
      setRating(5);
      setComment("");
      setIsChecked(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!isChecked) return;
    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment);
    } catch {
      alert("送信に失敗しました");
      setIsSubmitting(false);
    }
  };

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.header}>
          <h3
            style={{
              fontWeight: 700,
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Star size={20} fill="#1a1a1a" />
            受取評価
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              borderRadius: "50%",
            }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={s.body}>
          {/* 星評価 */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <p style={{ fontSize: 14, color: "#5c5a56", marginBottom: 12 }}>
              取引はいかがでしたか？
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  <Star
                    size={36}
                    fill={(hoverRating || rating) >= n ? "#f0a800" : "none"}
                    stroke={
                      (hoverRating || rating) >= n ? "#f0a800" : "#c4c1bb"
                    }
                  />
                </button>
              ))}
            </div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#1a1a1a",
                marginTop: 8,
              }}
            >
              {["", "悪い", "やや悪い", "普通", "良い", "とても良い"][rating]}
            </p>
          </div>
          {/* テンプレート */}
          {REVIEW_TEMPLATES && REVIEW_TEMPLATES.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 8 }}>
                テンプレートから選ぶ
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {REVIEW_TEMPLATES.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setComment(t.text)} // t.text を使う
                    style={{
                      padding: "4px 12px",
                      fontSize: 13,
                      borderRadius: 9999,
                      border: "1px solid #e0ddd8",
                      background: comment === t.text ? "#1a1a1a" : "#fff", // t.text で比較
                      color: comment === t.text ? "#fff" : "#2e3128",
                      cursor: "pointer",
                    }}
                  >
                    {t.label} {/* ボタンには label を表示 */}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* コメント */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="コメントを入力（任意）"
            rows={4}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #e0ddd8",
              fontSize: 14,
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          {/* チェック */}
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: 16,
              borderRadius: 12,
              border: `2px solid ${isChecked ? "#1a1a1a" : "#e0ddd8"}`,
              backgroundColor: isChecked ? "#f8f7f5" : "#f8f7f5",
              cursor: "pointer",
              marginTop: 16,
            }}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              style={{ width: 20, height: 20, marginTop: 2 }}
            />
            <div style={{ fontSize: 13, color: "#5c5a56" }}>
              <span
                style={{
                  fontWeight: 700,
                  display: "block",
                  fontSize: 14,
                  marginBottom: 2,
                  color: "#1a1a1a",
                }}
              >
                中身を確認しました
              </span>
              商品に不備がないことを確認しました。評価を送信して取引を完了します。
            </div>
          </label>
          <LoadingButton
            onClick={handleSubmit}
            disabled={!isChecked}
            loading={isSubmitting}
            style={{
              width: "100%",
              padding: "14px 0",
              marginTop: 16,
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 16,
              backgroundColor: isChecked ? "#1a1a1a" : "#e0ddd8",
              color: isChecked ? "#fff" : "#8c8c8c",
              border: "none",
              cursor: isChecked ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Check size={20} strokeWidth={3} />
            評価を確定して完了する
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
