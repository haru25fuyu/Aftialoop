import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../component/Header";
import EditAddress from "../modal/EditAddress";
import api from "../conf/api";
import { Address } from "../types/Address";
import { s } from "../styles/page/SelectAddres.styles";

const SelectAddress: React.FC = () => {
  const [address, setAddress] = React.useState<Address[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedAddress, setSelectedAddress] = React.useState<Address>(
    {} as Address,
  );
  const navigate = useNavigate();

  useEffect(() => {
    api
      .post("/address/list")
      .then((res) => {
        const list = res.data.address || [];
        setAddress(list);
        const def = list.find((a: Address) => a.status);
        if (def) setSelectedAddress(def);
      })
      .catch(console.error);
  }, []);

  return (
    <div style={s.page}>
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              backgroundColor: "#fff",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              overflowY: "auto",
              maxHeight: "90vh",
              padding: 24,
            }}
          >
            <EditAddress
              setAddress={setAddress}
              address={selectedAddress}
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
            />
          </div>
        </div>
      )}
      <Header />
      <div style={s.list}>
        {address.map((item) => (
          <div key={item.id} style={s.card}>
            <label htmlFor={`address-${item.id}`} style={s.label}>
              <input
                id={`address-${item.id}`}
                type="radio"
                name="address"
                value={item.id}
                checked={selectedAddress.id === item.id}
                onChange={() => setSelectedAddress(item)}
                style={{ width: 20, height: 20 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                <div style={s.addressText}>{item.phone}</div>
                <div style={s.addressText}>{item.post_code}</div>
                <div style={s.addressText}>
                  {item.pref}
                  {item.address1}
                  {item.address2}
                  {item.address3}
                </div>
              </div>
            </label>
            {selectedAddress?.id === item.id && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 16,
                }}
              >
                <button style={s.useBtn} onClick={() => navigate(-1)}>
                  この住所を使用する
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={s.footer}>
        <button
          style={s.addBtn}
          onClick={() => {
            setSelectedAddress({} as Address);
            setIsModalOpen(true);
          }}
        >
          ＋ 新しい住所を追加
        </button>
      </div>
    </div>
  );
};

export default SelectAddress;
