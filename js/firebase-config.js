// Configuração Oficial do Firebase para uso direto no navegador
const firebaseConfig = {
  apiKey: "AIzaSyCSb61GQkTcYHUkVnPEu_Yl6M-zAqYUoxY",
  authDomain: "controle-entregas-c461d.firebaseapp.com",
  projectId: "controle-entregas-c461d",
  storageBucket: "controle-entregas-c461d.firebasestorage.app",
  messagingSenderId: "990745979036",
  appId: "1:990745979036:web:7ef20d15e7e042fb1ea559",
  measurementId: "G-9Y2PHN3L4F"
};

// Inicializa o Firebase com proteção caso esteja offline ou em file://
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
  } catch (e) {
    console.warn('Aviso inicialização Firebase:', e);
  }
}
