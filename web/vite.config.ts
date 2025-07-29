import path from "path";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    commonjsOptions: { transformMixedEsModules: true } // Change
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server:{
    proxy: {
      "/api":{
        target: "http://127.0.0.1:13100",
        changeOrigin: true,
        //rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  }
})
