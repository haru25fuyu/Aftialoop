import React, { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import api from "../conf/api";
import { s } from "../styles/component/CancelTransactionButton.styles";

type Props = { transactionId: number; onCancelled: () => void; };

const CancelTransactionButton: React.FC<Props> = ({ transactionId, onCancelled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const closeModal = () => { setIsOpen(false); setReason(""); };

  const handleCancel = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await api.post(`/flea-market/transactions/${transactionId}/cancel`, { reason });
      onCancelled();
      closeModal();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} style={s.btn}><AlertTriangle size={16} />取引をキャンセル</button>
      {isOpen && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}><AlertTriangle size={20} style={{ color: "#d63c20" }} />取引のキャンセル</h3>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} /></button>
            </div>
            <div style={s.modalBody}>
              <div style={s.alert}><p style={{ fontWeight: 700, marginBottom: 4 }}>ご注意ください</p><ul style={{ paddingLeft: 16 }}><li>返金処理が行われます</li><li>商品は「出品中」に戻ります</li><li>この操作は取り消せません</li></ul></div>
              <div><label style={s.label}>キャンセル理由 <span style={{ color: "#d63c20", fontSize: 11 }}>(必須)</span></label><textarea style={s.textarea} rows={4} placeholder="例: 商品に不備が見つかったため" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            </div>
            <div style={s.modalFooter}>
              <button onClick={closeModal} disabled={loading} style={s.cancelBtn}>閉じる</button>
              <button onClick={handleCancel} disabled={loading || !reason.trim()} style={s.confirmBtn(loading || !reason.trim())}>
                {loading && <Loader2 size={16} />}キャンセル確定
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CancelTransactionButton;
