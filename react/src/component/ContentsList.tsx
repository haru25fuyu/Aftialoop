import '../css/ContentsList.css';
import { Content } from '../types/Content';
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/swiper-bundle.css";

type Props = {
  contents: Content[];
  Component: React.ComponentType<{ item: Content }>;
  slider?: boolean;
  vertical?: boolean;
  show_num?: number;
};

export const ContentsList: React.FC<Props> = ({ contents, Component, show_num = 1, slider = false, vertical = false }) => {
  if (slider) {
    return (
      <div className='slider'>
        <Swiper
          className="swiper-container"
          {...(vertical ? { direction: "vertical" } : {})} // 縦方向スライダーにする
          spaceBetween={1}
          slidesPerView={show_num}
          pagination={{ clickable: true }}
          loop={true}
          speed={1000}
        >
          {contents.map((item) => (
            <SwiperSlide className="swiper-slide" key={item.id} ><Component item={item} /></SwiperSlide>
          ))}
        </Swiper>
      </div>
    );
  } else {
    return (
      <div className="contents-list flex flex-wrap justify-center gap-4">
        {contents.map((item) => (
          <Component key={item.id} item={item} className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4" />
        ))}
      </div>
    )
  }
};

export default ContentsList;