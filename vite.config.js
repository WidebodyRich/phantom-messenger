import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      buffer: 'buffer',
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: { global: 'globalThis' },
      plugins: [NodeGlobalsPolyfillPlugin({ buffer: true })],
    },
    include: ['buffer', 'bitcoinjs-lib', 'bip39', 'bip32', 'tiny-secp256k1', 'ecpair'],
    exclude: ['tiny-secp256k1'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://api.phantommessenger.app',
        changeOrigin: true,
        secure: true,
      },
      '/ws': {
        target: 'wss://api.phantommessenger.app',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
