import { getFirebase } from './firebase.js';
export async function onAuth(cb){ const {auth,onAuthStateChanged}=await getFirebase(); return onAuthStateChanged(auth,cb); }
export async function login(email,pass){ const {auth,signInWithEmailAndPassword}=await getFirebase(); await signInWithEmailAndPassword(auth,email,pass); }
export async function logout(){ const {auth,signOut}=await getFirebase(); await signOut(auth); }
export async function signup(email,pass,displayName){ const {auth,createUserWithEmailAndPassword,updateProfile,db,doc,setDoc}=await getFirebase(); const cred=await createUserWithEmailAndPassword(auth,email,pass); await updateProfile(cred.user,{displayName}); await setDoc(doc(db,'profiles',cred.user.uid),{displayName,email,createdAt:Date.now()},{merge:true}); }
export async function forgot(email){ const {auth,sendPasswordResetEmail}=await getFirebase(); await sendPasswordResetEmail(auth,email); }