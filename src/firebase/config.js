import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDMHDsRqtVtJkpETWge48UkafhG-jDDebI",
  authDomain: "cashierassistant-8392e.firebaseapp.com",
  databaseURL: "https://cashierassistant-8392e-default-rtdb.firebaseio.com",
  projectId: "cashierassistant-8392e",
  storageBucket: "cashierassistant-8392e.firebasestorage.app",
  messagingSenderId: "246518717902",
  appId: "1:246518717902:web:86d4c3156618a56872df9f",
  measurementId: "G-1WEW5E5JS5",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Offline cache: data opens instantly from the device after the first load,
// and writes made with no signal (common in the field) are queued and synced
// automatically once the connection comes back. Falls back to the default
// in-memory cache where IndexedDB isn't available, or when this module is
// re-evaluated during dev hot-reload (Firestore can only be initialized once).
function createDb() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return getFirestore(app);
  }
}

export const db = createDb();
