import '../css/BasicContent.css';
import React from 'react';

import { Content } from '../types/Content';
import { useNavigate } from 'react-router-dom';

type Props = {
    item: Content;
};

const BasicContent: React.FC<Props> = ({ item }) => {
    const navigate = useNavigate();
    const navigator = (id: string) => {
        navigate("/payment?id=" + id);
    }
    return (
        <div
            key={item.id}
            className="contents_item flex flex-col items-center text-left h-[280px] overflow-hidden"
            onClick={() => navigator(item.id.toString())}
        >
            <h3 className="text-center">{item.name}</h3>
            <img src={item.image_url} alt={item.name} className="w-full max-w-xs h-[100px] object-contain" />
            <div className="w-full grid grid-cols-2 gap-2">
                <p className="text-gray-600">価格：</p>
                <p>{item.price}円</p>
                <p className="text-gray-600">ポイント：</p>
                <p>{item.point}</p>
            </div>

        </div>

    )

}

const LinkContent: React.FC<Props> = ({ item }) => {
    const navigate = useNavigate();
    const navigator = () => {
        navigate(item.image_url);
    }
    return (
        <div key={item.id} className="contents_item" onClick={() => navigator()}>
            {item.name}
        </div >
    )

}

const ImageContent: React.FC<Props> = ({ item }) => {
    return (
        <div key={item.id} className="flex flex-col items-start">
            <img src={item.image_url} alt={item.name} className="w-25 h-25 object-cover mb-4" />
            <div className="flex flex-col items-start">
                <b>{item.name}</b>
                <p>価格: {item.price}円</p>
                <p>ポイント: {item.point}</p>
            </div>
        </div>
    )
}

export default BasicContent;
export { LinkContent, ImageContent };