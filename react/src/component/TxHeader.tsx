import { FleaThreadResponse } from "../types/FleaMarket";
import { CONFIG } from "../conf/config";
import { TxPhase } from "../conf/FleaMarket";
import { s } from "../styles/component/TxHeader.styles";

export default function TxHeader({
  data,
  phase,
}: {
  data: FleaThreadResponse;
  phase: TxPhase;
}) {
  const { transaction, item, role } = data;
  const title = item?.name ?? `取引 #${transaction?.id}`;
  const sub = role === "BUYER" ? "出品者" : "購入者";

  return (
    <div style={s.wrap}>
      <div style={s.img}>
        {item?.main_image_url && (
          <img
            src={CONFIG.BASE_URL + item.main_image_url}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </div>
      <div style={s.info}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={s.name}>{title}</div>
          <StatusBadge phase={phase} />
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: "#5c5a56" }}>
          {sub}:
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
          小計: {transaction?.price_item} / 送料: {transaction?.price_shipping}{" "}
          / 決済: {transaction?.payment_status}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ phase }: { phase: TxPhase }) {
const label: Record<TxPhase, string> = {
  WAIT_PAYMENT:    "支払い待ち",
  SELLER_SET_TERMS:"条件確定（出品者）",
  BUYER_CONFIRM:   "購入者の同意待ち",
  PAYMENT:         "決済",
  SHIPPING:        "発送中",
  SHIPPED:         "発送済み",
  RATED_BY_BUYER:  "評価待ち",
  COMPLETE:        "完了",
  CANCELLED:       "キャンセル",
  UNKNOWN:         "不明",
};
  return <span style={s.badge}>{label[phase]}</span>;
}
