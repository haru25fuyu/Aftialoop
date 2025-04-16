import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';

import { Header } from '../component/Header';

import api from '../conf/api';


type Address = {
    ID: string,
    postCode: string,
    pref: string,
    address1: string
    address2: string
}

const EditAddress: React.FC = () => {
    const { register, handleSubmit, setValue, formState: { errors } } = useForm<Inputs>();
    const navigate = useNavigate();
    let address_list: Address[] = [];

    useEffect(() => {
        api.get('/address/list')
            .then((res) => {
                console.log(res.data);
                address_list = res.data.address_list;
            })
            .catch((err) => {
                console.error(err);
            });
    }, []);

    const onSubmit = async (data: Address) => {
        //データのpostCoswにハイフンが含まれている場合、ハイフンを削除
        data.postCode = data.postCode.replace(/-/g, '');
        console.log(data);
        api.post('/address/edit', data)
            .then((res) => {
                console.log(res.data);
                const expiresIn = res.data.expires_in;
                // 現在時刻にexpires_in（秒）を加えて、期限を計算
                const expirationTime = Date.now() / 1000 + expiresIn;  // 秒単位で保存

                localStorage.setItem('token', res.data.access_token);
                localStorage.setItem('expirationTime', expirationTime);

                navigate('/');
            })
            .catch((err) => {
                console.error(err);
            });
    };
    return (
        <div>
            <header>
                <Header />
            </header>
            <main>
                <div className="flex justify-center items-center mt-8 max-md:mt-0">
                    <div className="w-full max-w-md p-5space-y-6 bg-white rounded shadow-md">
                        <h2 className="text-2xl font-bold text-center text-gray-900">お届け先の設定</h2>
                        <div className="space-y-6">
                            {address_list.map((address) => {
                            }}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">郵便番号</label>

                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700" >都道府県</label>

                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">住所</label>

                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">番地・建物名</label>

                            </div>
                            <div>
                               
                            </div>
                        </div>
                        <hr />
                    </div>
                </div>
            </main >
        </div>

    );
};

export default EditAddress;