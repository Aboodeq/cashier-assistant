import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
export const db = getFirestore(app);
