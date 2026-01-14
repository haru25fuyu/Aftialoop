
// conf/api.ts (または api.ts の場所)
import api from "../conf/api"; // axiosインスタンスなどを想定
import { ShippingFeePref, ShippingMethod } from "../conf/FleaMarket";

// ... 他のAPI関数 ...

export async function acceptPurchaseRequest(
    reqId: number,
    params: {
        shipping_method: ShippingMethod;
        shipping_fee_type: ShippingFeePref;
        shipping_fee_amount: number;
        note_to_buyer?: string;
    }
) {
    // バックエンドの仕様に合わせてPOST
    const res = await api.post(`/flea-market/transactions/${reqId}/accept`, params);
    return res.data;
}