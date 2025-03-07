import React from 'react';
import { useLocation } from "react-router-dom";
import axios from 'axios';

import { Content } from '../types/Content.ts';
import { ContentsList } from '../component/ContentsList.tsx';
import BasicContent from '../component/Content.tsx';
import Header from '../component/Header.tsx';
import MainImage from '../component/MainImage.tsx';

import '../css/List.css';

const List: React.FC = () => {
    const search = useLocation().search;
    const query = new URLSearchParams(search);
    const type = query.get('type');

    const contents: Content[] = [];
    axios.get(`http://localhost:3000/list?type=${type}`).then((res) => {
        contents.push(res.data);
        console.log(contents);
    }).catch((err) => {
        console.error(err);
    });

    const Contents: Content[] = [
        { id: '1', name: '商品1', price: 1000, image_url: 'https://placehold.jp/150x150.png' },
        { id: '2', name: '商品2', price: 2000, image_url: 'https://placehold.jp/150x150.png' },
        { id: '3', name: '商品3', price: 3000, image_url: 'https://placehold.jp/150x150.png' },
        { id: '4', name: '商品4', price: 4000, image_url: 'https://placehold.jp/150x150.png' },
        { id: '5', name: '商品5', price: 5000, image_url: 'https://placehold.jp/150x150.png' },
        { id: '6', name: '商品6', price: 6000, image_url: 'https://placehold.jp/150x150.png' },
        { id: '7', name: '商品7', price: 7000, image_url: 'https://placehold.jp/150x150.png' },
        { id: '8', name: '商品8', price: 8000, image_url: 'https://placehold.jp/150x150.png' },
        { id: '9', name: '商品9', price: 9000, image_url: 'https://placehold.jp/150x150.png' },
        { id: '10', name: '商品10', price: 10000, image_url: 'https://placehold.jp/150x150.png' },
    ];

    return (
        <div>
            <header>
                <Header />
                <MainImage image={"/../data/IMG_3589.JPG"} title={"GOODS LIST"} />
            </header>
            <main>
                <ContentsList contents={Contents} Component={BasicContent} />
            </main>

        </div>
    );
};

export default List;