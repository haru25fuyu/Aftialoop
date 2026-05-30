import React from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { GUIDE_DATA } from "./GuideData";
import { s } from "../../styles/page/user_guid/UserGuide.styles";

const UserGuide: React.FC = () => {
  const { guideId } = useParams<{ guideId: string }>();
  const activeContent = GUIDE_DATA.find((item) => item.id === guideId);

  if (!activeContent) return <Navigate to={`/guide/${GUIDE_DATA[0].id}`} replace />;

  return (
    <div style={s.layout}>
      <nav style={s.sidebar}>
        <div style={{ padding: "0 16px 16px", fontSize: 11, fontWeight: 700, color: "#8c8c8c", textTransform: "uppercase", letterSpacing: "0.06em" }}>ガイドメニュー</div>
        {GUIDE_DATA.map((item) => (
          <Link key={item.id} to={`/guide/${item.id}`} style={s.sidebarLink(guideId === item.id)}>
            {item.title}
          </Link>
        ))}
      </nav>
      <main style={s.content}>
        <article style={{ maxWidth: 720 }}>
          <h1 style={s.h1}>{activeContent.title}</h1>
          <div style={{ color: "#5c5a56", lineHeight: 1.9 }}>
            {activeContent.content}
          </div>
        </article>
      </main>
    </div>
  );
};

export default UserGuide;
