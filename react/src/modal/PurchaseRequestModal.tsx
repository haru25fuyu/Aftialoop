import React, { useEffect, useState } from "react";
import { Address } from "../types/Address";

import SelectAddressModal from "./SelectAddressModal";
import { fetchAddress } from "../conf/function";
import api from "../conf/api";
import { ShippingMethod, ShippingFeePref } from "../conf/FleaMarket";
import LoginModal from "./Login";
import { LoadingButton } from "../component/LoadingButton";


export type PurchaseRequestPayload = {
    item_id: string | number;
    address_id: string | number;
    shipping_method_pref: ShippingMethod;
    shipping_fee_pref: ShippingFeePref;
    note?: string;
};

type Props = {
    open: boolean;
    itemId: string | number;

    onClose: () => void;
    onSubmit: (payload: PurchaseRequestPayload) => Promise<void> | void;

    submitting?: boolean;
};

const cn = (...xs: Array<string | false | undefined | null>) =>
    xs.filter(Boolean).join(" ");

export default function PurchaseRequestModal({
    open,
    itemId,
    onClose,
    onSubmit,
    submitting,
}: Props) {
    const [shippingMethodPref, setShippingMethodPref] =
        useState<ShippingMethod>(ShippingMethod.SELLER_CHOICE);
    const [shippingFeePref, setShippingFeePref] =
        useState<ShippingFeePref>(ShippingFeePref.OK_EITHER);
    const [note, setNote] = useState("");

    const [localSubmitting, setLocalSubmitting] = useState(false);
    const busy = Boolean(submitting ?? localSubmitting);

    const [isAddressOpen, setIsAddressOpen] = useState(false);
    const [address, setAddress] = useState<Address | null>(null);

    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [reloadTrigger, setReloadTrigger] = useState(0);

    const [loadingCustomer, setLoadingCustomer] = useState(false);

    const handleLoginSuccess = () => setReloadTrigger((prev) => prev + 1);

    // 背景スクロール停止（iOS含む）
    useEffect(() => {
        if (!open) return;

        const body = document.body;
        const html = document.documentElement;
        const scrollY = window.scrollY;

        const prevBodyOverflow = body.style.overflow;
        const prevBodyPosition = body.style.position;
        const prevBodyTop = body.style.top;
        const prevBodyWidth = body.style.width;
        const prevHtmlOverflow = html.style.overflow;

        html.style.overflow = "hidden";
        body.style.overflow = "hidden";
        body.style.position = "fixed";
        body.style.top = `-${scrollY}px`;
        body.style.width = "100%";

        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
            body.style.position = prevBodyPosition;
            body.style.top = prevBodyTop;
            body.style.width = prevBodyWidth;
            window.scrollTo(0, scrollY);
        };
    }, [open]);

    // open時の初期ロード
    useEffect(() => {
        if (!open) return;

        setLoadingCustomer(true);
        setIsAddressOpen(false);

        api.post("customer")
            .then(async (res) => {
                if (!res.data?.user) {
                    setLoginModalOpen(true);
                    setAddress(null);
                    return;
                }
                const addr = await fetchAddress(res.data.address || "");
                setAddress(addr ?? null);

                setShippingMethodPref(ShippingMethod.SELLER_CHOICE);
                setShippingFeePref(ShippingFeePref.OK_EITHER);
                setNote("");
            })
            .catch((err) => {
                setLoginModalOpen(true);
                setAddress(null);
                console.error(err);
            })
            .finally(() => {
                setLoadingCustomer(false);
            });
    }, [open, reloadTrigger]);

    const canSubmit = open && !busy && address !== null;

    async function handleSubmit() {
        if (!canSubmit) return;

        const payload: PurchaseRequestPayload = {
            item_id: itemId,
            address_id: (address?.id as string | number) ?? "",
            shipping_method_pref: shippingMethodPref,
            shipping_fee_pref: shippingFeePref,
            note: note.trim() ? note.trim() : undefined,
        };

        try {
            setLocalSubmitting(true);
            await onSubmit(payload);
            onClose();
        } finally {
            setLocalSubmitting(false);
        }
    }

    // ESCで閉じる
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !busy) onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, busy, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[1000]">
            {/* overlay */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={() => {
                    if (!busy) onClose();
                }}
            />

            {/* dialog wrapper */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
                {/* dialog */}
                <div
                    className="w-full max-w-[560px] rounded-2xl bg-white shadow-xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                >
                    {/* header */}
                    <div className="flex items-center justify-between border-b px-5 py-4">
                        <div className="min-w-0">
                            <div className="text-lg font-semibold">購入申請</div>
                            <div className="text-sm text-gray-500">
                                申請内容を送信し、出品者の承諾後に金額が確定します。
                            </div>
                        </div>
                        <button
                            className={cn(
                                "ml-4 flex h-9 w-9 items-center justify-center rounded-full",
                                busy
                                    ? "text-gray-300"
                                    : "text-gray-500 hover:bg-gray-100"
                            )}
                            onClick={() => {
                                if (!busy) onClose();
                            }}
                            disabled={busy}
                            aria-label="閉じる"
                        >
                            ✕
                        </button>
                    </div>

                    {/* body (scroll area) */}
                    <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-5">
                        {/* address */}
                        <div className="rounded-xl border p-4">
                            <div className="mb-2 text-sm font-medium">お届け先</div>

                            {loadingCustomer ? (
                                <div className="text-sm text-gray-500">読み込み中…</div>
                            ) : address ? (
                                <>
                                    <p className="text-sm font-medium">{address?.name}</p>
                                    <p className="text-sm text-gray-600">{address?.post_code}</p>
                                    <p className="text-sm text-gray-600">
                                        {address?.address1} {address?.address2} {address?.address3}
                                    </p>

                                    <button
                                        className={cn(
                                            "mt-3 px-4 py-2 rounded-xl text-sm border",
                                            busy
                                                ? "text-gray-300"
                                                : "bg-gray-50 hover:bg-gray-100 text-gray-800"
                                        )}
                                        onClick={() => setIsAddressOpen(true)}
                                        disabled={busy}
                                    >
                                        お届け先を選ぶ
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="text-sm text-gray-600">
                                        お届け先が未設定です。
                                    </div>
                                    <button
                                        className={cn(
                                            "mt-3 px-4 py-2 rounded-xl text-sm border",
                                            busy
                                                ? "text-gray-300"
                                                : "bg-gray-50 hover:bg-gray-100 text-gray-800"
                                        )}
                                        onClick={() => setIsAddressOpen(true)}
                                        disabled={busy}
                                    >
                                        お届け先を設定する
                                    </button>
                                </>
                            )}

                            <SelectAddressModal
                                isOpen={isAddressOpen}
                                onClose={() => setIsAddressOpen(false)}
                                onSelect={(addr) => setAddress(addr)}
                            />
                        </div>

                        {/* shipping method pref */}
                        <div>
                            <div className="mb-2 text-sm font-medium">配送方法の希望</div>
                            <div className="grid gap-2 sm:grid-cols-3">
                                <RadioCard
                                    disabled={busy}
                                    checked={shippingMethodPref === ShippingMethod.SELLER_CHOICE}
                                    title="おまかせ"
                                    desc="出品者の都合に合わせます"
                                    onClick={() => setShippingMethodPref(ShippingMethod.SELLER_CHOICE)}
                                />
                                <RadioCard
                                    disabled={busy}
                                    checked={shippingMethodPref === ShippingMethod.DELIVERY}
                                    title="配送希望"
                                    desc="対応できる場合のみ"
                                    onClick={() => setShippingMethodPref(ShippingMethod.DELIVERY)}
                                />
                                {/* 匿名配送は後で戻すならこれを復活
                                <RadioCard
                                  disabled={busy}
                                  checked={shippingMethodPref === "ANONYMIZED"}
                                  title="匿名配送希望"
                                  desc="対応できる場合のみ"
                                  onClick={() => setShippingMethodPref("ANONYMIZED")}
                                />
                                */}
                                <RadioCard
                                    disabled={busy}
                                    checked={shippingMethodPref === ShippingMethod.MEETUP}
                                    title="手渡し希望"
                                    desc="同エリア時のみ"
                                    onClick={() => setShippingMethodPref(ShippingMethod.MEETUP)}
                                />
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                ※実際の配送方法は出品者承諾時に確定します。
                            </div>
                        </div>

                        {/* shipping fee pref */}
                        <div>
                            <div className="mb-2 text-sm font-medium">送料の希望</div>
                            <div className="grid gap-2 sm:grid-cols-3">
                                <RadioCard
                                    disabled={busy}
                                    checked={shippingFeePref === ShippingFeePref.OK_EITHER}
                                    title="どちらでもOK"
                                    desc="条件提示に従います"
                                    onClick={() => setShippingFeePref(ShippingFeePref.OK_EITHER)}
                                />
                                <RadioCard
                                    disabled={busy}
                                    checked={shippingFeePref === ShippingFeePref.INCLUDED}
                                    title="送料込み希望"
                                    desc="送料を上乗せ提示してほしい"
                                    onClick={() => setShippingFeePref(ShippingFeePref.INCLUDED)}
                                />
                                <RadioCard
                                    disabled={busy}
                                    checked={shippingFeePref === ShippingFeePref.COD}
                                    title="着払い希望"
                                    desc="受取時に送料を支払う"
                                    onClick={() => setShippingFeePref(ShippingFeePref.COD)}
                                />
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                ※「希望」であり確定ではありません。出品者が可否と金額条件を提示します。
                            </div>
                        </div>

                        {/* note */}
                        <div>
                            <div className="mb-2 text-sm font-medium">備考（任意）</div>
                            <textarea
                                className={cn(
                                    "w-full rounded-xl border px-3 py-3 text-sm",
                                    busy && "opacity-60"
                                )}
                                rows={3}
                                placeholder="例：午前中希望、置き配NG など"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                disabled={busy}
                                maxLength={500}
                            />
                            <div className="mt-1 text-right text-xs text-gray-400">
                                {note.length}/500
                            </div>
                        </div>
                    </div>

                    {/* footer */}
                    <div className="border-t px-5 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-gray-500 sm:flex-1 sm:min-w-0">
                                送信後：取引ページで出品者が送料・配送を確定 → 購入者が同意して決済
                            </div>

                            <div className="flex items-center justify-end gap-2 shrink-0">
                                <button
                                    className={cn(
                                        "rounded-xl border px-4 py-2 text-sm whitespace-nowrap",
                                        busy ? "text-gray-300" : "text-gray-700 hover:bg-gray-50"
                                    )}
                                    onClick={() => {
                                        if (!busy) onClose();
                                    }}
                                    disabled={busy}
                                >
                                    キャンセル
                                </button>

                                <LoadingButton
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-white whitespace-nowrap bg-black hover:bg-gray-900 shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none transition-all"
                                    onClick={handleSubmit}
                                    disabled={!canSubmit}
                                    loading={busy}
                                >
                                    購入申請を送信
                                </LoadingButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* login modal */}
            <LoginModal
                isOpen={loginModalOpen}
                onClose={() => { setLoginModalOpen(false); }}
                onLoginSuccess={handleLoginSuccess}
                showCloseButton={true}
            />
        </div>
    );
}

function RadioCard({
    checked,
    title,
    desc,
    onClick,
    disabled,
}: {
    checked: boolean;
    title: string;
    desc: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={() => {
                if (!disabled) onClick();
            }}
            className={cn(
                "rounded-2xl border p-3 text-left transition",
                checked ? "border-black bg-gray-50" : "border-gray-200 hover:bg-gray-50",
                disabled && "opacity-60 pointer-events-none"
            )}
            aria-pressed={checked}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="text-sm font-semibold">{title}</div>
                    <div className="mt-1 text-xs text-gray-500">{desc}</div>
                </div>
                <div
                    className={cn(
                        "mt-0.5 h-4 w-4 rounded-full border",
                        checked ? "border-black bg-black" : "border-gray-300 bg-white"
                    )}
                />
            </div>
        </button>
    );
}
