import { useEffect, useState } from "react";
import { initAuthOnce, getAccessToken } from "../conf/api";

export default function RequireAuth({ children }: { children: JSX.Element }) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let alive = true;
        initAuthOnce().finally(() => {
            if (!alive) return;
            console.log("[RequireAuth] done token:", getAccessToken());
            setReady(true);
        });
        return () => { alive = false; };
    }, []);

    if (!ready) return <div>Loading...</div>;
    return children;
}
