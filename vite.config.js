import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import AutoImport from 'unplugin-auto-import/vite';
import Icons from 'unplugin-icons/vite'
import vue from '@vitejs/plugin-vue';
import { templateCompilerOptions } from '@tresjs/core'
import path from 'node:path';

import vueDevTools from 'vite-plugin-vue-devtools';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({...templateCompilerOptions}), 
    AutoImport({}), 
    Icons(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
