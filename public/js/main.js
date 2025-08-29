import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = window.__FIREBASE_CONFIG || {
  apiKey: "AIzaSyDVsqq0FLiGUp1I7JjH_yeYZBpqlDSo-uM",
  authDomain: "learnhub-mm.firebaseapp.com",
  projectId: "learnhub-mm",
  storageBucket: "learnhub-mm.firebasestorage.app",
  messagingSenderId: "961341989824",
  appId: "1:961341989824:web:760be616c75561008cde25",
  measurementId: "G-LM292D5D36",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

async function autoSeed() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const roleDoc = await getDoc(doc(db, "roles", uid));
  if (!roleDoc.exists() || roleDoc.data().role !== "admin") return;

  const seededDoc = doc(db, "meta", "seeded");
  const seededSnap = await getDoc(seededDoc);
  if (seededSnap.exists()) return;

  await setDoc(doc(db, "courses", "demo1"), {
    title: "Demo Course",
    content: "This is a seeded demo course with text, images, video and quiz placeholders.",
    type: "free"
  });
  await setDoc(doc(db, "announcements", "welcome"), {
    title: "Welcome Announcement",
    body: "This is your seeded demo announcement."
  });
  await setDoc(seededDoc, { at: new Date().toISOString() });
  console.log("Demo data seeded.");
}

auth.onAuthStateChanged((user) => {
  if (user) autoSeed();
});
