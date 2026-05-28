import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  preview: {
    allowedHosts: [
      "sandbox.shopstrhub.store",
      ".shopstrhub.store",
      "34.35.141.243",
      "localhost",
      "127.0.0.1"
    ],
    host: true,
    port: 5173,
  },
});
