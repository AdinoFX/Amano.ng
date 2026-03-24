// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCP-J2Qlx00HjxggZ2oYiHT8UCyVp9jHwk",
  authDomain: "amanong-24ca1.firebaseapp.com",
  projectId: "amanong-24ca1",
  storageBucket: "amanong-24ca1.firebasestorage.app",
  messagingSenderId: "770782114374",
  appId: "1:770782114374:web:49c908922c6dbb0154d047",
  measurementId: "G-WR7QSVQNLD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services for use in auth.js and other files
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);