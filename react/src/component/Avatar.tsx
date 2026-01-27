// src/component/Avatar.tsx
import React from 'react';
import { CONFIG } from '../conf/config';

type AvatarProps = {
    src?: string | null; // 画像のURL (任意)
    name: string;        // ユーザー名 (イニシャル生成用、必須)
    className?: string;  // 追加のクラス名 (サイズ調整など)
};

// デフォルトのサイズクラス
const defaultSizeClass = 'w-10 h-10 text-sm';

export const Avatar: React.FC<AvatarProps> = ({ src, name, className = '' }) => {
    // 基本となるクラス（円形、サイズ、配置など）
    // className prop で渡されたサイズ指定などが優先されるように後置する
    const baseClassName = `rounded-full flex-shrink-0 flex items-center justify-center font-bold leading-none ${defaultSizeClass} ${className}`;

    // 画像URLがある場合 -> 画像を表示
    if (src) {
        return (
            <img
                src={CONFIG.BASE_URL + src}
                alt={name}
                className={`${baseClassName} object-cover`}
            />
        );
    }

    // 画像がない場合 -> 名前のイニシャルを表示
    // 空文字対策で '?' をデフォルトに
    const initial = name ? name.charAt(0).toUpperCase() : '?';

    return (
        <div
            // 良い感じのグラデーション背景を指定
            className={`${baseClassName} bg-gradient-to-br from-indigo-400 to-purple-500 text-white shadow-sm`}
            aria-label={name}
        >
            {initial}
        </div>
    );
};