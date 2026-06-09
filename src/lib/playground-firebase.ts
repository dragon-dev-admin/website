import { initializeApp, getApp, getApps } from "firebase/app"
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth"
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  orderBy,
} from "firebase/firestore"
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage"

export const playgroundFirebaseConfig = {
  apiKey: "AIzaSyA7JgTJduH8AjWKR-XM4Js68uX8RoH01z0",
  authDomain: "dragon-76ef3.firebaseapp.com",
  projectId: "dragon-76ef3",
  storageBucket: "dragon-76ef3.firebasestorage.app",
  messagingSenderId: "814555181093",
  appId: "1:814555181093:web:e9d709b1e5913dc5310fcc",
  measurementId: "G-YNM6E73MBR",
}

export const playgroundFirebaseReady = !Object.values(playgroundFirebaseConfig).some((value) =>
  String(value).startsWith("REPLACE_WITH_")
)

export function getPlaygroundFirebase() {
  if (!playgroundFirebaseReady) return null

  const app = getApps().length ? getApp() : initializeApp(playgroundFirebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  const storage = getStorage(app)
  const googleProvider = new GoogleAuthProvider()

  return { app, auth, db, storage, googleProvider }
}

export {
  collection,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  getDocs,
  getDownloadURL,
  increment,
  onAuthStateChanged,
  onSnapshot,
  query,
  ref,
  runTransaction,
  sendPasswordResetEmail,
  serverTimestamp,
  setDoc,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateDoc,
  uploadBytes,
  where,
  orderBy,
  type User,
}
