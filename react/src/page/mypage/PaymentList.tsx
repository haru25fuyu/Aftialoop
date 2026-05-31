import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../component/Header";
import PaymentModal from "../../modal/EditPayment";
import LoginModal from "../../modal/Login";
import api, { getAccessToken } from "../../conf/api";
import {
  CreditCard,
  Plus,
  Trash2,
  CheckCircle,
  Settings,
  Calendar,
  ChevronLeft,
} from "lucide-react";
import { Payment } from "../../types/Payment";
import { Spinner } from "../../component/Spinner";
import { s } from "../../styles/page/mypage/PaymentList.styles";

const PaymentList: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPaymentID, setSelectedPaymentID] = useState<string>("");
  const [ModalMode, setModalMode] = useState<string>("");
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api
      .post("/card/list")
      .then((res) => {
        const token = getAccessToken();
        if (!token || token === "undefined") {
          setLoginModalOpen(true);
          return;
        }
        setPayments(res.data.card || []);
      })
      .catch(() => setLoginModalOpen(true))
      .finally(() => setIsLoading(false));
  }, [reloadTrigger]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setReloadTrigger((p) => p + 1);
  };

  return (
    <div style={s.page}>
      <Header />
      {isModalOpen && (
        <PaymentModal
          setPayments={setPayments}
          id={selectedPaymentID}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          openMode={ModalMode}
        />
      )}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={() => setReloadTrigger((p) => p + 1)}
        showCloseButton={false}
      />
      <main style={{ maxWidth: 512, margin: "0 auto", padding: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
            marginBottom: 16,
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
              borderRadius: "50%",
            }}
          >
            <ChevronLeft size={24} />
          </button>
          <CreditCard size={20} style={{ color: "#1a5adc" }} />
          <h1 style={s.title}>支払い方法（カード）</h1>
        </div>
        {isLoading ? (
          <div
            style={{ display: "flex", justifyContent: "center", padding: 80 }}
          >
            <Spinner size="lg" />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <button
              onClick={() => {
                setSelectedPaymentID("");
                setModalMode("card");
                setIsModalOpen(true);
              }}
              style={{
                width: "100%",
                minHeight: 150,
                border: "2px dashed #93b3f5",
                borderRadius: 12,
                backgroundColor: "#f0f4fe",
                color: "#1a5adc",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Plus size={28} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                新しいカードを追加
              </span>
            </button>
            {payments?.map((item) => (
              <div
                key={item.id}
                style={{
                  position: "relative",
                  backgroundColor: "#fff",
                  border: `1px solid ${item.isDefault ? "#1a5adc" : "#e0ddd8"}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: item.isDefault ? "0 0 0 1px #1a5adc" : undefined,
                }}
              >
                {item.isDefault && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      backgroundColor: "#1a5adc",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "4px 12px 4px 16px",
                      borderRadius: "0 0 0 8px",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      zIndex: 10,
                    }}
                  >
                    <CheckCircle size={12} />
                    デフォルト
                  </div>
                )}
                <div
                  style={{
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 16,
                        color: "#5c5a56",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {item.cardBrand}
                    </div>
                    <CreditCard size={20} style={{ color: "#c4c1bb" }} />
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontFamily: "monospace",
                      color: "#1a1a1a",
                      letterSpacing: "0.15em",
                      marginBottom: 12,
                    }}
                  >
                    **** **** **** {item.last4}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 14,
                      color: "#8c8c8c",
                    }}
                  >
                    <Calendar size={14} />
                    <span style={{ fontSize: 12 }}>Expires</span>
                    <span style={{ fontWeight: 700, color: "#2e3128" }}>
                      {String(item.expMonth).padStart(2, "0")} /{" "}
                      {String(item.expYear).slice(-2)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: "#f8f7f5",
                    borderTop: "1px solid #f0eeeb",
                    display: "flex",
                  }}
                >
                  <button
                    onClick={() => {
                      setSelectedPaymentID(item.id);
                      setModalMode("customer");
                      setIsModalOpen(true);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#5c5a56",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      borderRight: "1px solid #e0ddd8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Settings size={16} />
                    詳細・設定
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPaymentID(item.id);
                      setModalMode("delete");
                      setIsModalOpen(true);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#d63c20",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Trash2 size={16} />
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PaymentList;
