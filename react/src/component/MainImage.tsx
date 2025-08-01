import React from 'react';
import '../css/MainImage.css';

type Props = {
    image: string;
    title: string;
};

export const MainImage: React.FC<Props> = ({image,title}) => {
    return (
        <div className='main'>
            <img className='main-image' src={image} />
            <div className='overlay'>
                <h1 className="title">{title}</h1>
            </div>
        </div>
    );
}

export default MainImage;