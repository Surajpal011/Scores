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
  apiKey: "your_fire_base_api_key",
  authDomain: "your_fire_base_auth_domain",
  projectId: "your_fire_base_project_id",
  storageBucket: "your_fire_base_storage_Bucke",
  messagingSenderId: "your_fire_base_messaging_Sender_Id",
  appId: "your_appId_app_Id",
  measurementId: "your_fire_base_measurement_Id",
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
