import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration
// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBDQ5c9j2FX9Ul53ZmYs7A1AhSTif_zfDw",
  authDomain: "realtimescores-8bef6.firebaseapp.com",
  projectId: "realtimescores-8bef6",
  storageBucket: "realtimescores-8bef6.firebasestorage.app",
  messagingSenderId: "64398107481",
  appId: "1:64398107481:web:3f7400093a4f4248312248",
  measurementId: "G-9H4XZHKR66",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Optional: Only initialize analytics if window is available (prevents crash in SSR/Node)
if (typeof window !== "undefined") {
  getAnalytics(app);
}

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
