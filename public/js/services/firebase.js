export function initFirebase(){
  if(!window.firebase || !window.__FIREBASE_CONFIG){
    console.error("Firebase SDK or config missing");
    return null;
  }
  if(!firebase.apps.length){ firebase.initializeApp(window.__FIREBASE_CONFIG); }
  const auth = firebase.auth();
  const db = firebase.firestore();
  const stg = firebase.storage();
  try{ firebase.firestore.setLogLevel("error"); }catch{}
  return { auth, db, stg };
}
