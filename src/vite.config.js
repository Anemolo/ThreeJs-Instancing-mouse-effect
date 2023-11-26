// vite.config.js
import { defineConfig } from 'vite';

import {glslify} from 'vite-plugin-glslify'

export default defineConfig({
  plugins: [glslify()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`
      }
    }
  }
});
