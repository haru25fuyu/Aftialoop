import React, { useMemo, useEffect } from "react";
import { CONFIG, PREFS } from "../conf/config";
import { PublishSummary } from "../types/FleaMarketForm";
import { TYPE_LABELS } from "../conf/Market";
import { LoadingButton } from "../component/LoadingButton";
import { s } from "../styles/modal/ConfirmDialog.styles";

const Row = ({ label, value, isLarge, isMoney }: { label: string; value: React.ReactNode; isLarge?: boolean; isMoney?: boolean }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: "#8c8c8c", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{label}</span>
    <span style={{ fontSize: isLarge ? 16 : 14, fontWeight: isMoney ? 700 : 500, color: isMoney ? "#1a5adc" : "#1a1a1a" }}>{value}</span>
  </div>
);

export function ConfirmDialog({ open, onClose, onConfirm, submitting, summary }: { open: boolean; onClose: () => void; onConfirm: () => void; submitting: boolean; summary: PublishSummary; }) {
  const displayUrls = useMemo(() => summary.images.map(img => img.file ? { src: URL.createObjectURL(img.file), isBlob: true } : { src: img.url, isBlob: false }), [summary.images]);
  useEffect(() => () => { displayUrls.forEach(d => { if (d.isBlob) URL.revokeObjectURL(d.src); }); }, [displayUrls]);

  if (!open) return null;

  const { name, price, quantity, isMultiPurchasable, sellerPlusPct, type, description, shippingFeeType, shipFromId, shipsWithinDays, mainIndex, details, category_name } = summary;
  const fmt = (n: number) => n.toLocaleString("ja-JP");
  const typeLabel = TYPE_LABELS[type] || "その他";
  const isSupply = type === "SUPPLY";
  const shipFeeLabel = shippingFeeType === 0 ? "送料込み (出品者負担)" : "着払い (購入者負担)";
  const shipsLabel = !shipsWithinDays ? "未選択" : shipsWithinDays === 1 ? "1日以内" : shipsWithinDays === 2 ? "2〜3日" : shipsWithinDays === 4 ? "4〜7日" : `${shipsWithinDays}日以内`;
  const prefName = PREFS?.find((p: any) => p.id === shipFromId)?.name || "未設定";

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.header}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>出品内容の確認</h3>
          <button onClick={onClose} style={{ padding: 8, background: "none", border: "none", cursor: "pointer", borderRadius: "50%", color: "#8c8c8c" }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={s.body}>
          {/* 画像 */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={s.sectionTitle}>商品画像</h4>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
              {summary.images.length === 0 ? (
                <div style={{ width: "100%", height: 128, backgroundColor: "#f8f7f5", borderRadius: 12, border: "2px dashed #e0ddd8", display: "flex", alignItems: "center", justifyContent: "center", color: "#8c8c8c", fontSize: 14 }}>画像なし</div>
              ) : summary.images.map((img, i) => (
                <div key={i} style={{ position: "relative", flexShrink: 0, width: 96, height: 96, borderRadius: 8, overflow: "hidden", border: i === mainIndex ? "2px solid #1a5adc" : "1px solid #e0ddd8" }}>
                  <img src={img.file ? URL.createObjectURL(img.file) : CONFIG.BASE_URL + img.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                  {i === mainIndex && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(26,90,220,0.9)", padding: "2px 0", textAlign: "center" }}><p style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>メイン</p></div>}
                </div>
              ))}
            </div>
          </div>
          {/* 基本情報 */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={s.sectionTitle}>基本情報</h4>
            <div style={{ backgroundColor: "#f8f7f5", borderRadius: 12, padding: 20, border: "1px solid #e0ddd8", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px" }}>
              <Row label="商品名" value={name} isLarge />
              <Row label="カテゴリー" value={category_name} />
              <Row label="出品カテゴリー" value={<span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 9999, backgroundColor: isSupply ? "#e8f0fe" : "#f0fae8", color: isSupply ? "#1a5adc" : "#3a7a22", fontWeight: 700 }}>{typeLabel}</span>} />
              <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #e0ddd8", margin: "4px 0" }} />
              <Row label="販売価格" value={`¥ ${fmt(price)}`} isMoney />
              <Row label="数量" value={`${quantity} 個 ${isMultiPurchasable ? "(複数可)" : ""}`} />
              {sellerPlusPct > 0 && <Row label="追加割引" value={`${sellerPlusPct}%`} />}
              <Row label="説明" value={description || "なし"} />
            </div>
          </div>
          {/* 配送情報 */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={s.sectionTitle}>配送情報</h4>
            <div style={{ backgroundColor: "#f8f7f5", borderRadius: 12, padding: 20, border: "1px solid #e0ddd8", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px" }}>
              <Row label="送料" value={shipFeeLabel} />
              <Row label="発送元" value={prefName} />
              <Row label="発送日の目安" value={shipsLabel} />
            </div>
          </div>
        </div>
        <div style={s.footer}>
          <button onClick={onClose} style={s.cancelBtn}>修正する</button>
          <LoadingButton onClick={onConfirm} loading={submitting} style={s.confirmBtn}>出品する</LoadingButton>
        </div>
      </div>
    </div>
  );
}
