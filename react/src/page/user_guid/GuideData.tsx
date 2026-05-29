import { ProhibitedBehavior } from "./ProhibitedBehavior";
import { ProhibitedItems } from "./ProhibitedItems";
// TODO: はじめての方へ → BeginnerGuide コンポーネント実装後に追加

export const GUIDE_DATA = [
  { id: "prohibited-behavior", title: "禁止されている行為",  content: <ProhibitedBehavior /> },
  { id: "prohibited-items",    title: "禁止されている出品物", content: <ProhibitedItems /> },
];