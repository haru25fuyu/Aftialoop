import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Header } from "../../component/Header";
import api from "../../conf/api";
import { s } from "../../styles/page/mypage/BankAccount.styles";

interface BankAccountData { bank_name: string; bank_code: string; branch_name: string; branch_code: string; account_type: string; account_number: string; account_holder: string; }

export default function BankAccount() {
  const navigate = useNavigate();
  const [bankAccount, setBankAccount] = useState<BankAccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bank_name: "", bank_code: "", branch_name: "", branch_code: "", account_type: "ORDINARY", account_number: "", account_holder: "" });

  useEffect(() => {
    api.get("/bank-account/get").then((res) => {
      if (res.data) { setBankAccount(res.data); setForm(res.data); }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await api.post("/bank-account/save", form); alert("保存しました"); navigate(-1); }
    catch { alert("保存に失敗しました"); }
    finally { setSaving(false); }
  };

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div style={s.page}>
      <Header />
      <div style={{ maxWidth: 512, margin: "0 auto", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 24 }}>
          <button onClick={() => navigate(-1)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer", borderRadius: "50%" }}><ChevronLeft size={24} /></button>
          <h1 style={s.title}>振込口座の設定</h1>
        </div>
        {loading ? <div style={{ textAlign: "center", padding: 80 }}><Loader2 size={32} style={{ animation: "spin 0.7s linear infinite", color: "#8c8c8c" }} /></div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { key: "bank_name", label: "銀行名", placeholder: "例：〇〇銀行" },
              { key: "bank_code", label: "銀行コード", placeholder: "例：0001" },
              { key: "branch_name", label: "支店名", placeholder: "例：本店" },
              { key: "branch_code", label: "支店コード", placeholder: "例：001" },
              { key: "account_number", label: "口座番号", placeholder: "例：1234567" },
              { key: "account_holder", label: "口座名義（カタカナ）", placeholder: "例：タロウ ヤマダ" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={s.formGroup}>
                <label style={s.label}>{label}</label>
                <input value={form[key as keyof typeof form]} onChange={(e) => update(key, e.target.value)} placeholder={placeholder} style={s.input} />
              </div>
            ))}
            <div style={s.formGroup}>
              <label style={s.label}>口座種別</label>
              <select value={form.account_type} onChange={(e) => update("account_type", e.target.value)} style={s.input}>
                <option value="ORDINARY">普通</option>
                <option value="CURRENT">当座</option>
              </select>
            </div>
            <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
              {saving ? <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> : "保存する"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
