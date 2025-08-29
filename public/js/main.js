import { initFirebase, auth } from './core/firebase.js';
import { state, setRole } from './core/state.js';
import { renderShell, wireShell } from './core/shell.js';
import { router, registerRoutes } from './core/router.js';
import { notify } from './core/modal.js';

// features
import dashboard from './features/dashboard.js';
import courses from './features/courses.js';
import courseDetail from './features/courseDetail.js';
import learning from './features/learning.js';
import assessments from './features/assessments.js';
import chat from './features/chat.js';
import tasks from './features/tasks.js';
import profile from './features/profile.js';
import admin from './features/admin.js';
import guide from './features/guide.js';
import contact from './features/contact.js';
import settings from './features/settings.js';

// Global error surfacing (prevent "freeze")
window.addEventListener('error', e => {
  console.error(e.error || e);
  notify('Error: ' + (e.message || 'App error'), 'danger');
});
window.addEventListener('unhandledrejection', e => {
  console.error('Unhandled rejection:', e.reason);
  notify((e?.reason?.message || e?.reason || 'Unexpected error'), 'danger');
});

initFirebase();

registerRoutes([
  dashboard, courses, courseDetail, learning, assessments,
  chat, tasks, profile, admin, guide, contact, settings
]);

// auth + role
auth.onAuthStateChanged(async user => {
  const root = document.getElementById('root');
  if (!user) {
    root.innerHTML = `
      <div class="center" style="min-height:100vh">
        <div class="card" style="width:min(480px,96vw)">
          <div class="card-body">
            <h3>Sign in</h3>
            <div class="grid">
              <input id="li-email" class="input" placeholder="you@example.com" autocomplete="username"/>
              <input id="li-pass" class="input" type="password" placeholder="••••••••" autocomplete="current-password"/>
              <button class="btn" id="btnLogin">Sign In</button>
              <div class="right">
                <button class="btn secondary" id="btnRegister">Sign up</button>
                <button class="btn ghost" id="btnForgot">Forgot</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    const doLogin = async () => {
      const email = document.getElementById('li-email')?.value.trim();
      const pass = document.getElementById('li-pass')?.value.trim();
      if (!email || !pass) return notify('Enter email & password','warn');
      try { await auth.signInWithEmailAndPassword(email, pass); }
      catch(e){ notify(e.message || 'Login failed','danger'); }
    };
    document.getElementById('btnLogin')?.addEventListener('click', doLogin);
    document.getElementById('li-pass')?.addEventListener('keydown', e => { if (e.key==='Enter') doLogin(); });
    document.getElementById('btnForgot')?.addEventListener('click', async ()=>{
      const email = document.getElementById('li-email')?.value.trim();
      if (!email) return notify('Enter your email','warn');
      try{ await auth.sendPasswordResetEmail(email); notify('Reset email sent','ok'); }
      catch(e){ notify(e.message || 'Failed','danger'); }
    });
    document.getElementById('btnRegister')?.addEventListener('click', async ()=>{
      const email = document.getElementById('li-email')?.value.trim();
      const pass = document.getElementById('li-pass')?.value.trim() || 'admin123';
      if (!email) return notify('Enter email first, then click Sign up','warn');
      try{
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        const uid = cred.user.uid;
        const { db, firebaseNS } = await import('./core/firebase.js');
        const { doc, col, clean } = await import('./core/state.js');
        await Promise.all([
          doc('roles', uid).set({ uid, role:'student', email, createdAt: firebaseNS.firestore.FieldValue.serverTimestamp() }),
          doc('profiles', uid).set({ uid, email, name:'', bio:'', portfolio:'', role:'student', createdAt: firebaseNS.firestore.FieldValue.serverTimestamp() })
        ]);
        notify('Account created — you can sign in.');
      }catch(e){ notify(e.message || 'Signup failed','danger'); }
    });
    return;
  }

  renderShell();
  wireShell();

  // Resolve role listener
  const { doc } = await import('./core/state.js');
  doc('roles', user.uid).onSnapshot(snap => {
    const role = (snap.data()?.role || 'student').toLowerCase();
    setRole(['student','instructor','admin'].includes(role)?role:'student');
    router.go(state.route || 'dashboard'); // re-render
  }, err => console.warn('roles listener:', err));

  router.go('dashboard');
});
