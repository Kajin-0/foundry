import {defineConfig} from 'vite';
import {resolve} from 'node:path';
// One app entry, plus a lightweight old MBE URL redirect (no second simulation).
export default defineConfig({base:'./',build:{rollupOptions:{input:{main:resolve('index.html'),legacyMbe:resolve('mbe.html')}}}});
