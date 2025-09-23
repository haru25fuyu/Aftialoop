import React, { useEffect} from 'react';
import { useForm  } from 'react-hook-form';
import api from '../conf/api';
import { useNavigate,useLocation } from 'react-router-dom';

import { Header } from '../component/Header';
import { Address } from '../types/Content';




const EditAddress: React.FC = () => {
    const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<Address>();
    const navigate = useNavigate();

    useEffect(() => {
        // URL から ID を取得
        const location = useLocation();
        const params = new URLSearchParams(location.search);
        const id = params.get('id');
        if (id) {
            api.post(`/address/get`, { id: id })
                .then((res) => {
                    reset(res.data);
                    console.log(res.data);
                })
                .catch((err) => {
                    console.error(err);
                });
        }
    }, []);

    const complementAddress = () => {
        if (typeof window !== 'undefined' && window.AjaxZip3) {
            window.AjaxZip3.zip2addr(
                'PostCode',
                '',
                'Pref',
                'Address1',
            );

            // AjaxZip3 により DOM の input 値が更新された後、React Hook Form に反映
            setValue('Pref', (document.getElementById('Pref') as HTMLInputElement).value);
            setValue('Address1', (document.getElementById('Address1') as HTMLInputElement).value);
        }
    };

    const onSubmit = async (data: Address) => {
        //データのpostCodeにハイフンが含まれている場合、ハイフンを削除
        console.log(data);
        data.PostCode = data.PostCode.replace(/-/g, '');
        api.post('/address/edit', data)
            .then(() => {
                navigate('/addresses');
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
                                <label className="block text-sm font-medium text-gray-700" >氏名<span className='text-red-500'>※必須</span></label>
                                {errors.Pref && <p className="mt-2 text-sm text-red-600">{errors.Pref.message}</p>}
                                <input
                                    type="text"
                                    {...register('Name', { required: '必須項目です' })}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    id="Pref"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">電話番号<span className='text-red-500'>※必須</span></label>
                                {errors.PostCode && <p className="mt-2 text-sm text-red-600">{errors.PostCode.message}</p>}
                                <input
                                    type="text"
                                    {...register('Phone', { required: '必須項目です' })}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    onBlur={complementAddress}
                                    onKeyUp={complementAddress}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">郵便番号<span className='text-red-500'>※必須</span></label>
                                {errors.PostCode && <p className="mt-2 text-sm text-red-600">{errors.PostCode.message}</p>}
                                <input
                                    type="text"
                                    {...register('PostCode', { required: '必須項目です' })}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    onBlur={complementAddress}
                                    onKeyUp={complementAddress}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700" >都道府県<span className='text-red-500'>※必須</span></label>
                                {errors.Pref && <p className="mt-2 text-sm text-red-600">{errors.Pref.message}</p>}
                                <input
                                    type="text"
                                    {...register('Pref', { required: '必須項目です' })}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    id="Pref"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">市区町村<span className='text-red-500'>※必須</span></label>
                                {errors.Address1 && <p className="mt-2 text-sm text-red-600">{errors.Address1.message}</p>}
                                <input
                                    type="text"
                                    {...register('Address1', { required: '必須項目です' })}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    name='Address1'
                                    id="Address1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">丁目・番地・号</label>
                                <input
                                    type="text"
                                    {...register('Address2')}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">建物名／会社名・部屋番号</label>
                                <input
                                    type="text"
                                    {...register('Address3')}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">デフォルトにする</label>
                                <input
                                    type="checkbox"
                                    {...register('Status')}
                                    className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <button
                                    type="submit"
                                    className="w-fu
                                    ll px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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