import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Scrollbar, Autoplay } from "swiper/modules";
import "swiper/swiper-bundle.css";
import { Header } from "../component/Header";

const Home: React.FC = () => (
  <div>
    <Header />
    <section>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px" }}>
        <Swiper
          modules={[Scrollbar, Autoplay]}
          scrollbar={{ draggable: true }}
          loop
          speed={500}
          autoplay={{ delay: 3000, disableOnInteraction: false }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <SwiperSlide key={i}>
              <img src="/data/Logo.JPG" alt={`画像${i}`} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  </div>
);

export default Home;
