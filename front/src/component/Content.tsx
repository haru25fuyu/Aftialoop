import '../css/BasicContent.css';
import React from 'react';

import { Content } from '../types/Content';
import { useNavigate } from 'react-router-dom';

type Props = {
    item: Content;
};

export const BasicContent: React.FC<Props> = ({ item }) => {
    const navigate = useNavigate();
    const navigator = (url: string) => {
        navigate(/"");
    }
    return (
        <div key={item.id} className="contents_item" onClick={() =>navigator(item.url)}>
            < h3 > {item.name}</h3 >
            <p>価格: {item.price}円</p>
        </div >
    )
}

export default BasicContent;