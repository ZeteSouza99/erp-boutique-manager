// Configuração do Firebase
// IMPORTANTE: Substitua as variáveis abaixo pelas suas credenciais do Firebase Console
// Vá em: https://console.firebase.google.com/ > Seu projeto > Configurações > Geral > SDK

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore,
  connectFirestoreEmulator, 
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Inicializa o app apenas uma vez
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Exporta os serviços do Firebase
export const auth = getAuth(app);

// Inicializar Firestore com cache persistente e suporte a múltiplas abas
let db: ReturnType<typeof getFirestore>;
if (typeof window !== 'undefined' && getApps().length === 1) {
  // No cliente: usar cache persistente com suporte a múltiplas abas
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch {
    // Se já foi inicializado, pegar a instância existente
    db = getFirestore(app);
  }
} else {
  db = getFirestore(app);
}
export { db };

export const storage = getStorage(app);

// Conectar aos emuladores em desenvolvimento
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}

export default app;
