import React, { useMemo } from 'react';
import { CONFIG } from '../conf/config';
import { s } from '../styles/component/Avatar.styles';

type AvatarProps = {
  src?: string | null;
  name: string;
  size?: number;
};

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 40 }) => {
  const timestamp = useMemo(() => new Date().getTime(), []);
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const baseStyle = { ...s.avatarBase, width: size, height: size, fontSize: size * 0.35 };

  if (src) {
    return <img src={`${CONFIG.BASE_URL}${src}?v=${timestamp}`} alt={name} style={{ ...baseStyle, ...s.avatarImg }} />;
  }
  return (
    <div style={{ ...baseStyle, ...s.avatarInitial }} aria-label={name}>
      {initial}
    </div>
  );
};
