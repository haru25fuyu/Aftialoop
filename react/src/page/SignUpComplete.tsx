import React from 'react';
import { Header } from '../component/Header.tsx';
import {Footer} from '../component/Footer.tsx';


const SignUpConplete: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen">
            <header>
                <Header />
            </header>

            <div className="flex-grow flex justify-center items-center mt-10 max-md:mt-0">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md">    
                    <h2 className="text-2xl font-bold text-center text-gray-900">仮登録完了</h2>
                    <p className="text-center">メールを送信しました。</p>
                    <p className="text-center">メール内のリンクをクリックして登録を完了してください。</p>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default SignUpConplete;