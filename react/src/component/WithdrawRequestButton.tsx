import React, { useState } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import api from "../conf/api";
import { s } from "../styles/component/WithdrawRequestButton.styles";

type Props = { requestId: number; onWithdrawn: () => void };

const WithdrawRequestButton: React.FC<Props> = ({ requestId, onWithdrawn }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const closeModal = () => {
    setIsOpen(false);
    setReason("");
  };

  const handleWithdraw = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await api.post(`/flea/purchase_requests/${requestId}/withdraw`, {
        reason,
      });
      onWithdrawn();
      closeModal();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} style={s.btn}>
        <X size={16} />
        申請を取り下げる
      </button>
      {isOpen && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>
                <AlertCircle size={20} />
                購入申請の取り下げ
              </h3>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={24} />
              </button>
            </div>
            <div style={s.modalBody}>
              <div
                style={{
                  fontSize: 13,
                  color: "#5c5a56",
                  backgroundColor: "#f0eeeb",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                <p>申請を取り下げると、出品者に通知が届きます。</p>
              </div>
              <div>
                <label style={s.label}>
                  取り下げ理由{" "}
                  <span style={{ color: "#d63c20", fontSize: 11 }}>(必須)</span>
                </label>
                <textarea
                  style={s.textarea}
                  rows={3}
                  placeholder="例: 他の商品を購入することになったため"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
            <div style={s.modalFooter}>
              <button
                onClick={closeModal}
                disabled={loading}
                style={s.cancelBtn}
              >
                キャンセル
              </button>
              <button
                onClick={handleWithdraw}
                disabled={loading || !reason.trim()}
                style={s.confirmBtn(loading || !reason.trim())}
              >
                {loading && <Loader2 size={16} />}申請を取り下げる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WithdrawRequestButton;
