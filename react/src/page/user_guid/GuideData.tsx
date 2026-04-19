import { ProhibitedBehavior } from './ProhibitedBehavior';
import {ProhibitedItems} from "./ProhibitedItems"

export const GUIDE_DATA = [
  //{ id: 'beginner', title: 'はじめての方へ', content: <BeginnerGuide /> },
  { id: 'prohibited-behavior', title: '禁止されている行為', content: <ProhibitedBehavior /> }, // 追加
  { id: 'prohibited-items', title: '禁止されている出品物', content: <ProhibitedItems /> },
];