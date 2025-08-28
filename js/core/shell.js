// core/shell.js
import { auth } from './firebase.js';
import { state, canManage } from './state.js';
import { router } from './router.js';

function heroForRoute(route){
  const map = {
    dashboard:['Dashboard','Your hub'],
    courses:['Courses','Create, browse, enroll'],
    'course-detail':['Course Detail','Overview & materials'],
    learning:['My Learning','Enrolled courses'],
    assessments:['Finals','Create & take finals'],
    chat:['Chat','Course / DM / Group'],
    tasks:['Tasks','Personal Kanban'],
    profile:['Profile','Bio, avatar & certificates'],
    admin:['Admin','Roles & roster'],
    guide:['Guide','All features'],
    contact:['Contact','EmailJS'],
    settings:['Settings','Theme & preferences'],
  };
  return map[route] || ['LearnHub',''];
}

export function renderShell(){
  const [title, sub] = heroForRoute(state.route);
  const root = document.getElementById('root');
  root.innerHTML = `
  <div class="app">
    <aside class="sidebar" id="sidebar">
      <div class="brand">LearnHub</div>
      <div class="nav" id="side-nav">
        ${['dashboard','courses','learning','assessments','chat','tasks','profile','admin','guide','contact','settings'].map(r=>`
          <div class="item ${state.route===r?'active':''}" data-route="${r}">${r[0].toUpperCase()+r.slice(1)}</div>`).join('')}
      </div>
      <div style="margin-top:auto;padding:12px;border-top:1px solid var(--border)">
        <div class="muted">ROLE: <b>${state.role.toUpperCase()}</b></div>
      </div>
    </aside>
    <div>
      <div class="topbar">
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn ghost" id="burger">☰</button>
          <span class="badge">${state.role.toUpperCase()}</span>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn ghost" id="btnLogout">Logout</button>
        </div>
      </div>
      <div id="backdrop"></div>
      <div class="page-hero"><div class="t">${title}</div><div class="s muted">${sub}</div></div>
      <div class="main" id="main"></div>
    </div>
  </div>
  <div id="notification" class="notification"></div>`;
}

export function wireShell(){
  document.getElementById('burger')?.addEventListener('click', ()=>{
    const open = document.body.classList.contains('sidebar-open');
    if (open) document.body.classList.remove('sidebar-open');
    else document.body.classList.add('sidebar-open');
    document.getElementById('backdrop')?.classList.add('active');
  });
  document.getElementById('backdrop')?.addEventListener('click', ()=>{
    document.body.classList.remove('sidebar-open');
    document.getElementById('backdrop')?.classList.remove('active');
  });
  document.getElementById('side-nav')?.addEventListener('click', e=>{
    const it = e.target.closest('.item[data-route]'); if (!it) return;
    const r = it.getAttribute('data-route');
    router.go(r);
    document.body.classList.remove('sidebar-open');
    document.getElementById('backdrop')?.classList.remove('active');
  });
  document.getElementById('btnLogout')?.addEventListener('click', ()=>auth.signOut());
}
