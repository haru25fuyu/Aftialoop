import React from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Scrollbar, Autoplay } from "swiper/modules";
import "../css/Home.css";
import "swiper/swiper-bundle.css";

import { Content } from "../types/Content";

import { Header } from "../component/Header";
import BasicContent from "../component/Content";
import { ContentsList } from "../component/ContentsList";
import { Footer } from "../component/Footer.tsx";
import MainImage from "../component/MainImage.tsx";

const Home: React.FC = () => {
    const contentsList: Content[] = [
        {
            id: "1",
            name: "test",
            discription: "test",
            price: 100,
            point: 10,
            image_url: "/data/Logo.JPG",
        },
        {
            id: "2",
            name: "test2",
            discription: "test2",
            price: 200,
            point: 20,
            image_url: "/data/Logo.JPG",
        },
        {
            id: "3",
            name: "test3",
            discription: "test3",
            price: 300,
            point: 30,
            image_url: "/data/Logo.JPG",
        },
        {
            id: "4",
            name: "test3",
            discription: "test3",
            price: 300,
            point: 30,
            image_url: "/data/Logo.JPG",
        },
    ];
    function scrollCarousel() {
        let scrollIndex = 0;
        const carousel = document.getElementById("carousel");
        if (!carousel) return;
        if (carousel.querySelector("img") === null) return;
        const img = carousel.querySelector("img");
        if (!img) return;
        const itemWidth = img.clientWidth + 20; // 画像幅 + マージン
        if (!carousel.parentElement) return;
        const visibleItems = Math.floor(
            carousel.parentElement.offsetWidth / itemWidth
        );
        const totalItems = carousel.children.length;

        scrollIndex++;

        if (scrollIndex > totalItems - visibleItems) {
            scrollIndex = 0; // ループさせたい場合
        }

        carousel.style.transform = `translateX(-${scrollIndex * itemWidth}px)`;
    }
    return (
        <div>
            <header>
                <Header />
                <MainImage image={"/data/IMG_3589.JPG"} title={"ANIMALOOP"} />
            </header>
            <section className="news">
                <h2>お知らせ情報</h2>
                <div className="news-list">
                    <ul>
                        <li>
                            <span className="new">NEW!</span>
                            <span className="time">2025/5/1</span>
                            お知らせ　テキトーにお知らせを追加して
                        </li>
                        <li>
                            <span className="time">2025/5/1</span>
                            お知らせ　テキトーにお知らせを追加してちょん
                        </li>
                        <li>
                            <span className="time">2025/5/1</span>
                            お知らせ　テキトーにお知らせを追加してちょん
                        </li>
                        <li>
                            <span className="time">2025/5/1</span>
                            お知らせ　テキトーにお知らせを追加してちょん
                        </li>
                        <li>
                            <span className="time">2025/5/1</span>
                            お知らせ　テキトーにお知らせを追加してちょん
                        </li>
                    </ul>
                </div>
                <button>READ MORE</button>
            </section>
            <section className="recommend">
                <div className="wrap">
                    <div className="space"></div>
                    <div className="content">
                        <h2>おすすめ商品</h2>
                        <h3>（料金 ￥0,000）</h3>
                        <p>
                            吾輩は猫である。名前はまだない。
                            <br />
                            どこで生まれたかトンと検討がつかぬ
                            <br />
                            なんでも薄暗いじめじめした所でにゃーにゃ―
                            <br />
                            泣いていたことだけは記憶している。
                            <br />
                        </p>
                        <button className="next-button" onClick={scrollCarousel}>
                            ▼
                        </button>
                    </div>
                </div>
            </section>
            <section className="product-section">
                <h2>商品</h2>
                <ul className="category-list">
                    <li>カテゴリー1</li>
                    <li>カテゴリー2</li>
                    <li>カテゴリー3</li>
                    <li>カテゴリー4</li>
                    <li>カテゴリー5</li>
                </ul>
                <div className="carousel-container">
                    <div className="carousel" id="carousel">
                        <a href="product1.html">
                            <img src="/data/Logo.JPG" alt="商品1" />
                        </a>
                        <a href="product2.html">
                            <img src="/data/Logo.JPG" alt="商品2" />
                        </a>
                        <a href="product3.html">
                            <img src="/data/Logo.JPG" alt="商品3" />
                        </a>
                        <a href="product4.html">
                            <img src="/data/Logo.JPG" alt="商品4" />
                        </a>
                        <a href="product5.html">
                            <img src="/data/Logo.JPG" alt="商品5" />
                        </a>
                        <a href="product1.html">
                            <img src="/data/Logo.JPG" alt="商品1" />
                        </a>
                        <a href="product2.html">
                            <img src="/data/Logo.JPG" alt="商品2" />
                        </a>
                        <a href="product3.html">
                            <img src="/data/Logo.JPG" alt="商品3" />
                        </a>
                        <a href="product4.html">
                            <img src="/data/Logo.JPG" alt="商品4" />
                        </a>
                        <a href="product5.html">
                            <img src="/data/Logo.JPG" alt="商品5" />
                        </a>
                        {/** 必要ならもっと商品追加可能 */}
                    </div>
                    <button className="next-button2" onClick={scrollCarousel}>
                        ▶
                    </button>
                </div>
            </section>
            <section className="aftia wrap">
                <div className="content">
                    <h2>AFTIA</h2>
                    <p>
                        吾輩は猫である。名前はまだない。
                        <br />
                        どこで生まれたかトンと検討がつかぬ
                        <br />
                        なんでも薄暗いじめじめした所でにゃーにゃ―
                        <br />
                        泣いていたことだけは記憶している。
                        <br />
                    </p>
                </div>
                <div className="space"></div>
            </section>
            <section className="contact">
                <div className="text">
                    <h2>お問い合わせ</h2>
                    <p>お問い合わせはこちら的な文章がはいりますん。</p>
                </div>
                <div className="icon">
                    <button>お問い合わせはこちら</button>
                </div>
            </section>
            <section className="gallery">
                <div className="container">
                    <div className="swiper infinite-slider">
                        <Swiper
                            modules={[Scrollbar, Autoplay]}
                            className="swiper-container"
                            spaceBetween={0}
                            slidesPerView={5}
                            scrollbar={{ draggable: true }}
                            loop={true}
                            speed={500}
                            autoplay={{
                                delay: 3000,
                                disableOnInteraction: false,
                            }}
                        >
                            <SwiperSlide className="swiper-slide">
                                <img src="/data/Logo.JPG" alt="画像1" />
                            </SwiperSlide>
                            <SwiperSlide className="swiper-slide">
                                <img src="/data/Logo.JPG" alt="画像2" />
                            </SwiperSlide>
                            <SwiperSlide className="swiper-slide">
                                <img src="/data/Logo.JPG" alt="画像3" />
                            </SwiperSlide>
                            <SwiperSlide className="swiper-slide">
                                <img src="/data/Logo.JPG" alt="画像4" />
                            </SwiperSlide>
                            <SwiperSlide className="swiper-slide">
                                <img src="/data/Logo.JPG" alt="画像5" />
                            </SwiperSlide>
                            <SwiperSlide className="swiper-slide">
                                <img src="/data/Logo.JPG" alt="画像6" />
                            </SwiperSlide>
                            <SwiperSlide className="swiper-slide">
                                <img src="/data/Logo.JPG" alt="画像7" />
                            </SwiperSlide>
                            <SwiperSlide className="swiper-slide">
                                <img src="/data/Logo.JPG" alt="画像8" />
                            </SwiperSlide>
                        </Swiper>
                    </div>
                </div>
            </section>{" "}
        </div>
    );
};

export default Home;
