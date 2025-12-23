import { Customer } from "../types/Content";

interface PriceWithPerksProps {
    price: number;
    user?: Customer | null; // 必要ならちゃんとした User 型に変える
    num: number;              // 何倍で割引を乗算するか
    showShipping?: boolean;   // 「送料込み」を出すかどうか
    className?: string;
}

export const PriceWithPerks: React.FC<PriceWithPerksProps> = ({
    price,
    user,
    num,
    showShipping = true,
    className = "",
}) => {
    const basePrice = price;

    let discount = 0;
    if (user && user.point > 0) {
        const usablePoint = Math.min(user.point, basePrice);
        discount = Math.floor(usablePoint * num);
    }

    const hasDiscount = discount > 0;
    const finalPrice = basePrice - discount;
    const bigDiscount = discount >= 100;

    return (
        <div className={className}>
            {/* メイン価格 */}
            <p className="text-gray-900 font-bold mt-1 text-sm">
                {(hasDiscount ? finalPrice : basePrice).toLocaleString()}円
            </p>

            {hasDiscount ? (
                <>
                    {/* 元値（取り消し線） */}
                    <p className="text-gray-400 line-through text-xs">
                        {basePrice.toLocaleString()}円
                    </p>

                    {/* サブスク優待バッジ */}
                    <p className="mt-0.5">
                        <span className="inline-block px-1.5 py-[1px] rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-semibold tracking-wide">
                            サブスク優待
                        </span>
                    </p>

                    {/* 割引額表示 */}
                    <p
                        className={
                            bigDiscount
                                ? "text-emerald-600 text-[11px] mt-0.5 font-semibold"
                                : "text-gray-500 text-[11px] mt-0.5"
                        }
                    >
                        ポイント利用で{discount.toLocaleString()}円おトク
                    </p>
                </>
            ) : (
                <p className="text-gray-500 text-[11px] mt-0.5">
                    サブスクポイント利用でおトクに
                </p>
            )}

            {showShipping && (
                <p className="text-gray-500 font-medium mt-0.5 text-[11px]">
                    送料込み
                </p>
            )}
        </div>
    );
};
