// core/state.js
import { db } from './firebase.js';

export const state = {
  route:'dashboard',
  role:'student',
  currentCourseId:null,
  unsub:[],
};

export function setRole(r){ state.role = r; }

export const canTeach = () => ['instructor','admin'].includes(state.role);
export const canManage = () => state.role === 'admin';

export const col = (name) => db.collection(name);
export const doc = (name, id) => db.collection(name).doc(id);

// small helper: remove undefined & NaN
export const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([k,v])=>v!==undefined && !(typeof v==='number' && Number.isNaN(v))));
