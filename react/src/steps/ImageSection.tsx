import React from "react";
import InlineSortableImages from "../component/InlineSortableImages"; // パスは環境に合わせて調整してください
import { ImageAsset } from "../types/FleaMarket";

type ImageSectionProps = {
    images: ImageAsset[];
    onChange: (images: ImageAsset[]) => void;
    onOpenAdd: () => void;
    error?: string;
};

export function ImageSection({ images, onChange, onOpenAdd, error }: ImageSectionProps) {
    return (
        <section className="bg-white p-5 md:p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-bold text-gray-700">
                    商品画像 <span className="text-red-500 ml-1">*</span>
                </label>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        {images.length} / 10
                    </span>
                    <button
                        type="button"
                        onClick={onOpenAdd}
                        disabled={images.length >= 10}
                        className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ＋画像を追加
                    </button>
                </div>
            </div>

            {error && (
                <p className="text-sm text-red-500 mb-3 bg-red-50 p-3 rounded-lg flex items-center gap-2">
                    ⚠️ {error}
                </p>
            )}

            <div className="min-h-[120px]">
                <InlineSortableImages
                    files={images}
                    onChange={onChange}
                    onOpenAdd={onOpenAdd}
                    max={10}
                />
            </div>
        </section>
    );
}