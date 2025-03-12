import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

import { Header } from '../component/Header';

import { NODE_API } from '../conf/config';

type Inputs = {
    postCode: string,
    pref: string,
    address1: string
}

interface AddressFormData {
    postCode: string;
    pref: string;
    address1: string;
}

const EditAddress: React.FC = () => {
    const { register, handleSubmit, formState: { errors } } = useForm<Inputs>();
    const navigate = useNavigate();
    const [formData, setFormData] = useState<AddressFormData>({
        postCode: '',
        pref: '',
        address1: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value
        }));
    };

    const complementAddress = () => {
        if (typeof window !== 'undefined' && window.AjaxZip3) {
            // AjaxZip3のzip2addr関数を呼び出し、住所を補完する
            window.AjaxZip3.zip2addr(
                'postCode',
                '', // 通常は空文字で問題ない
                'pref', // 都道府県
                'address1',  // 市区町村や番地
                'address2',  // 番地以降の住所
                'address3'   // 住所が補完された後、フォーカスを移す先
            );
            // 住所が補完された後、Reactの状態を更新する
            setFormData((prevData) => ({
                ...prevData,
                pref: (document.getElementById('pref') as HTMLInputElement).value,
                address1: (document.getElementById('address1') as HTMLInputElement).value
            }));
        }
    };

    const onSubmit = async (data: Inputs) => {
        //データのpostCoswにハイフンが含まれている場合、ハイフンを削除
        data.postCode = data.postCode.replace(/-/g, '');
        console.log(data);
        axios.post(NODE_API.URL + '/edit/address', data, { headers: NODE_API.HEADERS })
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
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">郵便番号<span className='text-red-500'>※必須</span></label>
                                {errors.postCode && <p className="mt-2 text-sm text-red-600">{errors.postCode.message}</p>}
                                <input
                                    type="text"
                                    {...register('postCode', { required: '必須項目です' })}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.postCode}
                                    name='postCode'
                                    onChange={handleChange}
                                    onBlur={complementAddress}
                                    onKeyUp={complementAddress}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700" >都道府県<span className='text-red-500'>※必須</span></label>
                                {errors.pref && <p className="mt-2 text-sm text-red-600">{errors.pref.message}</p>}
                                <input
                                    type="text"
                                    {...register('pref', { required: '必須項目です' })}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    name='pref'
                                    id="pref"
                                    value={formData.pref}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">住所<span className='text-red-500'>※必須</span></label>
                                {errors.address1 && <p className="mt-2 text-sm text-red-600">{errors.address1.message}</p>}
                                <input
                                    type="text"
                                    {...register('address1', { required: '必須項目です' })}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    name='address1'
                                    id="address1"
                                    value={formData.address1}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">番地・建物名</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <button
                                    type="submit"
                                    className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    保存
                                </button>
                            </div>
                        </form>
                        <hr />
                    </div>
                </div>
            </main >
        </div>

    );
};

export default EditAddress;