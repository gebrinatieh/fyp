// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC-12_0LcRSaVKGn1Tet1ZdrRO6Kmn-Zic",
  authDomain: "professor-mousallem.firebaseapp.com",
  projectId: "professor-mousallem",
  storageBucket: "professor-mousallem.firebasestorage.app",
  messagingSenderId: "656887838378",
  appId: "1:656887838378:web:c610b7a5d4c85f806e42d3",
  measurementId: "G-P3TJC1W28H"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };