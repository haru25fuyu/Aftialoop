import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import EditAddress from "./EditAddress";
import api from "../conf/api";
import { Address } from "../types/Address";
import { s } from "../styles/modal/SelectAddressModal.styles";

type Props = { isOpen: boolean; onClose: () => void; onSelect: (address: Address) => void; };

export default function SelectAddressModal({ isOpen, onClose, onSelect }: Props) {
  const [address, setAddress] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const GetAddressList = () => {
    api.post('/address/list').then((res) => setAddress(res.data.address || [])).catch(console.error);
  };

  useEffect(() => { if (isOpen) GetAddressList(); }, [isOpen]);

  const handleSelect = (item: Address) => { setSelectedAddress(item); onSelect(item); onClose(); };

  if (!isOpen) return null;

  return createPortal(
    <div style={s.overlay} onClick={onClose}>
      <div style={s.card} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <h2 style={s.title}>アドレス帳</h2>
          <button onClick={onClose} style={{ padding: "4px 12px", fontSize: 14, borderRadius: 6, border: "1px solid #e0ddd8", background: "#f8f7f5", cursor: "pointer" }}>閉じる</button>
        </div>
        <div style={s.body}>
          {isEditModalOpen && (
            <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
              <div style={{ width: "100%", maxWidth: 640, backgroundColor: "#fff", borderRadius: 12, overflowY: "auto", maxHeight: "90vh", padding: 24 }}>
                <EditAddress address={selectedAddress || {} as Address} isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); GetAddressList(); }} setAddress={setAddress} />
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div onClick={() => { setSelectedAddress({} as Address); setIsEditModalOpen(true); }}
              style={{ minHeight: 100, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", padding: 16, backgroundColor: "#fff", border: "1px solid #e0ddd8", borderRadius: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              <p style={{ color: "#8c8c8c", fontSize: 14 }}>新しいお届け先を追加</p>
            </div>
            {address.map((item) => (
              <div key={item.id} style={{ padding: 16, backgroundColor: "#fff", border: "1px solid #e0ddd8", borderRadius: 8 }}>
                <label htmlFor={`addr-${item.id}`} style={{ width: "100%", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                  <input id={`addr-${item.id}`} type="radio" name="address" value={item.id} checked={selectedAddress?.id === item.id} onChange={() => setSelectedAddress(item)} style={{ width: 20, height: 20 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 14, color: "#5c5a56" }}>{item.phone}</div>
                    <div style={{ fontSize: 14, color: "#5c5a56" }}>〒{item.post_code}</div>
                    <div style={{ fontSize: 14, color: "#5c5a56" }}>{item.pref}{item.address1}{item.address2}{item.address3}</div>
                  </div>
                </label>
                {selectedAddress?.id === item.id && (
                  <button onClick={() => handleSelect(item)} style={s.selectBtn}>この住所を使用する</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
