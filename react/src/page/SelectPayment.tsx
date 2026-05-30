import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../component/Header';
import SquarePayment from '../modal/EditPayment';
import LoginModal from '../modal/Login';
import api, { getAccessToken } from '../conf/api';
import { Payment } from '../types/Content';
import { s } from '../styles/page/SelectPayment.styles';

const SelectPayment: React.FC = () => {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedPaymentID, setSelectedPaymentID] = React.useState<string>("");
  const [ModalMode, setModalMode] = React.useState<string>("");
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    api.post("card/list", {}).then((res) => {
      const token = getAccessToken();
      if (!token || token === 'undefined') { setLoginModalOpen(true); return; }
      setPayments(res.data.card);
    }).catch(() => setLoginModalOpen(true));
  }, [reloadTrigger]);

  return (
    <div>
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50 }}>
          <div style={{ width: "100%", maxWidth: 448, backgroundColor: "#fff", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", overflowY: "auto", maxHeight: "80vh", padding: 16 }}>
            <SquarePayment setPayments={setPayments} id={selectedPaymentID} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} openMode={ModalMode} />
          </div>
        </div>
      )}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setLoginModalOpen(false)} onLoginSuccess={() => setReloadTrigger(p => p + 1)} />
      <Header />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
        <div style={s.list}>
          {payments.map((item) => (
            <div key={item.id} style={s.card(selectedPaymentID === item.id)}>
              <div style={{ padding: 16, cursor: "pointer" }} onClick={() => setSelectedPaymentID(item.id)}>
                <div style={s.cardBrand}>{item.cardBrand}</div>
                <div style={s.cardNumber}>**** **** **** {item.last4}</div>
                <div style={s.cardExpiry}>有効期限 {String(item.expMonth).padStart(2, '0')} / {String(item.expYear).slice(-2)}</div>
              </div>
              {selectedPaymentID === item.id && (
                <div style={{ padding: "0 16px 16px" }}>
                  <button style={s.useBtn} onClick={() => navigate(-1)}>このカードを使用する</button>
                </div>
              )}
            </div>
          ))}
          <button onClick={() => { setSelectedPaymentID(""); setModalMode("card"); setIsModalOpen(true); }}
            style={{ width: "100%", minHeight: 100, border: "2px dashed #93b3f5", borderRadius: 12, backgroundColor: "#f0f4fe", color: "#1a5adc", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontSize: 28 }}>+</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>新しいカードを追加</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectPayment;
