import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');

  // 嘗試讀取 Firebase 設定檔
  let jsonConfig = {};
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      jsonConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {
    console.warn("Could not load firebase-applet-config.json, falling back to env vars");
  }

  // 輔助函式：優先使用 JSON，否則使用環境變數
  const getVal = (jsonKey, envKey) => JSON.stringify(jsonConfig[jsonKey] || env[envKey] || '');

  return {
    base: '/Z-Aim/',
    plugins: [react(), tailwindcss()],
    build: {
      target: 'esnext'
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_FIREBASE_API_KEY': getVal('apiKey', 'VITE_FIREBASE_API_KEY'),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': getVal('authDomain', 'VITE_FIREBASE_AUTH_DOMAIN'),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': getVal('projectId', 'VITE_FIREBASE_PROJECT_ID'),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': getVal('storageBucket', 'VITE_FIREBASE_STORAGE_BUCKET'),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': getVal('messagingSenderId', 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
      'import.meta.env.VITE_FIREBASE_APP_ID': getVal('appId', 'VITE_FIREBASE_APP_ID'),
      'import.meta.env.VITE_FIREBASE_DATABASE_URL': JSON.stringify(jsonConfig.databaseURL || env.VITE_FIREBASE_DATABASE_URL || (jsonConfig.projectId || env.VITE_FIREBASE_PROJECT_ID ? `https://${jsonConfig.projectId || env.VITE_FIREBASE_PROJECT_ID}.firebaseio.com` : '')),
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
