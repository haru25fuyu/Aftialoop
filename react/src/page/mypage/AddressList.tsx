import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../component/Header';
import EditAddress from '../../modal/EditAddress';
import api from '../../conf/api';
import { Address } from '../../types/Address';
import { Plus, MapPin, CheckCircle, Phone, Edit2, ChevronLeft } from 'lucide-react';
import { Spinner } from '../../component/Spinner';
import { s } from '../../styles/page/mypage/AddressList.styles';

const AddressList: React.FC = () => {
  const navigate = useNavigate();
  const [address, setAddress] = useState<Address[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address>({} as Address);
  const [isLoading, setIsLoading] = useState(true);

  const getList = () => {
    setIsLoading(true);
    api.post('/address/list').then((res) => setAddress(res.data.address || [])).catch(console.error).finally(() => setIsLoading(false));
  };

  useEffect(() => { getList(); }, []);

  return (
    <div style={s.page}>
      <Header />
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50, padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 512, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }}>
            <EditAddress setAddress={setAddress} address={selectedAddress} isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); getList(); }} />
          </div>
        </div>
      )}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 24 }}>
          <button onClick={() => navigate(-1)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer", borderRadius: "50%" }}><ChevronLeft size={24} /></button>
          <MapPin size={20} style={{ color: "#1a5adc" }} />
          <h1 style={s.title}>お届け先住所の管理</h1>
        </div>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Spinner size="lg" /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <button onClick={() => { setSelectedAddress({} as Address); setIsModalOpen(true); }}
              style={{ width: "100%", minHeight: 100, border: "2px dashed #93b3f5", borderRadius: 12, backgroundColor: "#f0f4fe", color: "#1a5adc", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Plus size={28} />
              <span style={{ fontWeight: 700, fontSize: 14 }}>新しい住所を追加</span>
            </button>
            {address.map((item) => (
              <div key={item.id} onClick={() => { setSelectedAddress(item); setIsModalOpen(true); }}
                style={{ position: "relative", padding: 20, backgroundColor: "#fff", border: `1px solid ${item.status ? "#1a5adc" : "#e0ddd8"}`, borderRadius: 12, cursor: "pointer", display: "flex", flexDirection: "column", gap: 12, boxShadow: item.status ? "0 0 0 1px #1a5adc" : undefined }}>
                {item.status && <div style={{ position: "absolute", top: 12, right: 12, backgroundColor: "#1a5adc", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 9999, display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={12} />デフォルト</div>}
                <div>
                  <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 2 }}>お名前</div>
                  <div style={{ fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>{item.name}<Edit2 size={14} style={{ color: "#c4c1bb" }} /></div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#8c8c8c", marginBottom: 2 }}>住所</div>
                  <div style={{ fontSize: 14, color: "#2e3128", lineHeight: 1.6 }}>〒{item.post_code}<br />{item.pref} {item.address1}<br />{item.address2} {item.address3}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#8c8c8c", backgroundColor: "#f8f7f5", padding: 8, borderRadius: 8 }}>
                  <Phone size={14} /><span>{item.phone}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AddressList;
