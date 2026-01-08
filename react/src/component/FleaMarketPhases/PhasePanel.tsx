import React from "react";
import { FleaTransactionDetailResponse } from "../../types/FleaMarket";
import { TxPhase } from "../../conf/FleaMarket";

import SellerSetTermsPanel from "./SellerSetTermsPanel";
import BuyerWaitTermsPanel from "./BuyerWaitTermsPanel";
import BuyerConfirmPanel from "./BuyerConfirmPanel";
import PaymentPanel from "./PaymentPanel";
import ShippingPanel from "./ShippingPanel";
import CompletePanel from "./CompletePanel";
import CancelledPanel from "./CancelledPanel";
import UnknownPanel from "./UnknownPanel";

export default function PhasePanel({
    data,
    phase,
    onChanged,
}: {
    data: FleaTransactionDetailResponse;
    phase: TxPhase;
    onChanged: () => void;
}) {
    switch (phase) {
        case "SELLER_SET_TERMS":
            return <SellerSetTermsPanel data={data} onChanged={onChanged} />;
        case "BUYER_WAIT_TERMS":
            return <BuyerWaitTermsPanel data={data} onChanged={onChanged} />;
        case "BUYER_CONFIRM":
            return <BuyerConfirmPanel data={data} onChanged={onChanged} />;
        case "PAYMENT":
            return <PaymentPanel data={data} onChanged={onChanged} />;
        case "SHIPPING":
            return <ShippingPanel data={data} onChanged={onChanged} />;
        case "COMPLETE":
            return <CompletePanel data={data} onChanged={onChanged} />;
        case "CANCELLED":
            return <CancelledPanel data={data} />;
        default:
            return <UnknownPanel data={data} />;
    }
}
