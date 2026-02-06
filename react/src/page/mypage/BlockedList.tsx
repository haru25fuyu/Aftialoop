import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../../component/Header';
import { Avatar } from '../../component/Avatar';
import api from '../../conf/api';
import { ArrowLeft } from 'lucide-react';

type BlockedUser = {
    id: string;
    name: string;
    icon_url: string | null;
};

const BlockedList: React.FC = () => {
    const navigate = useNavigate();

    const [users, setUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(true);

    // ブロックリスト取得
    useEffect(() => {
        const fetchBlockedUsers = async () => {
            try {
                const res = await api.get('/sns/blocks');
                setUsers(res.data || []);
            } catch (error) {
                console.error("Failed to fetch blocked users", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBlockedUsers();
    }, []);

    // ブロック解除処理
    const handleUnblock = async (userId: string, userName: string) => {
        if (!window.confirm(`${userName}さんのブロックを解除しますか？`)) return;

        try {
            await api.delete(`/users/${userId}/block`);
            // リストから削除
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
            console.error(error);
            alert("解除に失敗しました");
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            <Header />
            <div className="w-full max-w-2xl mx-auto px-4 pt-6">
                <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="max-w-lg mx-auto h-14 px-4 flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-1 -ml-2 hover:bg-gray-100 rounded-full">
                            <ArrowLeft size={24} className="text-gray-600" />
                        </button>
                        <h1 className="font-bold text-lg">ブロックリスト</h1>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[300px]">
                    {loading ? (
                        <div className="p-10 text-center text-gray-500">読み込み中...</div>
                    ) : users.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">
                            ブロックしているユーザーはいません
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {users.map(user => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100"
                                >
                                    <Link to={`/user/profile/${user.id}`} className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                                        <Avatar
                                            src={user.icon_url}
                                            name={user.name}
                                            className="w-12 h-12"
                                        />
                                        <span className="font-bold text-gray-800">{user.name}</span>
                                    </Link>
                                    <button
                                        onClick={() => handleUnblock(user.id, user.name)}
                                        className="px-4 py-1.5 text-sm font-bold text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
                                    >
                                        解除
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BlockedList;