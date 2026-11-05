// Configuração e inicialização do Firebase usando ESM via CDN oficial
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCSb61GQkTcYHUkVnPEu_Yl6M-zAqYUoxY",
  authDomain: "controle-entregas-c461d.firebaseapp.com",
  projectId: "controle-entregas-c461d",
  storageBucket: "controle-entregas-c461d.firebasestorage.app",
  messagingSenderId: "990745979036",
  appId: "1:990745979036:web:7ef20d15e7e042fb1ea559",
  measurementId: "G-9Y2PHN3L4F"
};

// Inicializa o Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
