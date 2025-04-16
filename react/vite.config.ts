import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import dns from "dns";

// https://vite.dev/config/
dns.setDefaultResultOrder('verbatim');

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true
  }
});
