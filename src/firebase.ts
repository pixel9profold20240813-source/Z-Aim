import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// 優先從環境變數讀取，如果沒有則嘗試從本地設定檔讀取 (AI Studio 環境)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// 如果環境變數是空的，嘗試動態載入本地設定檔 (僅用於 AI Studio 預覽)
let finalConfig = firebaseConfig;
if (!firebaseConfig.apiKey) {
  try {
    // @ts-ignore
    const localConfig = await import('../firebase-applet-config.json');
    const data = localConfig.default;
    finalConfig = {
      ...data,
      // @ts-ignore
      databaseURL: data.databaseURL || `https://${data.projectId}.firebaseio.com`
    };
  } catch (e) {
    console.warn("Firebase config not found in env or local file.");
  }
}

const app = initializeApp(finalConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
