import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Thay các giá trị này bằng Firebase Config từ console.firebase.google.com
const firebaseConfig = {
  apiKey: "AIzaSyDwI0VPD-EmH3d5K32BwlcU0WfP_Oq-yko",
  authDomain: "justlife-9004f.firebaseapp.com",
  projectId: "justlife-9004f",
  storageBucket: "justlife-9004f.firebasestorage.app",
  messagingSenderId: "19555189966",
  appId: "1:19555189966:web:f4b44cbfcade475d77bc9f",
  measurementId: "G-0CYR6819QV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
