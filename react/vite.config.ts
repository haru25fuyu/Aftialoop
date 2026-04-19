// vite.config.ts

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    // 以下の設定を追加
    allowedHosts: ["dev.aftialoop.com"],
  },
});
