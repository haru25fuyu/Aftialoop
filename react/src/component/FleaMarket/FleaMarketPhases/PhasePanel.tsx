import { FleaThreadResponse } from "../../../types/FleaMarket";
import { TxPhase } from "../../../conf/FleaMarket";

import WaitPaymentPanel from "./WaitPaymentPanel";
import PaymentPanel from "./PaymentPanel";
import ShippingPanel from "./ShippingPanel";
import CompletePanel from "./CompletePanel";
import CancelledPanel from "./CancelledPanel";
import UnknownPanel from "./UnknownPanel";

export default function PhasePanel({
    data,
    phase,
    myUserId,
    onChanged,
}: {
    data: FleaThreadResponse;
    phase: TxPhase;
    myUserId: string;
    onChanged: () => void;
}) {
    switch (phase) {
        case "WAIT_PAYMENT":
            return <WaitPaymentPanel data={data} myUserId={myUserId} onChanged={onChanged} />;
        case "PAYMENT":
            return <PaymentPanel data={data} myUserId={myUserId} onChanged={onChanged} />;
        case "SHIPPING":
            return <ShippingPanel data={data} myUserId={myUserId} onChanged={onChanged} />;
        case "SHIPPED":
            return <ShippingPanel data={data} myUserId={myUserId} onChanged={onChanged} />;
        case "RATED_BY_BUYER":
            return <ShippingPanel data={data} myUserId={myUserId} onChanged={onChanged} />;
        case "COMPLETE":
            return <CompletePanel data={data} onChanged={onChanged} />;
        case "CANCELLED":
            return <CancelledPanel data={data} />;
        default:
            return <UnknownPanel data={data} />;
    }
}
