import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Package,
  MessageCircle,
  ShoppingCart,
  Store,
} from "lucide-react";
import { Header } from "../../component/Header";
import api from "../../conf/api";
import { CONFIG } from "../../conf/config";
import { s } from "../../styles/page/mypage/ActiveTransactionListPage.styles";

interface TransactionItem {
  id: number;
  pr_id: number;
  item_name: string;
  item_image_url: string;
  price: number;
  status: string;
  is_seller: boolean;
  updated_at: string;
}

const statusBadge: Record<
  string,
  (isSeller: boolean) => { label: string; color: string }
> = {
  ACCEPTED: () => ({ label: "支払い待ち", color: "#5c5a56" }),
  PAID: (isSeller) =>
    isSeller
      ? { label: "発送してください", color: "#d63c20" }
      : { label: "発送待ち", color: "#1a5adc" },
  SHIPPED: (isSeller) =>
    isSeller
      ? { label: "受取評価待ち", color: "#1a5adc" }
      : { label: "受取評価してください", color: "#d63c20" },
  RATED_BY_BUYER: (isSeller) =>
    isSeller
      ? { label: "評価してください", color: "#d63c20" }
      : { label: "相手の評価待ち", color: "#1a5adc" },
};

export default function ActiveTransactionListPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"buyer" | "seller">("buyer");

  useEffect(() => {
    api
      .get("/mypage/transactions/active")
      .then((res) => setTransactions(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredTransactions = transactions.filter((tx) =>
    activeTab === "seller" ? tx.is_seller : !tx.is_seller,
  );
  //const hasBuyer = transactions.some((tx) => !tx.is_seller);
  //const hasSeller = transactions.some((tx) => tx.is_seller);

  return (
    <>
      <Header />
      <div style={s.page}>
        <div style={s.header}>
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
          <h1 style={s.title}>取引中の商品</h1>
        </div>
        <div style={s.tabs}>
          // has を削除、setActiveTab の型修正
          {[
            ["buyer", <ShoppingCart size={16} />, "購入"],
            ["seller", <Store size={16} />, "出品"],
          ].map(([tab, icon, label]) => (
            <button onClick={() => setActiveTab(tab as "buyer" | "seller")}>
              {icon as React.ReactNode}
              {label as string}
            </button>
          ))}
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#8c8c8c" }}>
            読み込み中...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#8c8c8c" }}>
            取引中の商品はありません
          </div>
        ) : (
          <div style={s.list}>
            {filteredTransactions.map((tx) => {
              const badge = (
                statusBadge[tx.status] ||
                (() => ({ label: "進行中", color: "#8c8c8c" }))
              )(tx.is_seller);
              return (
                <Link
                  key={tx.id}
                  to={`/flea-market/transactions/${tx.id}`}
                  style={s.item}
                >
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 8,
                      overflow: "hidden",
                      flexShrink: 0,
                      backgroundColor: "#f0eeeb",
                    }}
                  >
                    {tx.item_image_url ? (
                      <img
                        src={
                          tx.item_image_url.startsWith("http")
                            ? tx.item_image_url
                            : CONFIG.BASE_URL + tx.item_image_url
                        }
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Package size={24} style={{ color: "#c4c1bb" }} />
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#1a1a1a",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginBottom: 4,
                      }}
                    >
                      {tx.item_name}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: badge.color,
                        backgroundColor: badge.color + "18",
                        padding: "2px 8px",
                        borderRadius: 9999,
                        border: `1px solid ${badge.color}40`,
                      }}
                    >
                      {badge.label}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 8,
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "#1a1a1a" }}>
                        ¥{tx.price.toLocaleString()}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 12,
                          color: "#8c8c8c",
                          backgroundColor: "#f8f7f5",
                          padding: "4px 8px",
                          borderRadius: 8,
                        }}
                      >
                        <MessageCircle size={12} />
                        取引画面へ
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
