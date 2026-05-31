import { useEffect, useState } from "react";
import api from "../conf/api";
import { CategorySearchResult } from "../types/FleaMarketForm";
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  XMarkIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { s } from "../styles/modal/CategorySelectModal.styles";

type CategoryNode = {
  id: number;
  name: string;
  has_children?: boolean;
  is_supply_type?: boolean;
};
type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (value: CategorySearchResult) => void;
  searchType: "ANIMAL" | "SUPPLY";
};

export default function CategorySelectModal({
  open,
  onClose,
  onSelect,
  searchType,
}: Props) {
  const [list, setList] = useState<CategoryNode[]>([]);
  const [path, setPath] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSelectingSupply, setIsSelectingSupply] = useState(false);

  const fetchList = async () => {
    if (!open) return;
    try {
      setLoading(true);
      const parent = path[path.length - 1];
      if (isSelectingSupply && searchType === "SUPPLY") {
        const res = await api.get<CategoryNode[]>("/api/supply-types");
        setList(
          (Array.isArray(res.data) ? res.data : []).map((item) => ({
            ...item,
            is_supply_type: true,
          })),
        );
        return;
      }
      const url = parent
        ? `/api/categories/children?parent_id=${parent.id}`
        : "/api/categories/children";
      const res = await api.get<CategoryNode[]>(url);
      const data = Array.isArray(res.data) ? res.data : [];
      if (searchType === "SUPPLY" && parent && data.length === 0) {
        setIsSelectingSupply(true);
        const supplyRes = await api.get<CategoryNode[]>("/api/supply-types");
        setList(
          (Array.isArray(supplyRes.data) ? supplyRes.data : []).map((item) => ({
            ...item,
            is_supply_type: true,
          })),
        );
      } else {
        setList(data);
      }
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchList();
    else {
      setPath([]);
      setList([]);
      setIsSelectingSupply(false);
    }
  }, [open, path, searchType, isSelectingSupply]);

  const handleItemClick = (node: CategoryNode) => {
    if (node.is_supply_type) {
      const category = path[path.length - 1] || { id: 0, name: "全カテゴリー" };
      onSelect({
        id: category.id,
        name: `${category.name} > ${node.name}`,
        is_supply: true,
        category_id: category.id,
        category_name: category.name,
        supply_type_id: node.id,
        supply_type_name: node.name,
      });
      onClose();
      return;
    }
    setPath((prev) => [...prev, node]);
  };

  const handleBack = () => {
    if (isSelectingSupply) setIsSelectingSupply(false);
    else setPath((prev) => prev.slice(0, -1));
  };

  const handleDecideAnimal = () => {
    if (path.length === 0) return;
    const current = path[path.length - 1];
    onSelect({ id: current.id, name: current.name, is_supply: false });
    onClose();
  };

  if (!open) return null;

  const currentParent = path[path.length - 1];
  const isLeafAnimal =
    !loading && list.length === 0 && searchType === "ANIMAL" && path.length > 0;

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        {/* ヘッダー */}
        <div style={s.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {(path.length > 0 || isSelectingSupply) && (
              <button
                onClick={handleBack}
                style={{
                  borderRadius: "50%",
                  padding: 4,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <ChevronLeftIcon
                  style={{ width: 20, height: 20, color: "#5c5a56" }}
                />
              </button>
            )}
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1a1a1a" }}>
              {isSelectingSupply
                ? "用品の種類を選択"
                : currentParent
                  ? currentParent.name
                  : "カテゴリーを選択"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              borderRadius: "50%",
              padding: 4,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <XMarkIcon style={{ width: 24, height: 24, color: "#8c8c8c" }} />
          </button>
        </div>
        {/* パンくず */}
        <div style={s.breadcrumb}>
          <span style={{ fontWeight: 700 }}>
            {searchType === "ANIMAL" ? "生体" : "用品"}
          </span>
          {path.map((n) => (
            <span key={n.id}>
              {" > "}
              {n.name}
            </span>
          ))}
          {isSelectingSupply && (
            <span style={{ color: "#1a5adc", fontWeight: 700 }}>
              {" > "}(用品選択)
            </span>
          )}
        </div>
        {/* リスト */}
        <div style={s.list}>
          {searchType === "SUPPLY" && !isSelectingSupply && !loading && (
            <div
              style={{
                marginBottom: 8,
                borderBottom: "1px solid #f0eeeb",
                paddingBottom: 8,
              }}
            >
              <button
                onClick={() => setIsSelectingSupply(true)}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: 8,
                  backgroundColor: "#e8f0fe",
                  padding: "12px 16px",
                  textAlign: "left",
                  color: "#1a5adc",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <ShoppingBagIcon style={{ width: 20, height: 20 }} />
                <span style={{ fontWeight: 700 }}>
                  {currentParent
                    ? `「${currentParent.name}」の用品として設定`
                    : "全カテゴリー共通の用品として設定"}
                </span>
              </button>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  textAlign: "center",
                  color: "#8c8c8c",
                }}
              >
                ↓ または、より詳細なカテゴリーを選択
              </div>
            </div>
          )}
          {loading ? (
            <div
              style={{
                display: "flex",
                height: 128,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: "2px solid #1a5adc",
                  borderRadius: "50%",
                  borderTopColor: "transparent",
                  animation: "spin 0.7s linear infinite",
                }}
              />
            </div>
          ) : isLeafAnimal ? (
            <div style={{ padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "#5c5a56", marginBottom: 16 }}>
                「{currentParent?.name}」を選択します
              </p>
              <button
                onClick={handleDecideAnimal}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#1a5adc",
                  color: "#fff",
                  borderRadius: 8,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                このカテゴリーで決定
              </button>
            </div>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {list.map((node) => (
                <li key={node.id}>
                  <button
                    onClick={() => handleItemClick(node)}
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderRadius: 8,
                      padding: "12px 16px",
                      textAlign: "left",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: node.is_supply_type ? 700 : 400,
                        color: node.is_supply_type ? "#1a5adc" : "#1a1a1a",
                      }}
                    >
                      {node.name}
                    </span>
                    {node.has_children && (
                      <ChevronRightIcon
                        style={{ width: 20, height: 20, color: "#8c8c8c" }}
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
