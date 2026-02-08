import { ItemType } from "../types/Market";

// 2. 表示用ラベルを更新
export const TYPE_LABELS: Record<ItemType, string> = {
    INSECT: "昆虫",
    REPTILE: "爬虫類",
    AMPHIBIAN: "両生類",
    MAMMAL: "小動物・哺乳類",
    FISH: "魚類・水生生物",
    PLANT_ORNAMENTAL: "植物（観賞用）", // ビカク、多肉など
    PLANT_FOOD: "植物（野菜・果物）",   // 家庭菜園、種など
    SUPPLY: "飼育用品",
    ANIMAL: "生体", // 一応残しておく
};

// 3. アイコン定義（FleaItemCreatePage.tsx 等で使う用）
export const CATEGORY_OPTIONS = [
    { value: "INSECT", label: "昆虫", icon: "🪲" },
    { value: "REPTILE", label: "爬虫類", icon: "🦎" },
    { value: "AMPHIBIAN", label: "両生類", icon: "🐸" },
    { value: "MAMMAL", label: "小動物・哺乳類", icon: "🐹" },
    { value: "FISH", label: "魚類・水生生物", icon: "🐠" },
    { value: "PLANT_ORNAMENTAL", label: "植物（観賞用）", icon: "🌿" },
    { value: "PLANT_FOOD", label: "植物（野菜・果物）", icon: "🍅" },
    { value: "SUPPLY", label: "飼育用品", icon: "📦" },
    { value: "ANIMAL", label: "生体", icon: "🐾" },
];