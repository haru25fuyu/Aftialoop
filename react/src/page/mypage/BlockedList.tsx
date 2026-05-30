import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../../component/Header';
import { Avatar } from '../../component/Avatar';
import api from '../../conf/api';
import { ArrowLeft } from 'lucide-react';
import { s } from '../../styles/page/mypage/BlockedList.styles';

type BlockedUser = { id: string; name: string; icon_url: string | null; };

const BlockedList: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/sns/blocks').then((res) => setUsers(res.data || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleUnblock = async (userId: string, userName: string) => {
    if (!window.confirm(`${userName}さんのブロックを解除しますか？`)) return;
    try { await api.delete(`/users/${userId}/block`); setUsers(prev => prev.filter(u => u.id !== userId)); }
    catch { alert("解除に失敗しました"); }
  };

  return (
    <div style={s.page}>
      <Header />
      <div style={{ maxWidth: 640, margin: "0 auto", paddingTop: 24 }}>
        <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #e0ddd8", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: 512, margin: "0 auto", height: 56, padding: "0 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => navigate(-1)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer", borderRadius: "50%" }}><ArrowLeft size={24} /></button>
            <h1 style={s.title}>ブロックリスト</h1>
          </div>
        </div>
        <div style={{ backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e0ddd8", overflow: "hidden", minHeight: 300, margin: 16 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8c8c8c" }}>読み込み中...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8c8c8c" }}>ブロックしているユーザーはいません</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {users.map(user => (
                <div key={user.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottom: "1px solid #f0eeeb" }}>
                  <Link to={`/user/profile/${user.id}`} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
                    <Avatar src={user.icon_url} name={user.name} size={48} />
                    <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{user.name}</span>
                  </Link>
                  <button onClick={() => handleUnblock(user.id, user.name)}
                    style={{ padding: "6px 16px", fontSize: 14, fontWeight: 700, color: "#d63c20", border: "1px solid #f0a890", borderRadius: 9999, background: "none", cursor: "pointer" }}>
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
