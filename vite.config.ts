import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');

  // 嘗試讀取 Firebase 設定檔
  let firebaseEnv = {};
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      firebaseEnv = {
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(config.apiKey),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(config.authDomain),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(config.projectId),
        'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(config.storageBucket),
        'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(config.messagingSenderId),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(config.appId),
        'import.meta.env.VITE_FIREBASE_DATABASE_URL': JSON.stringify(config.databaseURL || `https://${config.projectId}.firebaseio.com`),
      };
    }
  } catch (e) {
    console.warn("Could not load firebase-applet-config.json for injection");
  }

  return {
    plugins: [react(), tailwindcss()],
    build: {
      target: 'esnext'
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      ...firebaseEnv,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
