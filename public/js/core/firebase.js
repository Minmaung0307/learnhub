// core/firebase.js
export let firebaseNS = null;
export let app = null;
export let auth = null;
export let db = null;
export let stg = null;

export function initFirebase(){
  if (app) return app;
  if (!window.firebase || !window.__FIREBASE_CONFIG) {
    console.error('Firebase SDK or config missing');
    throw new Error('Firebase not configured');
  }
  firebaseNS = window.firebase;
  app = firebaseNS.initializeApp(window.__FIREBASE_CONFIG);
  auth = firebaseNS.auth();
  db = firebaseNS.firestore();
  stg = firebaseNS.storage?.();
  try { firebaseNS.firestore.setLogLevel('debug'); } catch {}
  return app;
}
