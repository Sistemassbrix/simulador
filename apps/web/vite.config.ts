import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import path from 'node:path';
export default defineConfig({root:path.resolve(__dirname),plugins:[react(),tailwind()],build:{outDir:'dist'},server:{host:'127.0.0.1',port:5182,proxy:{'/api':{target:process.env.API_PROXY_TARGET||'http://127.0.0.1:8282',changeOrigin:false}}}});
