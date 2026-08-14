import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB0mIlFrRKOujdhhRXdu8p3d_HJOIZdPbE",
  authDomain: "boda-500805.firebaseapp.com",
  projectId: "boda-500805",
  storageBucket: "boda-500805.firebasestorage.app",
  messagingSenderId: "924780234130",
  appId: "1:924780234130:web:a5ebb44e155e064391ad4b",
  measurementId: "G-ZDQX91613Z",
};

const firebaseApp = initializeApp(firebaseConfig);

// Analytics requires a browser environment (uses `window`). Guard it so the
// module can be imported in Node.js test environments without throwing.
export const analytics =
  typeof window !== "undefined" ? getAnalytics(firebaseApp) : null;
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp, "boda-us-central1");


