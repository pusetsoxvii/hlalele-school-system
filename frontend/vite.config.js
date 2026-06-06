import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // During development, forward /api calls to the backend
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
});
