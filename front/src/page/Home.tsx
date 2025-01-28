import React from 'react';
import { Link } from 'react-router-dom';
import '../css/Home.css';
import "swiper/swiper-bundle.css";

import { Header } from '../component/Header';
import { Content } from '../types/Content';
import { BasicContent } from '../component/Content';
import { ContentsList } from '../component/ContentsList';
import { Swiper, SwiperSlide } from "swiper/react";


const Home: React.FC = () => {
    const contentsList: Content[] = [
        {
            id: 1,
            name: "test",
            discription: "test",
            price: 100,
            point: 10,
            image_url: "http://localhost:3000/"
        },
        {
            id: 2,
            name: "test2",
            discription: "test2",
            price: 200,
            point: 20,
            image_url: "http://localhost:3000/"
        },
        {
            id: 3,
            name: "test3",
            discription: "test3",
            price: 300,
            point: 30,
            image_url: "http://localhost:3000/"
        },
        {
            id: 4,
            name: "test3",
            discription: "test3",
            price: 300,
            point: 30,
            image_url: "http://localhost:3000/"
        }
    ]
    return (
        <div>
            <Header />
            <div className='main'>
                <img className='main-image' src="/../data/IMG_3589.JPG" alt="Animaloop" />
                <div className='overlay'>
                    <h2>ANIMALOOP</h2>
                </div>
            </div>

            <div className='news'>
                <h3>お知らせ</h3>
                <ul>
                    <li><Link to="/news">2021/10/01　新商品の追加</Link></li>
                    <li><Link to="/news">2021/09/01　新商品の追加</Link></li>
                    <li><Link to="/news">2021/08/01　新商品の追加</Link></li>
                </ul>
            </div>

            <div className='recommend' style={{ height: '200px', width: '100%' }}>
                <Swiper
                    className="swiper-container"
                    direction="vertical" // 縦方向スライダーにする
                    spaceBetween={1}
                    slidesPerView={1}
                    pagination={{ clickable: true }}
                    loop={true}
                    speed={1000}
                >
                    {contentsList.map((item) => (
                        <SwiperSlide className="swiper-slide" key={item.id}>
                            <img src="/../data/IMG_3589.JPG" alt="" />
                            <div className='content'>
                                <h3>{item.name}</h3>
                                <p>{item.discription}</p>
                                <p>価格：{item.price}円</p>
                                <p>ポイント：{item.point}pt</p>
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>

            <div className='item' style={{ height: '300px', width: '100%', margin: 'auto' }}>
                <h3>商品</h3>
                <ul>
                    <li><Link to="/item">クワガタ</Link></li>
                    <li><Link to="/item">カブト</Link></li>
                    <li><Link to="/item">マット</Link></li>
                    <li><Link to="/item">ゼリー</Link></li>
                </ul>
                <ContentsList contents={contentsList} Component={BasicContent} slider={true} show_num={3} />
            </div>

            <div className='Description' style={{ height: '200px', width: '100%', margin: 'auto' }}>
                <div className='left'>
                    <h3>Animaloop</h3>
                    <p>いろいろやるよーーーー！！</p>
                </div>
                <div className='right'>
                    <Swiper
                        className="swiper-container"
                        direction="vertical" // 縦方向スライダーにする
                        spaceBetween={1}
                        slidesPerView={1}
                        pagination={{ clickable: true }}
                        loop={true}
                        speed={1000}
                    >
                        {contentsList.map((item) => (
                            <SwiperSlide className="swiper-slide" key={item.id}>
                                <img src="/../data/IMG_3589.JPG" alt="" />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>
        </div>
    );
};

export default Home;