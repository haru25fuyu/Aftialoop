import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate, Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";

import { Header } from "../../component/Header";
import CommentList from "../../component/CommentList";
import QuestionModal from "../../modal/QuestionModal";
import PurchaseRequestModal from "../../modal/PurchaseRequestModal";

import { itemImage } from "../../types/Content";
import { FleaContent, FleaComment } from "../../types/FleaMarket";

import api from "../../conf/api";
import { CONFIG } from "../../conf/config";
import { SHIPPING_FEE_TYPES_MAP } from "../../conf/FleaMarket";
import { getPrefName } from "../../conf/function";
import { LikeButton } from "../../component/LikeButton";
import { Spinner } from "../../component/Spinner";
import { useAuth } from "../../context/AuthContext";

import { s } from "../../styles/page/flea_market/FleaMarketItem.styles";

const DEFAULT_RATE = 1.0;
const DEFAULT_DEN = 10000;
function safeRate(v: number | null | undefined): number {
  const n = Number(v);
  return !Number.isFinite(n) || n <= 0 ? DEFAULT_RATE : n;
}
function normalizeRate(rawRate: number, den: number) {
  return rawRate > 2.0
    ? { num: Math.round(rawRate), den }
    : { num: Math.round(rawRate * den), den };
}
function calcRateDiscount(
  priceYen: number,
  userPoint: number,
  rawRate: number,
  rateDen: number,
) {
  const price = Math.floor(priceYen);
  const point = Math.floor(userPoint);
  const { num: scaledRate, den } = normalizeRate(rawRate, rateDen);
  if (scaledRate <= den) return { discountYen: 0 };
  const needPt = Math.floor((price * den) / scaledRate);
  const usePt = Math.min(point, needPt);
  const coveredYen =
    usePt >= needPt
      ? price
      : Math.min(Math.floor((usePt * scaledRate) / den), price);
  return { discountYen: Math.max(0, coveredYen - usePt) };
}

type FlatDetails = {
  locality?: string;
  hatch_date?: string;
  size?: string;
  generation?: string;
  sex?: string;
  brand?: string;
  sku?: string;
  net_weight_g?: string | number;
};

type MappedComment = {
  id: string;
  itemId: number;
  parentMessageId: number | null;
  userId: string;
  userName: string;
  userIcon: string;
  body: string;
  createdAt: number;
};

const Item: React.FC = () => {
  const [openPurchaseModal, setOpenPurchaseModal] = useState(false);
  const [item, setItem] = useState<FleaContent | null>(null);
  const [itemDetails, setItemDetails] = useState<FlatDetails | null>(null);
  const [images, setImages] = useState<itemImage[]>([]);
  const { user } = useAuth();
  const [comments, setComments] = useState<MappedComment[]>([]);
  const [showQModal, setShowQModal] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [rateDen, setRateDen] = useState<number>(DEFAULT_DEN);
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleSendQuestion = async (text: string) => {
    if (!item) return;
    await api.post("/items/question", { itemId: item.id, text });
    alert("質問を送信しました");
    setShowQModal(false);
  };

  useEffect(() => {
    if (!id) return;
    api
      .get(`/flea-market/item/${id}`)
      .then((res) => {
        if (res.data) {
          const fetchedItem = res.data.item;
          setItem(fetchedItem);
          setImages(res.data.images || []);
          setRateDen(res.data.rate_den || DEFAULT_DEN);
          setIsSeller(fetchedItem.userId === user?.id);
          let d = fetchedItem.details || res.data.details;
          if (typeof d === "string") {
            try {
              d = JSON.parse(d);
            } catch {
              d = {};
            }
          }
          if (d) {
            setItemDetails(d.animal_details || d.supply_details || d);
          }
        }
      })
      .catch(console.error);
  }, [id, location.search]);

  useEffect(() => {
    if (!id) return;
    api.get(`/flea-market/item/${id}/messages`).then((res) => {
      const list = res.data?.messages ?? [];
      setComments(
        list.map((m: FleaComment) => ({
          id: String(m.id),
          itemId: m.itemId,
          parentMessageId: m.parentMessageId,
          userId: m.userId,
          userName: m.userName,
          userIcon: m.userIcon,
          body: m.body,
          createdAt: Number(m.createdAt) || Date.now(),
        })),
      );
    });
  }, [id]);

  useEffect(() => {
    if (item && user) setIsSeller(item.userId === user.id);
  }, [item, user]);

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "";
    return dateStr.split("T")[0];
  };

  const renderSpecs = () => {
    if (!item || !itemDetails) return null;
    if (item.type === "ANIMAL")
      return (
        <dl style={s.specsContainer}>
          <div style={s.specsHeader}>生体情報</div>
          {[
            ["産地", itemDetails.locality],
            ["羽化日", formatDate(itemDetails.hatch_date)],
            ["サイズ", itemDetails.size],
            ["累代", itemDetails.generation],
            [
              "性別",
              itemDetails.sex === "male"
                ? "オス"
                : itemDetails.sex === "female"
                  ? "メス"
                  : itemDetails.sex === "pair"
                    ? "ペア"
                    : "不明",
            ],
          ]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label as string} style={s.detailRow}>
                <dt style={s.detailLabel}>{label}</dt>
                <dd style={s.detailValue}>{value}</dd>
              </div>
            ))}
        </dl>
      );
    if (item.type === "SUPPLY")
      return (
        <dl style={s.specsContainer}>
          <div style={s.specsHeader}>製品情報</div>
          {[
            ["ブランド", itemDetails.brand],
            ["SKU/型番", itemDetails.sku],
            [
              "内容量",
              itemDetails.net_weight_g ? `${itemDetails.net_weight_g}g` : "",
            ],
          ]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label as string} style={s.detailRow}>
                <dt style={s.detailLabel}>{label}</dt>
                <dd style={s.detailValue}>{value}</dd>
              </div>
            ))}
        </dl>
      );
    return null;
  };

  if (!item)
    return (
      <div style={s.page}>
        <Header />
        <div style={s.loadingWrap}>
          <Spinner size="lg" />
          <p style={s.loadingText}>商品情報を読み込んでいます...</p>
        </div>
      </div>
    );

  const rawRate = safeRate(item.seller_rate);
  const { num, den } = normalizeRate(rawRate, rateDen);
  const isRateUp = num > den;
  const { discountYen } = user
    ? calcRateDiscount(item.price, user.point, rawRate, rateDen)
    : { discountYen: 0 };

  const ActionButtons = () => (
    <div style={s.actionBtns}>
      <button style={s.questionBtn} onClick={() => setShowQModal(true)}>
        質問・コメント
      </button>
      {isSeller ? (
        <button
          style={s.editBtn}
          onClick={() => navigate(`/flea-market/item/edit/${item.id}`)}
        >
          商品を編集する
        </button>
      ) : (
        <button
          style={item.quantity > 0 ? s.buyBtn : s.soldOutBtn}
          onClick={() => setOpenPurchaseModal(true)}
          disabled={item.quantity <= 0}
        >
          {item.quantity > 0 ? "購入手続きへ" : "売り切れ"}
        </button>
      )}
    </div>
  );

  return (
    <div style={s.page}>
      <Header />
      <main style={s.main}>
        <div style={s.grid}>
          {/* 画像エリア */}
          <div style={s.galleryWrap}>
            <Swiper
              modules={[Pagination, Navigation]}
              spaceBetween={0}
              slidesPerView={1}
              pagination={{ clickable: true }}
              navigation
              loop={images.length >= 2}
              style={{ width: "100%", height: "auto" }}
            >
              {images.length > 0 ? (
                images.map((img) => (
                  <SwiperSlide
                    key={img.id}
                    style={{ width: "100%", position: "relative" }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#fff",
                        position: "relative",
                      }}
                    >
                      <img
                        style={s.img}
                        src={CONFIG.BASE_URL + img.url}
                        alt={item.name}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: 16,
                          right: 16,
                          zIndex: 20,
                        }}
                      >
                        <LikeButton
                          itemId={item.id}
                          initialLiked={item.is_liked}
                          size={32}
                        />
                      </div>
                    </div>
                  </SwiperSlide>
                ))
              ) : (
                <SwiperSlide>
                  <div style={{ ...s.noImg, aspectRatio: "1" }}>NO IMAGE</div>
                </SwiperSlide>
              )}
            </Swiper>
          </div>

          {/* 情報エリア */}
          <div style={s.infoWrap}>
            <div style={s.titleArea}>
              <h1 style={s.name}>{item.name}</h1>
              <div style={s.priceRow}>
                <span style={s.price}>¥{item.price.toLocaleString()}</span>
                <span style={s.shippingBadge}>
                  {SHIPPING_FEE_TYPES_MAP.find(
                    (f) => f.id === item.shippingFeeType,
                  )?.label || "送料情報なし"}
                </span>
              </div>
              {isRateUp && item.quantity > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {discountYen > 0 ? (
                    <span style={s.pointDiscountUp}>
                      ポイント利用で {discountYen.toLocaleString()}円お得
                    </span>
                  ) : (
                    <span style={s.pointDiscountDefault}>ポイントでおトク</span>
                  )}
                </div>
              )}
            </div>

            <ActionButtons />

            {/* 詳細 */}
            <section style={s.detailSection}>
              <h3 style={s.detailTitle}>商品の詳細</h3>
              <div style={s.detailGrid}>
                {[
                  ["カテゴリ", item.type === "ANIMAL" ? "生体" : "用品"],
                  ["在庫数", `${item.quantity} 個`],
                  ["発送元の地域", getPrefName(item.shipFrom)],
                  [
                    "発送日の目安",
                    item.shipsWithinDays
                      ? `${item.shipsWithinDays}日以内`
                      : "未定",
                  ],
                ].map(([label, value]) => (
                  <div key={label as string} style={s.detailRow}>
                    <span style={s.detailLabel}>{label}</span>
                    <span style={s.detailValue}>{value}</span>
                  </div>
                ))}
              </div>
              {renderSpecs()}
            </section>

            <section style={s.descSection}>
              <h3 style={s.detailTitle}>商品説明</h3>
              <div style={s.descText}>
                {item.description || "説明はありません。"}
              </div>
            </section>

            {/* 出品者 */}
            <Link to={`/user/profile/${item.userId}`} style={s.sellerCard}>
              <img
                src={
                  item.seller_icon_url
                    ? CONFIG.BASE_URL + item.seller_icon_url
                    : "/data/Logo.png"
                }
                alt={item.seller_name}
                style={s.sellerAvatar}
              />
              <div>
                <div style={s.sellerName}>{item.seller_name}</div>
                <div style={s.sellerSub}>出品者プロフィールを見る</div>
              </div>
            </Link>

            {/* コメント */}
            <CommentList comments={comments} sellerId={item.userId} />
          </div>
        </div>
      </main>

      {/* スティッキーフッター（SP） */}
      <div style={s.stickyFooter}>
        <ActionButtons />
      </div>

      <PurchaseRequestModal
        isOpen={openPurchaseModal}
        onClose={() => setOpenPurchaseModal(false)}
        item={item}
        onSubmit={async (payload) => {
          try {
            const res = await api.post(
              "/flea-market/purchase-requests/create",
              payload,
            );
            if (res.data && res.data.id)
              navigate("/flea-market/transactions/" + res.data.id);
          } catch {
            alert("購入リクエストに失敗しました");
          }
        }}
      />

      <QuestionModal
        isOpen={showQModal}
        onClose={() => setShowQModal(false)}
        onSend={handleSendQuestion}
        roomTitle={item?.name || "質問"}
        roomSubtitle="出品者に質問・コメントを送る"
        shopAvatarUrl={item?.seller_icon_url || ""}
        shopOnline={false}
        item={item}
      />
    </div>
  );
};

export default Item;
