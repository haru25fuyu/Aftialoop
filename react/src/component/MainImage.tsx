import React from "react";
import { Image } from "lucide-react";
import { s } from "../styles/component/MainImage.styles";

type Props = { src?: string | null; alt?: string; };

const MainImage: React.FC<Props> = ({ src, alt = "商品画像" }) => (
  <div style={s.wrap}>
    {src ? (
      <img src={src} alt={alt} style={s.img} />
    ) : (
      <div style={s.placeholder}><Image size={40} /></div>
    )}
  </div>
);

export default MainImage;
