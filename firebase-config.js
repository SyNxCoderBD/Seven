import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCMiRiVp2j7fH7amkxM5iNMkcrbGD47Ejk",
  authDomain: "onlineweb-582b0.firebaseapp.com",
  databaseURL: "https://onlineweb-582b0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onlineweb-582b0",
  storageBucket: "onlineweb-582b0.firebasestorage.app",
  messagingSenderId: "187398414611",
  appId: "1:187398414611:web:f6fcabca35800b2ed27ae6",
  measurementId: "G-T0YLWGQCME"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };