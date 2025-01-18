import React from 'react';
import { useLocation } from "react-router-dom";

import { Content } from '../types/Content.ts';
import { ContentsList } from '../component/ContentsList.tsx';
import {BasicContent} from '../component/Content.tsx';
import axios from 'axios';

const List : React.FC = () => {
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

    return (
        <div>
            <ContentsList contents={contents} Component={BasicContent} />
        </div>
    );
};

export default List;