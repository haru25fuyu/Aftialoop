// vite.config.ts

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// dnsは削除してOK
// import dns from "dns";
// dns.setDefaultResultOrder("verbatim");

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
  },
});
