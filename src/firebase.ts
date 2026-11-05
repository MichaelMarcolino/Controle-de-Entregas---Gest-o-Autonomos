import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCSb61GQkTcYHUkVnPEu_Yl6M-zAqYUoxY",
  authDomain: "controle-entregas-c461d.firebaseapp.com",
  projectId: "controle-entregas-c461d",
  storageBucket: "controle-entregas-c461d.firebasestorage.app",
  messagingSenderId: "990745979036",
  appId: "1:990745979036:web:7ef20d15e7e042fb1ea559",
  measurementId: "G-9Y2PHN3L4F"
};

// Initialize Firebase (safely avoid multiple initialization)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
