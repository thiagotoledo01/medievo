/* Configuração pública do Firebase (Console → Configurações do projeto → Seus apps → Web).
   Estes valores são públicos por natureza; a segurança vem das regras do banco. */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...", // Cole aqui a sua apiKey do Firebase (aquela que começa com AIzaSy)
  authDomain: "medievo-c9a64.firebaseapp.com",
  databaseURL: "https://medievo-c9a64-default-rtdb.firebaseio.com",
  projectId: "medievo-c9a64",
  storageBucket: "medievo-c9a64.firebasestorage.app",
  messagingSenderId: "1015302544403",
  appId: "1:1015302544403:web:295a4138cd9e55773673e6",
};

export const firebaseConfigurado = () => !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL);
