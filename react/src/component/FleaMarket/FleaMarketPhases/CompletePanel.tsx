import { CheckCircle, FileText, HelpCircle, Home } from "lucide-react";
import { FleaThreadResponse } from "../../../types/FleaMarket";
import { s } from "../../../styles/component/fleaMarket/fleaMarketPhases/CompletePanel.styles";
import { CONFIG } from "../../../conf/config";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}
function yen(n: number) {
  return `¥${Math.floor(n).toLocaleString()}`;
}

export default function CompletePanel({ data }: { data: FleaThreadResponse }) {
  const { transaction: tx, item, role } = data;
  const isSeller = role === "SELLER";

  return (
    <div style={s.wrap}>
      <div style={s.banner}>
        <div style={s.bannerInner}>
          <CheckCircle size={24} />
          <div>
            <h3 style={s.bannerTitle}>取引が完了しました</h3>
            <p style={s.bannerDesc}>
              ありがとうございました。またのご利用をお待ちしております。
            </p>
          </div>
        </div>
      </div>

      <div style={s.section}>
        <h4 style={s.sectionTitle}>取引サマリー</h4>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              overflow: "hidden",
              backgroundColor: "#f0eeeb",
              flexShrink: 0,
            }}
          >
            {item?.main_image_url && (
              <img
                src={CONFIG.BASE_URL + item.main_image_url}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{item?.name}</div>
            <div style={{ fontSize: 14, color: "#5c5a56" }}>
              {yen(tx?.price_item ?? 0)}
            </div>
          </div>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <div style={s.row}>
            <span style={s.rowLabel}>完了日</span>
            <span style={s.rowValue}>{formatDate(tx?.completed_at)}</span>
          </div>
          <div style={s.row}>
            <span style={s.rowLabel}>取引ID</span>
            <span style={{ ...s.rowValue, fontFamily: "monospace" }}>
              #{tx?.id}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {isSeller && (
          <a
            href={`${CONFIG.BASE_URL}/flea-market/transactions/${tx?.id}/statement/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 0",
              border: `1px solid #e0ddd8`,
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              color: "#2e3128",
            }}
          >
            <FileText size={18} />
            販売明細書をダウンロード
          </a>
        )}
        <a
          href="/contact"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "12px 0",
            border: `1px solid #e0ddd8`,
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            color: "#2e3128",
          }}
        >
          <HelpCircle size={18} />
          この取引について問い合わせる
        </a>
        <a
          href="/flea-market"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "16px 0",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            backgroundColor: "#1a1a1a",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          <Home size={20} />
          フリーマーケットトップへ
        </a>
      </div>
    </div>
  );
}
