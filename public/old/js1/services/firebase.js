let __fb=null;
export async function getFirebase(){
  if(__fb) return __fb;
  const cfg = window.__FIREBASE_CONFIG || {};
  const appMod = await import('https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js');
  const authMod= await import('https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js');
  const fsMod  = await import('https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js');
  const stMod  = await import('https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js');
  const app = appMod.getApps().length? appMod.getApp(): appMod.initializeApp(cfg);
  __fb = { app, ...appMod, ...authMod, ...fsMod, ...stMod,
    auth: authMod.getAuth(app), db: fsMod.getFirestore(app), storage: stMod.getStorage(app)
  }; return __fb;
}
export async function isAdmin(uid){ const {db,doc,getDoc}=await getFirebase(); if(!uid) return false;
  try{ const s=await getDoc(doc(db,'roles',uid)); return !!(s.exists() && s.data()?.role==='admin'); }catch{ return false; } }