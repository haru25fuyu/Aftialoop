export type TxRole = "BUYER" | "SELLER";

export type FleaTransactionRow = {
  id: number;
  purchase_request_id: number;
  item_id: number;

  buyer_id: string;
  seller_id: string;

  address_id: number;

  shipping_method: "SELLER_CHOICE" | "ANONYMIZED" | "MEETUP";
  shipping_fee_type: "INCLUDED" | "COD";
  price_item: number;
  price_shipping: number;

  payment_provider?: string | null;
  payment_id?: string | null;
  payment_status: "NONE" | "PENDING" | "PAID" | "FAILED" | "CANCELLED";

  status:
    | "ACCEPTED"
    | "NEED_BUYER_CONFIRM"
    | "BUYER_CONFIRMED"
    | "PAID"
    | "SHIPPED"
    | "COMPLETED"
    | "CANCELLED";

  shipped_at?: string | null;
  completed_at?: string | null;

  created_at: string;
  updated_at: string;
};

export type FleaTransactionDetailResponse = {
  tx: FleaTransactionRow;

  // 仮：商品/相手情報もまとめて返す想定（後でサーバで足す）
  item?: { id: number; name: string; main_image_url?: string | null };
  counterparty?: { id: string; name: string; icon_url?: string | null };

  viewer_role: TxRole; // BUYER / SELLER
};
