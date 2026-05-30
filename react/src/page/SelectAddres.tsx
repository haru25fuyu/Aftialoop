import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../component/Header';
import EditAddress from '../modal/EditAddress';
import api from '../conf/api';
import { Address } from '../types/Content';
import { s } from '../styles/page/SelectAddres.styles';

const SelectAddress: React.FC = () => {
  const [address, setAddress] = React.useState<Address[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedAddress, setSelectedAddress] = React.useState<Address>({} as Address);
  const navigate = useNavigate();

  useEffect(() => {
    api.post('/address/list').then((res) => {
      const list = res.data.address || [];
      setAddress(list);
      const def = list.find((a: Address) => a.Status === 1);
      if (def) setSelectedAddress(def);
    }).catch(console.error);
  }, []);

  return (
    <div style={s.page}>
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50 }}>
          <div style={{ width: "100%", maxWidth: 480, backgroundColor: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.2)", overflowY: "auto", maxHeight: "90vh", padding: 24 }}>
            <EditAddress setAddress={setAddress} address={selectedAddress} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
          </div>
        </div>
      )}
      <Header />
      <div style={s.list}>
        {address.map((item) => (
          <div key={item.ID} style={s.card}>
            <label htmlFor={`address-${item.ID}`} style={s.label}>
              <input id={`address-${item.ID}`} type="radio" name="address" value={item.ID} checked={selectedAddress.ID === item.ID} onChange={() => setSelectedAddress(item)} style={{ width: 20, height: 20 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{item.Name}</div>
                <div style={s.addressText}>{item.Phone}</div>
                <div style={s.addressText}>{item.PostCode}</div>
                <div style={s.addressText}>{item.Pref}{item.Address1}{item.Address2}{item.Address3}</div>
              </div>
            </label>
            {selectedAddress?.ID === item.ID && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 16 }}>
                <button style={s.useBtn} onClick={() => navigate(-1)}>この住所を使用する</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={s.footer}>
        <button style={s.addBtn} onClick={() => { setSelectedAddress({} as Address); setIsModalOpen(true); }}>＋ 新しい住所を追加</button>
      </div>
    </div>
  );
};

export default SelectAddress;
