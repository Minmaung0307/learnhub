import { Router } from './core/router.js';
import { initEmail } from './services/email.js';
import { onAuth, login, signup, forgot, logout } from './services/auth.js';
import { isAdmin } from './services/firebase.js';
import { viewDashboard } from './features/dashboard.js';
import { viewCourses } from './features/courses.js';
import { viewLearning } from './features/mylearning.js';
import { viewTasks } from './features/tasks.js';
import { viewProfile } from './features/profile.js';
import { viewChat } from './features/chat.js';
import { viewSettings } from './features/settings.js';
import { viewAdmin } from './features/admin.js';
import { viewGuide } from './features/guide.js';
import { view404 } from './features/notfound.js';

// Defaults (can be overridden by window.__FIREBASE_CONFIG in another inline script)
window.__FIREBASE_CONFIG = window.__FIREBASE_CONFIG || {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_APP.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET.appspot.com",
  messagingSenderId: "123",
  appId: "1:123:web:abc",
};

window.__EMAILJS_CONFIG = window.__EMAILJS_CONFIG || { publicKey: "" };
window.__PAYPAL_CLIENT_ID = window.__PAYPAL_CLIENT_ID || "";

// EmailJS
initEmail(window.__EMAILJS_CONFIG.publicKey);

// Today
(function setToday(){ const el=document.getElementById('today'); if(!el) return; const d=new Date(); el.textContent=d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}); })();

// Burger + logout
document.getElementById('burger')?.addEventListener('click',()=> document.body.classList.toggle('sidebar-open'));
document.getElementById('btnLogout')?.addEventListener('click',async()=>{ try{ await logout(); }catch(e){ console.error(e); } });

// Persist theme/font
(function bootTheme(){ document.documentElement.dataset.theme=localStorage.getItem('lh_theme')||'slate'; document.documentElement.style.setProperty('--font-scale',localStorage.getItem('lh_font')||'1.0'); })();

// Global search broadcast
document.getElementById('globalSearch')?.addEventListener('input',e=>{
  const q=e.target.value.trim(); window.dispatchEvent(new CustomEvent('app:search',{detail:{q}}));
});

// Router
Router.register('/dashboard', viewDashboard);
Router.register('/courses', viewCourses);
Router.register('/mylearning', viewLearning);
Router.register('/tasks', viewTasks);
Router.register('/profile', viewProfile);
Router.register('/chat', viewChat);
Router.register('/settings', viewSettings);
Router.register('/admin', viewAdmin);
Router.register('/guide', viewGuide);
Router.register('/404', view404);
Router.start('/dashboard');

// Mount login when not signed-in
function mountLogin(){
  const outlet=document.getElementById('app'); outlet.innerHTML='';
  const tpl=document.getElementById('tpl-login').content.cloneNode(true); outlet.appendChild(tpl);
  const form=outlet.querySelector('#login-form');
  outlet.querySelector('#btn-signup').onclick=async()=>{ const email=prompt('Email?'); const pass=prompt('Password?'); if(email&&pass) await signup(email,pass,email.split('@')[0]); };
  outlet.querySelector('#btn-forgot').onclick=async()=>{ const email=prompt('Your email?'); if(email) await forgot(email); };
  form.onsubmit=async(e)=>{ e.preventDefault(); const email=outlet.querySelector('#login-email').value.trim(); const pass=outlet.querySelector('#login-pass').value; await login(email,pass); };
}

// Admin link show/hide
function showAdminLink(show){ const a=document.querySelector('a[href="#/admin"]'); if(a) a.style.display=show?'':'none'; }

let currentUser=null;
onAuth(async(u)=>{ currentUser=u; const admin=await isAdmin(u?.uid); showAdminLink(!!admin); if(!u){ mountLogin(); return; } if(!location.hash) location.hash='#/dashboard'; });

// Enable nav clicks without refresh jank
document.querySelectorAll('.nav-item').forEach(a=> a.addEventListener('click',()=> setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),0)));
