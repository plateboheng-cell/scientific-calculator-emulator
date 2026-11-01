import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { target: 'es2022' },optimizeDeps:{entries:['index.html']}, server: { port: 5178, strictPort: true,watch:{ignored:['**/.verification/**','**/release/**','**/dist/**','**/录屏/**']} } });
