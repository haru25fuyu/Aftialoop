import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import dns from "dns";

// https://vite.dev/config/
dns.setDefaultResultOrder('verbatim');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  }
});
