import React from 'react';
import { useLocation } from "react-router-dom";

import { Content } from '../types/Content.ts';
import { ContentsList } from '../component/ContentsList.tsx';
import { ImageContent } from '../component/Content.tsx';
import Header from '../component/Header.tsx';
import MainImage from '../component/MainImage.tsx';
import api from '../conf/api.ts';

import '../css/List.css';

const List: React.FC = () => {
    const search = useLocation().search;
    const query = new URLSearchParams(search);
    const type = query.get('type');

    const contents: Content[] = [];
    api.get(`list?type=${type}`).then((res) => {
        contents.push(res.data);
        console.log(contents);
    }).catch((err) => {
        console.error(err);
    });

    const Contents: Content[] = [
        { id: '1', name: '商品1', discription: "商品1の説明", price: 1000,point:1000, image_url: '/data/Logo.JPG' },
        { id: '2', name: '商品2', discription: "商品1の説明", price: 2000,point:2000, image_url: '/data/Logo.JPG' },
        { id: '3', name: '商品3', discription: "商品1の説明", price: 3000,point:3000, image_url: '/data/Logo.JPG' },
        { id: '4', name: '商品4', discription: "商品1の説明", price: 4000,point:4000, image_url: '/data/Logo.JPG' },
        { id: '5', name: '商品5', discription: "商品1の説明", price: 5000,point:5000, image_url: '/data/Logo.JPG' },
        { id: '6', name: '商品6', discription: "商品1の説明", price: 6000,point:6000, image_url: '/data/Logo.JPG' },
        { id: '7', name: '商品7', discription: "商品1の説明", price: 7000,point:7000, image_url: '/data/Logo.JPG' },
        { id: '8', name: '商品8', discription: "商品1の説明", price: 8000,point:8000, image_url: '/data/Logo.JPG' },
        { id: '9', name: '商品9', discription: "商品1の説明", price: 9000,point:9000, image_url: '/data/Logo.JPG' },
        { id: '10', name: '商品10', discription: "商品1の説明", price: 10000,point:10000, image_url: '/data/Logo.JPG' },
    ];

    return (
        <div>
            <header>
                <Header />
                <MainImage image={"/data/IMG_3589.JPG"} title={"GOODS LIST"} />
            </header>
            <main>
                <ContentsList contents={Contents} Component={ImageContent} />
            </main>

        </div>
    );
};

export default List;