import React, { useState } from "react";
import { XCircle, Loader2, X } from "lucide-react";
import api from "../conf/api";
import { s } from "../styles/component/RejectRequestButton.styles";

type Props = { requestId: number; onRejected: () => void; };

const RejectRequestButton: React.FC<Props> = ({ requestId, onRejected }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const closeModal = () => { setIsOpen(false); setReason(""); };

  const handleReject = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await api.post(`/flea/purchase_requests/${requestId}/reject`, { reason });
      onRejected();
      closeModal();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} style={s.btn}><XCircle size={16} />申請を断る</button>
      {isOpen && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}><XCircle size={20} />購入申請を断る</h3>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} /></button>
            </div>
            <div style={s.modalBody}>
              <div style={s.alert}><p>申請を断ると、購入者に通知が届きます。この操作は取り消せません。</p></div>
              <div><label style={s.label}>断る理由 <span style={{ color: "#d63c20", fontSize: 11 }}>(必須)</span></label><textarea style={s.textarea} rows={3} placeholder="例: 既に他の方に販売が決まったため" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            </div>
            <div style={s.modalFooter}>
              <button onClick={closeModal} disabled={loading} style={s.cancelBtn}>キャンセル</button>
              <button onClick={handleReject} disabled={loading || !reason.trim()} style={s.confirmBtn(loading || !reason.trim())}>
                {loading && <Loader2 size={16} />}申請を断る
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RejectRequestButton;
