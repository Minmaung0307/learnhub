// LearnHub Starter — robust, freeze-free
// SPA with Firebase (Auth/Firestore/Storage), PayPal, and EmailJS

// ---------- Helpers
const onReady = (fn) => (document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", fn, { once: true })
  : fn());

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const notify = (msg, type="ok") => {
  const n = $("#notification"); if(!n) return;
  n.textContent = msg; n.className = `notification show ${type}`;
  clearTimeout(notify._t); notify._t = setTimeout(()=> n.className = "notification", 2400);
};

// Safe wrapper for all async handlers (so no freezes on unhandled rejections)
const safe = (fn) => (...args) => {
  try {
    const r = fn.apply(null, args);
    if (r && typeof r.then === "function") r.catch((e)=>{
      console.error("Async handler error:", e);
      notify(e?.message || "Action failed", "danger");
    });
    return r;
  } catch(e){
    console.error("Handler error:", e);
    notify(e?.message || "Action failed", "danger");
  }
};

// Busy button
function withBusy(btn, label="Saving…"){
  if(!btn) return ()=>{};
  const prev = btn.innerHTML; btn.disabled = true;
  btn.innerHTML = `<i class="ri-loader-4-line" style="animation:spin 1s linear infinite"></i> ${label}`;
  return ()=>{ btn.disabled = false; btn.innerHTML = prev; };
}
async function safeWrite(btn, op, { ok="Saved", close=false } = {}){
  const done = withBusy(btn);
  try{
    if(close) closeModal();
    await Promise.resolve().then(op);
    notify(ok);
  }catch(e){
    console.error(e); notify(e?.message||"Failed", "danger");
  }finally{ done(); }
}

// ---------- Firebase init
if(!window.firebase || !window.__FIREBASE_CONFIG){
  console.error("Firebase SDK/config missing");
}
firebase.initializeApp(window.__FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();
const stg = firebase.storage();

try { firebase.firestore.setLogLevel("error"); } catch{}

// ---------- Global state
const state = {
  user: null,
  role: "student",
  route: "dashboard",
  courses: [],
  quizzes: [],
  tasks: [],
  announcements: [],
  profiles: [],
  enrollments: [],
  attempts: [],
  messages: [],
  currentCourseId: null,
  detailPrevRoute: "courses",
  unsub: [],
  _chatUnsub: null,
};

const col = (name) => db.collection(name);
const docRef = (name, id) => db.collection(name).doc(id);
const canManageUsers = () => state.role === "admin";
const canTeach = () => ["admin","instructor"].includes(state.role);

// live role
function listenRole(uid){
  return docRef("roles", uid).onSnapshot((s)=>{
    const r = (s.data()?.role || "student").toLowerCase();
    if (state.role !== r) { state.role = r; render(); }
  }, (err)=> console.warn("role listen error:", err));
}

// ---------- Modal
function ensureModalDOM(){
  if ($("#m-modal")) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="modal" id="m-modal"><div class="dialog">
      <div class="head">
        <button class="btn ghost" id="mm-back"><i class="ri-arrow-left-line"></i> Back</button>
        <strong id="mm-title" style="margin-left:8px">Modal</strong>
      </div>
      <div class="body" id="mm-body"></div>
      <div class="foot" id="mm-foot"></div>
    </div></div>
    <div class="modal-backdrop" id="m-backdrop"></div>
  `;
  document.body.appendChild(wrap.firstElementChild);
  document.body.appendChild(wrap.lastElementChild);
  $("#mm-back").addEventListener("click", () => closeModal());
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeModal(); });
}
function openModal(title, bodyHTML, footHTML){
  ensureModalDOM();
  $("#mm-title").textContent = title || "Modal";
  $("#mm-body").innerHTML = bodyHTML || "";
  $("#mm-foot").innerHTML = footHTML || "";
  $("#m-modal").classList.add("active"); $("#m-backdrop").classList.add("active");
}
function closeModal(){
  $("#m-modal")?.classList.remove("active");
  $("#m-backdrop")?.classList.remove("active");
}

// ---------- Layout/Router
function heroFor(route){
  const map = {
    dashboard:["ri-dashboard-line","Dashboard","Your hub of activity"],
    courses:["ri-book-2-line","Courses","Create, browse, enroll"],
    learning:["ri-graduation-cap-line","My Learning","Enrolled courses"],
    assessments:["ri-file-list-3-line","Finals","Take & track results"],
    chat:["ri-chat-3-line","Chat","Course / DM / Group"],
    tasks:["ri-list-check-2","Tasks","Personal kanban"],
    profile:["ri-user-3-line","Profile","Bio, avatar & certificate"],
    admin:["ri-shield-star-line","Admin","Users, roles & rosters"],
    guide:["ri-compass-3-line","Guide","All features explained"],
    settings:["ri-settings-3-line","Settings","Theme & preferences"],
    contact:["ri-mail-send-line","Contact","Get in touch"],
    "course-detail":["ri-book-open-line","Course Detail","Overview & materials"],
  };
  return map[route] || ["ri-compass-3-line", "LearnHub", "Smart learning"];
}
function layout(content){
  const [ic,title,sub] = heroFor(state.route);
  return `
  <div class="app">
    <aside class="sidebar">
      <div class="brand"><i class="ri-graduation-cap-line"></i> LearnHub</div>
      <div class="nav" id="side-nav">
        ${[
          ["dashboard","Dashboard","ri-dashboard-line"],
          ["courses","Courses","ri-book-2-line"],
          ["learning","My Learning","ri-graduation-cap-line"],
          ["assessments","Finals","ri-file-list-3-line"],
          ["chat","Chat","ri-chat-3-line"],
          ["tasks","Tasks","ri-list-check-2"],
          ["profile","Profile","ri-user-3-line"],
          ...(canManageUsers() ? [["admin","Admin","ri-shield-star-line"]] : []),
          ["guide","Guide","ri-compass-3-line"],
          ["contact","Contact","ri-mail-send-line"],
          ["settings","Settings","ri-settings-3-line"],
        ].map(([r,l,i]) => `<div class="item ${state.route===r?"active":""}" data-route="${r}"><i class="${i}"></i><span>${l}</span></div>`).join("")}
      </div>
      <div class="muted" style="margin-top:auto">Role • <b>${state.role.toUpperCase()}</b></div>
    </aside>
    <div>
      <div class="topbar">
        <div style="display:flex;align-items:center;gap:8px">
          <button class="btn ghost" id="burger"><i class="ri-menu-line"></i></button>
          <div class="badge"><i class="ri-shield-user-line"></i> ${state.role.toUpperCase()}</div>
        </div>
        <div class="search-inline">
          <input id="globalSearch" class="input" placeholder="Search…" />
          <div id="searchResults" class="search-results"></div>
        </div>
        <div><button class="btn ghost" id="btnLogout"><i class="ri-logout-box-r-line"></i> Logout</button></div>
      </div>
      <div id="backdrop"></div>
      <div class="page-hero"><i class="${ic}"></i><div><div class="t">${title}</div><div class="s muted">${sub}</div></div></div>
      <div class="main" id="main">${content}</div>
    </div>
  </div>`;
}

function go(route){
  const prev = state.route;
  state.route = route;
  render();
  // mobile: close sidebar and scroll to top
  document.body.classList.remove("sidebar-open");
  $("#backdrop")?.classList.remove("active");
  document.querySelector(".main")?.scrollTo({top:0, behavior:"auto"});
}

// ---------- Views (compact)
const vLogin = () => `
<div class="card" style="max-width:460px;margin:40px auto">
  <div class="card-body">
    <div class="text-center" style="margin-bottom:6px"><i class="ri-graduation-cap-line" style="font-size:32px"></i></div>
    <div class="text-center" style="font-weight:800;font-size:18px;margin-bottom:6px">LearnHub</div>
    <div class="grid">
      <input id="li-email" class="input" placeholder="Email" type="email" autocomplete="username"/>
      <input id="li-pass" class="input" placeholder="Password" type="password" autocomplete="current-password"/>
      <button id="btnLogin" class="btn"><i class="ri-login-box-line"></i> Sign In</button>
      <div style="display:flex;justify-content:space-between">
        <button id="link-forgot" class="btn ghost">Forgot</button>
        <button id="link-register" class="btn secondary">Sign Up</button>
      </div>
    </div>
  </div>
</div>
`;

function dashCard(label, value, route, icon){
  return `<div class="card clickable" data-go="${route}"><div class="card-body" style="display:flex;justify-content:space-between;align-items:center">
    <div><div class="muted">${label}</div><div style="font-weight:800;font-size:20px">${value}</div></div>
    <i class="${icon}" style="font-size:22px;opacity:.9"></i>
  </div></div>`;
}
function vDashboard(){
  return `
  <div class="grid cols-3">
    ${dashCard("Courses", state.courses.length, "courses", "ri-book-2-line")}
    ${dashCard("Finals", state.quizzes.filter(q=>q.isFinal).length, "assessments", "ri-file-list-3-line")}
    ${dashCard("Announcements", state.announcements.length, "dashboard", "ri-megaphone-line")}
  </div>
  <div class="card" style="margin-top:10px"><div class="card-body">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h3 style="margin:0">Announcements</h3>
      ${canManageUsers() ? `<button class="btn" id="add-ann"><i class="ri-add-line"></i> New</button>` : ""}
    </div>
    <div id="ann-list" style="margin-top:8px">
      ${state.announcements.map(a=>`
        <div class="card"><div class="card-body" style="display:flex;justify-content:space-between;gap:8px">
          <div>
            <div style="font-weight:800">${a.title||"—"}</div>
            <div class="muted" style="font-size:12px">${new Date(a.createdAt?.toDate?.()||Date.now()).toLocaleString()}</div>
            <div style="margin-top:6px">${(a.body||"").replace(/</g,"&lt;")}</div>
          </div>
          ${canManageUsers()?`<div style="display:flex;gap:6px">
              <button class="btn ghost" data-edit-ann="${a.id}"><i class="ri-edit-line"></i></button>
              <button class="btn danger" data-del-ann="${a.id}"><i class="ri-delete-bin-6-line"></i></button>
          </div>`:""}
        </div></div>
      `).join("") || `<div class="muted">No announcements.</div>`}
    </div>
  </div></div>`;
}

function courseCard(c){
  return `<div class="card course-card" id="${c.id}">
    <div class="img"><img src="${c.coverImage||"/icons/learnhub-cap.svg"}" alt=""></div>
    <div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="title" style="font-weight:800">${c.title||""}</div>
        <span class="badge">${c.category||"General"}</span>
      </div>
      <div class="short clamp" style="margin-top:6px">${(c.short||"").replace(/</g,"&lt;")}</div>
      <div class="meta" style="margin-top:8px">
        <div class="price" style="font-weight:800">${(c.price||0)>0?`$${(+c.price).toFixed(2)}`:"Free"}</div>
        <div style="display:flex;gap:6px">
          <button class="btn" data-open="${c.id}"><i class="ri-external-link-line"></i> ${(+c.price)>0?"Buy":"View"}</button>
          ${canTeach()?`<button class="btn ghost" data-edit="${c.id}"><i class="ri-edit-line"></i></button>
          <button class="btn danger" data-del="${c.id}"><i class="ri-delete-bin-6-line"></i></button>`:""}
        </div>
      </div>
    </div>
  </div>`;
}
function vCourses(){
  return `<div class="card"><div class="card-body">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h3 style="margin:0">Courses</h3>
      ${canTeach()?`<button class="btn" id="add-course"><i class="ri-add-line"></i> New Course</button>`:""}
    </div>
    <div class="grid cols-3" data-sec="courses" style="margin-top:8px">
      ${state.courses.map(courseCard).join("") || `<div class="muted">No courses yet.</div>`}
    </div>
  </div></div>`;
}

function findCourse(id){ return state.courses.find(c=>c.id===id) || {}; }
function vCourseDetail(id){
  const c = findCourse(id);
  return `<div class="card"><div class="card-body">
    <div style="display:flex;gap:8px;align-items:center">
      <button class="btn ghost" id="cd-back"><i class="ri-arrow-left-line"></i> Back</button>
      <div class="badge"><i class="ri-book-2-line"></i> ${c.category||"General"} • Credits ${c.credits||0}</div>
      <div style="font-weight:800;margin-left:auto">${(+c.price)>0?`$${(+c.price).toFixed(2)}`:"Free"}</div>
    </div>
    <h2 style="margin:8px 0">${c.title||""}</h2>
    <p class="muted">${(c.short||"").replace(/</g,"&lt;")}</p>
    <div class="section-box"><h4>Outline</h4><div id="cd-outline" class="muted">No outline URL.</div></div>
    <div class="section-box" style="margin-top:10px"><h4>Lesson Quizzes</h4><div id="cd-lesson-quizzes" class="muted">No lesson quizzes URL.</div></div>
    <div id="paypal-zone" class="paypal-zone hidden" style="margin-top:12px"><div id="paypal-buttons"></div></div>
  </div></div>
  <div class="detail-actions"><div class="detail-actions-inner">
    ${(c.price||0)>0?`<button class="btn" id="cd-show-pay"><i class="ri-bank-card-line"></i> Pay & Enroll</button>`:`<button class="btn" id="cd-enroll"><i class="ri-checkbox-circle-line"></i> Enroll</button>`}
    <button class="btn ghost" id="cd-finals"><i class="ri-question-line"></i> Finals</button>
  </div></div>`;
}

function vLearning(){
  const my = auth.currentUser?.uid;
  const ids = new Set(state.enrollments.filter(e=>e.uid===my).map(e=>e.courseId));
  const list = state.courses.filter(c=>ids.has(c.id));
  return `<div class="card"><div class="card-body">
    <h3 style="margin:0 0 8px 0">My Learning</h3>
    <div class="grid cols-3" data-sec="learning">
      ${list.map(c=>`
        <div class="card course-card"><div class="img"><img src="${c.coverImage||"/icons/learnhub-cap.svg"}"></div>
          <div class="card-body">
            <div style="font-weight:800">${c.title||""}</div>
            <div class="short clamp muted" style="margin-top:6px">${(c.short||"").replace(/</g,"&lt;")}</div>
            <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center">
              <div class="muted">Credits: ${c.credits||0}</div>
              <button class="btn" data-open-course="${c.id}">Open</button>
            </div>
          </div>
        </div>
      `).join("") || `<div class="muted">You’re not enrolled yet.</div>`}
    </div>
  </div></div>`;
}

function vAssessments(){
  return `<div class="card"><div class="card-body">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h3 style="margin:0">Final Exams</h3>
      ${canTeach()?`<button class="btn" id="new-quiz"><i class="ri-add-line"></i> New Final</button>`:""}
    </div>
    <div class="grid" data-sec="quizzes" style="margin-top:8px">
      ${state.quizzes.filter(q=>q.isFinal).map(q=>`
        <div class="card" id="${q.id}"><div class="card-body" style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:800">${q.title}</div>
            <div class="muted" style="font-size:12px">${q.courseTitle||"—"} • pass ≥ ${q.passScore||70}%</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn" data-take="${q.id}"><i class="ri-play-line"></i> Take</button>
            ${canTeach()||q.ownerUid===auth.currentUser?.uid?`<button class="btn ghost" data-edit="${q.id}"><i class="ri-edit-line"></i></button>`:""}
            ${canTeach()?`<button class="btn danger" data-del="${q.id}"><i class="ri-delete-bin-6-line"></i></button>`:""}
          </div>
        </div></div>
      `).join("") || `<div class="muted">No finals yet.</div>`}
    </div>
    <div class="card" style="margin-top:10px"><div class="card-body">
      <h3 style="margin:0 0 6px 0">My Attempts</h3>
      <div class="table-wrap">
        <table class="table"><thead><tr><th>Quiz</th><th>Score</th><th>Date</th></tr></thead><tbody>
          ${state.attempts.filter(a=>a.uid===auth.currentUser?.uid).map(a=>`
            <tr><td>${a.quizTitle}</td><td class="num">${a.score}%</td><td>${new Date(a.createdAt?.toDate?.()||Date.now()).toLocaleString()}</td></tr>
          `).join("")}
        </tbody></table>
      </div>
    </div></div>
  </div></div>`;
}

const vChat = () => `
<div class="card"><div class="card-body">
  <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;align-items:center">
    <h3 style="margin:0">Chat</h3>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <select id="chat-mode" class="input">
        <option value="course">Course-wide</option>
        <option value="dm">Direct</option>
        <option value="group">Group</option>
      </select>
      <select id="chat-course" class="input"><option value="">Pick course…</option>${state.courses.map(c=>`<option value="${c.id}">${c.title}</option>`).join("")}</select>
      <select id="chat-dm" class="input hidden"><option value="">Pick user…</option>${state.profiles.filter(p=>p.uid!==auth.currentUser?.uid).map(p=>`<option value="${p.uid}">${p.name||p.email}</option>`).join("")}</select>
      <input id="chat-group" class="input hidden" placeholder="Group id e.g. Diploma-2025"/>
    </div>
  </div>
  <div id="chat-box" style="margin-top:10px;max-height:55vh;overflow:auto;border:1px solid var(--border);border-radius:12px;padding:10px"></div>
  <div style="display:flex;gap:8px;margin-top:10px"><input id="chat-input" class="input" placeholder="Message…"/><button class="btn" id="chat-send"><i class="ri-send-plane-2-line"></i></button></div>
  <div class="muted" style="font-size:12px;margin-top:6px">Admins can edit/delete any message. Users can edit/delete their own.</div>
</div></div>`;

function vTasks(){
  const my = auth.currentUser?.uid;
  const lane = (key,label,color)=>{
    const cards = state.tasks.filter(t=>t.uid===my && t.status===key);
    return `<div class="card lane-row" data-lane="${key}"><div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0;color:${color}">${label}</h3>
        ${key==="todo"?`<button class="btn" id="addTask"><i class="ri-add-line"></i> Add Task</button>`:""}
      </div>
      <div class="grid lane-grid" id="lane-${key}" style="margin-top:8px">
        ${cards.map(t=>`
          <div class="card task-card" id="${t.id}">
            <div class="card-body" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <div style="flex:1">${t.title}</div>
              <div style="display:flex;gap:6px">
                <button class="btn ghost" data-edit="${t.id}"><i class="ri-edit-line"></i></button>
                <button class="btn danger" data-del="${t.id}"><i class="ri-delete-bin-6-line"></i></button>
              </div>
            </div>
          </div>`).join("") || `<div class="muted">Drop tasks here…</div>`}
      </div>
    </div></div>`;
  };
  return `<div data-sec="tasks">${lane("todo","To do","#f59e0b")}${lane("inprogress","In progress","#3b82f6")}${lane("done","Done","#10b981")}</div>`;
}

function buildTranscript(uid){
  const finals = new Map();
  state.quizzes.filter(q=>q.isFinal && q.courseId).forEach(q=> finals.set(q.courseId, { passScore:+q.passScore||70, courseTitle:q.courseTitle||"—" }));
  const bestBy = new Map();
  state.attempts.filter(a=>a.uid===uid && a.courseId).forEach(a=>{
    const s = +a.score||0; bestBy.set(a.courseId, Math.max(bestBy.get(a.courseId)||0, s));
  });
  return Array.from(finals.entries()).map(([cid,meta])=> ({ courseId:cid, courseTitle:meta.courseTitle, best:bestBy.get(cid)||0, completed:(bestBy.get(cid)||0) >= meta.passScore }));
}
function vProfile(){
  const me = state.profiles.find(p=>p.uid===auth.currentUser?.uid) || {name:"", bio:"", portfolio:"", avatar:"", signature:""};
  return `<div class="grid">
    <div class="card"><div class="card-body">
      <h3 style="margin:0 0 8px 0">My Profile</h3>
      <div class="grid">
        <input id="pf-name" class="input" placeholder="Name" value="${me.name||""}"/>
        <input id="pf-portfolio" class="input" placeholder="Portfolio URL" value="${me.portfolio||""}"/>
        <textarea id="pf-bio" class="input" placeholder="Short bio">${me.bio||""}</textarea>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <input id="pf-avatar" type="file" accept="image/*" style="display:none"/>
          <input id="pf-sign" type="file" accept="image/*" style="display:none"/>
          <button class="btn" id="pf-save"><i class="ri-save-3-line"></i> Save</button>
          <button class="btn ghost" id="pf-pick"><i class="ri-image-add-line"></i> Avatar</button>
          <button class="btn ghost" id="pf-pick-sign"><i class="ri-pen-nib-line"></i> Signature</button>
          <button class="btn secondary" id="pf-view"><i class="ri-id-card-line"></i> View Card</button>
          <button class="btn danger" id="pf-delete"><i class="ri-delete-bin-6-line"></i> Delete</button>
        </div>
      </div>
    </div></div>
    <div class="card"><div class="card-body">
      <h3 style="margin:0 0 8px 0">Transcript</h3>
      <div class="table-wrap">
        <table class="table"><thead><tr><th>Course</th><th>Best</th><th>Certificate</th></tr></thead><tbody>
          ${buildTranscript(auth.currentUser?.uid).map(r=>`
            <tr><td>${r.courseTitle}</td><td class="num">${r.best}%</td><td>${r.completed?`<button class="btn" data-cert="${r.courseId}"><i class="ri-award-line"></i> Download</button>`:"—"}</td></tr>
          `).join("")}
        </tbody></table>
      </div>
    </div></div>
  </div>`;
}

function vAdmin(){
  if(!canManageUsers()) return `<div class="card"><div class="card-body">Admins only.</div></div>`;
  return `<div class="grid cols-2">
    <div class="card"><div class="card-body">
      <h3 style="margin:0 0 8px 0">Role Manager</h3>
      <div class="grid">
        <input id="rm-uid" class="input" placeholder="User UID"/>
        <select id="rm-role" class="input"><option>student</option><option>instructor</option><option>admin</option></select>
        <button class="btn" id="rm-save"><i class="ri-save-3-line"></i> Save Role</button>
      </div>
    </div></div>
    <div class="card"><div class="card-body">
      <h3 style="margin:0 0 8px 0">Users (profiles)</h3>
      <div class="table-wrap">
        <table class="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody>
          ${state.profiles.map(p=>`
            <tr>
              <td>${p.name||"—"}</td><td>${p.email||"—"}</td><td>${p.role||"student"}</td>
              <td>
                <button class="btn ghost" data-admin-edit="${p.uid}"><i class="ri-edit-line"></i></button>
                <button class="btn danger" data-admin-del="${p.uid}"><i class="ri-delete-bin-6-line"></i></button>
              </td>
            </tr>`).join("")}
        </tbody></table>
      </div>
    </div></div>
    <div class="card" style="grid-column:1/-1"><div class="card-body">
      <h3 style="margin:0 0 8px 0">Course Roster Tools</h3>
      <div class="grid cols-3">
        <div><label class="muted">Course</label><select id="roster-course" class="input"><option value="">Pick course…</option>${state.courses.map(c=>`<option value="${c.id}">${c.title}</option>`).join("")}</select></div>
        <div><label class="muted">Actions</label><div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" id="btn-roster-sync"><i class="ri-user-add-line"></i> Sync from Enrollments</button>
          <button class="btn ghost" id="btn-roster-view"><i class="ri-team-line"></i> View Roster</button>
        </div></div>
      </div>
      <div id="roster-out" class="muted" style="margin-top:8px"></div>
    </div></div>
  </div>`;
}

const vSettings = () => `<div class="card"><div class="card-body">
  <h3 style="margin:0 0 8px 0">Theme</h3>
  <div class="grid cols-2">
    <div><label>Palette</label><select id="theme-palette" class="input"><option value="sunrise">sunrise</option></select></div>
    <div><label>Font size</label><select id="theme-font" class="input"><option value="small">small</option><option value="medium" selected>medium</option><option value="large">large</option></select></div>
  </div>
</div></div>`;

const vGuide = () => `<div class="card"><div class="card-body"><h3>Guide</h3><div class="muted">Overview of features.</div></div></div>`;
const vContact = () => `<div class="card"><div class="card-body">
  <h3>Contact us</h3>
  <div class="grid">
    <input id="ct-name" class="input" placeholder="Your name"/>
    <input id="ct-email" class="input" placeholder="Your email" type="email"/>
    <input id="ct-subject" class="input" placeholder="Subject"/>
    <textarea id="ct-message" class="input" placeholder="Message"></textarea>
    <button class="btn" id="ct-send"><i class="ri-mail-send-line"></i> Send</button>
  </div>
</div></div>`;

function safeView(r){
  switch(r){
    case "dashboard": return vDashboard();
    case "courses": return vCourses();
    case "course-detail": return vCourseDetail(state.currentCourseId);
    case "learning": return vLearning();
    case "assessments": return vAssessments();
    case "chat": return vChat();
    case "tasks": return vTasks();
    case "profile": return vProfile();
    case "admin": return vAdmin();
    case "guide": return vGuide();
    case "settings": return vSettings();
    case "contact": return vContact();
    default: return vDashboard();
  }
}

// ---------- Render
function render(){
  let root = $("#root");
  if(!root){ root = document.createElement("div"); root.id = "root"; document.body.appendChild(root); }

  if(!auth.currentUser){
    root.innerHTML = vLogin();
    wireLogin();
    return;
  }
  root.innerHTML = layout(safeView(state.route));
  wireShell();
  wireRoute();
}

// ---------- Shell wiring
function wireShell(){
  $("#burger")?.addEventListener("click", ()=>{
    const open = document.body.classList.contains("sidebar-open");
    if(open){ document.body.classList.remove("sidebar-open"); $("#backdrop")?.classList.remove("active"); }
    else { document.body.classList.add("sidebar-open"); $("#backdrop")?.classList.add("active"); }
  });
  $("#backdrop")?.addEventListener("click", ()=>{ document.body.classList.remove("sidebar-open"); $("#backdrop")?.classList.remove("active"); });

  $("#side-nav")?.addEventListener("click", (e)=>{
    const it = e.target.closest?.(".item[data-route]");
    if(it) go(it.getAttribute("data-route"));
  });

  $("#btnLogout")?.addEventListener("click", ()=> auth.signOut());

  // live search (simplified)
  const input = $("#globalSearch"), results = $("#searchResults");
  if(input && results){
    let t;
    input.addEventListener("input", ()=>{
      clearTimeout(t);
      const q = input.value.trim().toLowerCase();
      if(!q){ results.classList.remove("active"); results.innerHTML=""; return; }
      t = setTimeout(()=>{
        const ix=[];
        state.courses.forEach(c=> ix.push({label:c.title, route:"courses", id:c.id, section:"Courses"}));
        state.quizzes.forEach(qz=> ix.push({label:qz.title, route:"assessments", id:qz.id, section:"Finals"}));
        state.profiles.forEach(p=> ix.push({label:p.name||p.email, route:"profile", id:p.uid, section:"Profiles"}));
        const out = ix.filter(x=> (x.label||"").toLowerCase().includes(q)).slice(0,12);
        results.innerHTML = out.map(r=> `<div class="row" data-route="${r.route}" data-id="${r.id}"><strong>${r.label}</strong> <span class="muted">— ${r.section}</span></div>`).join("");
        results.classList.add("active");
        $$("#searchResults .row").forEach(row=> row.onclick = ()=>{ go(row.getAttribute("data-route")); results.classList.remove("active"); });
      }, 120);
    });
    document.addEventListener("click", (e)=>{
      if(results && e.target!==input && !results.contains(e.target)) results.classList.remove("active");
    }, { capture:true });
  }
}

function wireRoute(){
  switch(state.route){
    case "dashboard": wireAnnouncements(); break;
    case "courses": wireCourses(); break;
    case "course-detail": wireCourseDetail(); break;
    case "learning": wireLearning(); break;
    case "assessments": wireAssessments(); break;
    case "chat": wireChat(); break;
    case "tasks": wireTasks(); break;
    case "profile": wireProfile(); break;
    case "admin": wireAdmin(); break;
    case "contact": wireContact(); break;
  }
}

// ---------- Login
function wireLogin(){
  const doLogin = async ()=>{
    const email = $("#li-email")?.value.trim(), pass = $("#li-pass")?.value.trim();
    if(!email||!pass) return notify("Enter email & password", "warn");
    await auth.signInWithEmailAndPassword(email, pass);
  };
  $("#btnLogin")?.addEventListener("click", safe(doLogin));
  $("#li-pass")?.addEventListener("keydown", (e)=>{ if(e.key==="Enter") doLogin(); });
  $("#link-forgot")?.addEventListener("click", safe(async ()=>{
    const email = $("#li-email")?.value.trim();
    if(!email) return notify("Enter email first", "warn");
    await auth.sendPasswordResetEmail(email);
    notify("Reset email sent");
  }));
  $("#link-register")?.addEventListener("click", safe(async ()=>{
    const email = $("#li-email")?.value.trim();
    const pass = $("#li-pass")?.value.trim() || "admin123";
    if(!email) return notify("Enter email then click Sign Up again", "warn");
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    const uid = cred.user.uid;
    await Promise.all([
      docRef("roles", uid).set({ uid, email, role:"student", createdAt: firebase.firestore.FieldValue.serverTimestamp() }),
      docRef("profiles", uid).set({ uid, email, name:"", bio:"", portfolio:"", role:"student", createdAt: firebase.firestore.FieldValue.serverTimestamp() })
    ]);
    notify("Account created — sign in");
  }));
}

// ---------- Announcements
function wireAnnouncements(){
  if(canManageUsers()){
    $("#add-ann")?.addEventListener("click", ()=>{
      openModal("Announcement", `
        <div class="grid"><input id="an-title" class="input" placeholder="Title"/><textarea id="an-body" class="input" placeholder="Body"></textarea></div>
      `, `<button class="btn" id="an-save">Save</button>`);
      $("#an-save")?.addEventListener("click", safe(async ()=>{
        await col("announcements").add({ title: $("#an-title")?.value.trim(), body: $("#an-body")?.value.trim(), createdAt: firebase.firestore.FieldValue.serverTimestamp(), uid: auth.currentUser.uid });
        closeModal(); notify("Announcement posted");
      }));
    });
    $("#ann-list")?.addEventListener("click", safe(async (e)=>{
      const ed = e.target.closest?.("[data-edit-ann]");
      const del = e.target.closest?.("[data-del-ann]");
      if(ed){
        const id = ed.getAttribute("data-edit-ann");
        const s = await docRef("announcements", id).get(); if(!s.exists) return;
        const a = { id:s.id, ...s.data() };
        openModal("Edit Announcement", `
          <div class="grid"><input id="an-title" class="input" value="${(a.title||"").replace(/"/g,"&quot;")}"/><textarea id="an-body" class="input">${a.body||""}</textarea></div>
        `, `<button class="btn" id="an-save">Save</button>`);
        $("#an-save").addEventListener("click", safe(async ()=>{
          await docRef("announcements", id).set({ title: $("#an-title").value.trim(), body: $("#an-body").value.trim(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
          closeModal(); notify("Saved");
        }));
      }
      if(del){
        const id = del.getAttribute("data-del-ann");
        await docRef("announcements", id).delete(); notify("Deleted");
      }
    }));
  }
}

// ---------- Courses
function wireCourses(){
  $("#add-course")?.addEventListener("click", ()=>{
    openModal("New Course", `
      <div class="grid">
        <input id="c-title" class="input" placeholder="Title"/>
        <input id="c-category" class="input" placeholder="Category"/>
        <input id="c-credits" class="input" type="number" placeholder="Credits" value="0"/>
        <input id="c-price" class="input" type="number" placeholder="Price" value="0"/>
        <textarea id="c-short" class="input" placeholder="Short description"></textarea>
        <input id="c-cover" class="input" placeholder="Cover image URL"/>
        <input id="c-outlineUrl" class="input" placeholder="/data/outlines/your-course.json"/>
        <input id="c-quizzesUrl" class="input" placeholder="/data/lesson-quizzes/your-course.json"/>
      </div>
    `, `<button class="btn" id="c-save">Save</button>`);
    $("#c-save").addEventListener("click", safe(async ()=>{
      const title = $("#c-title")?.value.trim(); if(!title) return notify("Title required","warn");
      await col("courses").add({
        title, category: $("#c-category")?.value.trim(), credits:+($("#c-credits")?.value||0), price:+($("#c-price")?.value||0),
        short: $("#c-short")?.value.trim(), coverImage: $("#c-cover")?.value.trim(), outlineUrl: $("#c-outlineUrl")?.value.trim(), quizzesUrl: $("#c-quizzesUrl")?.value.trim(),
        ownerUid: auth.currentUser.uid, ownerEmail: auth.currentUser.email, participants:[auth.currentUser.uid], createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      closeModal(); notify("Saved");
    }));
  });

  const sec = $('[data-sec="courses"]');
  if(!sec || sec.__wired) return; sec.__wired = true;

  sec.addEventListener("click", safe(async (e)=>{
    const open = e.target.closest?.("[data-open]");
    const edit = e.target.closest?.("[data-edit]");
    const del = e.target.closest?.("[data-del]");
    if(open){
      state.currentCourseId = open.getAttribute("data-open"); state.detailPrevRoute = "courses"; go("course-detail");
    }
    if(edit){
      if(!canTeach()) return notify("No permission","warn");
      const id = edit.getAttribute("data-edit");
      const s = await docRef("courses", id).get(); if(!s.exists) return;
      const c = { id:s.id, ...s.data() };
      openModal("Edit Course", `
        <div class="grid">
          <input id="c-title" class="input" value="${(c.title||"").replace(/"/g,"&quot;")}"/>
          <input id="c-category" class="input" value="${(c.category||"").replace(/"/g,"&quot;")}"/>
          <input id="c-credits" class="input" type="number" value="${c.credits||0}"/>
          <input id="c-price" class="input" type="number" value="${c.price||0}"/>
          <textarea id="c-short" class="input">${c.short||""}</textarea>
          <input id="c-cover" class="input" value="${(c.coverImage||"").replace(/"/g,"&quot;")}"/>
          <input id="c-outlineUrl" class="input" value="${(c.outlineUrl||"").replace(/"/g,"&quot;")}"/>
          <input id="c-quizzesUrl" class="input" value="${(c.quizzesUrl||"").replace(/"/g,"&quot;")}"/>
        </div>
      `, `<button class="btn" id="c-save">Save</button>`);
      $("#c-save").addEventListener("click", safe(async ()=>{
        await docRef("courses", id).set({
          title: $("#c-title").value.trim(),
          category: $("#c-category").value.trim(),
          credits:+($("#c-credits").value||0),
          price:+($("#c-price").value||0),
          short: $("#c-short").value.trim(),
          coverImage: $("#c-cover").value.trim(),
          outlineUrl: $("#c-outlineUrl").value.trim(),
          quizzesUrl: $("#c-quizzesUrl").value.trim(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge:true });
        closeModal(); notify("Saved");
      }));
    }
    if(del){
      if(!canTeach()) return notify("No permission","warn");
      const id = del.getAttribute("data-del");
      await docRef("courses", id).delete(); notify("Course deleted");
    }
  }));
}

function wireCourseDetail(){
  $("#cd-back")?.addEventListener("click", ()=> go(state.detailPrevRoute||"courses"));
  $("#cd-finals")?.addEventListener("click", ()=> go("assessments"));
  $("#cd-enroll")?.addEventListener("click", safe(async ()=>{
    const c = findCourse(state.currentCourseId);
    await col("enrollments").add({ uid:auth.currentUser.uid, courseId:c.id, createdAt: firebase.firestore.FieldValue.serverTimestamp(), course: { id:c.id, title:c.title, category:c.category, credits:c.credits, coverImage:c.coverImage } });
    await docRef("courses", c.id).set({ participants: firebase.firestore.FieldValue.arrayUnion(auth.currentUser.uid) }, { merge:true });
    notify("Enrolled");
  }));
  $("#cd-show-pay")?.addEventListener("click", ()=>{
    const zone = $("#paypal-zone"); const btns = $("#paypal-buttons");
    if(!zone||!btns) return; zone.classList.remove("hidden"); btns.innerHTML = "";
    if(!window.paypal){
      if(!window.__PAYPAL_CLIENT_ID) { btns.innerHTML = `<div class="muted">PayPal client id missing.</div>`; return; }
      const s = document.createElement("script");
      s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(window.__PAYPAL_CLIENT_ID)}&currency=USD`;
      s.onload = ()=> setupPayPalForCourse(findCourse(state.currentCourseId));
      s.onerror = ()=> btns.innerHTML = `<div class="muted">PayPal SDK failed to load.</div>`;
      document.head.appendChild(s);
    } else {
      setupPayPalForCourse(findCourse(state.currentCourseId));
    }
  });
}
function setupPayPalForCourse(c){
  const btns = $("#paypal-buttons"); if(!btns) return;
  paypal.Buttons({
    createOrder: (data, actions)=> actions.order.create({ purchase_units:[{ description: c.title||"Course", amount:{ value: Number(c.price||0).toFixed(2) } }] }),
    onApprove: async (data, actions)=>{
      const details = await actions.order.capture();
      await col("payments").add({ uid:auth.currentUser.uid, courseId:c.id, amount:+(c.price||0), provider:"paypal", orderId:data.orderID, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      await col("enrollments").add({ uid:auth.currentUser.uid, courseId:c.id, createdAt: firebase.firestore.FieldValue.serverTimestamp(), course:{ id:c.id, title:c.title, category:c.category, credits:c.credits, coverImage:c.coverImage } });
      await docRef("courses", c.id).set({ participants: firebase.firestore.FieldValue.arrayUnion(auth.currentUser.uid) }, { merge:true });
      notify("Payment complete — enrolled");
    },
    onError: (err)=>{ console.error(err); notify("PayPal error","danger"); }
  }).render("#paypal-buttons");
}

// ---------- Learning
function wireLearning(){
  const sec = $('[data-sec="learning"]'); if(!sec || sec.__wired) return; sec.__wired = true;
  sec.addEventListener("click", (e)=>{
    const b = e.target.closest?.("[data-open-course]"); if(!b) return;
    state.currentCourseId = b.getAttribute("data-open-course");
    state.detailPrevRoute = "learning"; go("course-detail");
  });
}

// ---------- Assessments (Finals)
function wireAssessments(){
  $("#new-quiz")?.addEventListener("click", ()=>{
    openModal("New Final", `
      <div class="grid">
        <input id="q-title" class="input" placeholder="Final title"/>
        <select id="q-course" class="input">${state.courses.map(c=>`<option value="${c.id}">${c.title}</option>`).join("")}</select>
        <input id="q-pass" class="input" type="number" value="70" placeholder="Pass score (%)"/>
        <textarea id="q-json" class="input" placeholder='[{"q":"2+2?","choices":["3","4","5"],"answer":1}]'></textarea>
      </div>
    `, `<button class="btn" id="q-save">Save</button>`);
    $("#q-save").addEventListener("click", safe(async ()=>{
      const title = $("#q-title").value.trim(); const courseId = $("#q-course").value; const pass = +($("#q-pass").value||70);
      if(!title||!courseId) return notify("Fill title & course","warn");
      let items=[]; try{ items = JSON.parse($("#q-json").value||"[]"); }catch{ return notify("Invalid JSON","danger"); }
      const course = state.courses.find(c=>c.id===courseId)||{};
      await col("quizzes").add({ title, courseId, courseTitle:course.title, passScore:pass, items, isFinal:true, ownerUid:auth.currentUser.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      closeModal(); notify("Final saved");
    }));
  });

  const sec = $('[data-sec="quizzes"]'); if(!sec || sec.__wired) return; sec.__wired = true;
  sec.addEventListener("click", safe(async (e)=>{
    const take = e.target.closest?.("[data-take]");
    const edit = e.target.closest?.("[data-edit]");
    const del = e.target.closest?.("[data-del]");
    if(take){
      const id = take.getAttribute("data-take");
      const s = await docRef("quizzes", id).get(); if(!s.exists) return;
      const q = { id:s.id, ...s.data() };
      openModal(q.title, q.items.map((it,idx)=>`
        <div class="card"><div class="card-body">
          <div style="font-weight:700">Q${idx+1}. ${it.q}</div>
          <div style="margin-top:6px;display:grid;gap:6px">
            ${(it.choices||[]).map((c,i)=>`<label style="display:flex;gap:8px;align-items:center"><input type="radio" name="q${idx}" value="${i}"/> <span>${c}</span></label>`).join("")}
          </div>
          <div class="muted" id="fb-${idx}" style="margin-top:6px"></div>
        </div></div>
      `).join(""), `<button class="btn" id="q-submit"><i class="ri-checkbox-circle-line"></i> Submit</button>`);
      $("#mm-body").addEventListener("change", (ev)=>{
        const t = ev.target; if(!t?.name?.startsWith("q")) return;
        const idx = +t.name.slice(1); const it = (q.items||[])[idx]; if(!it) return;
        const fb = $(`#fb-${idx}`); if(!fb) return;
        fb.textContent = (+t.value === +it.answer) ? (it.feedbackOk||"Correct") : (it.feedbackNo||"Incorrect");
        fb.style.color = (+t.value === +it.answer) ? "var(--ok)" : "var(--danger)";
      });
      $("#q-submit").addEventListener("click", safe(async ()=>{
        let correct=0; (q.items||[]).forEach((it,idx)=>{ const v = document.querySelector(`input[name="q${idx}"]:checked`)?.value ?? "-1"; if(+v===+it.answer) correct++; });
        const total = (q.items||[]).length || 1; const score = Math.round((correct/total)*100);
        await col("attempts").add({ uid:auth.currentUser.uid, email:auth.currentUser.email, quizId:q.id, quizTitle:q.title, courseId:q.courseId, score, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        closeModal(); notify(`Score: ${score}%`);
      }));
    }
    if(edit){
      const id = edit.getAttribute("data-edit");
      const s = await docRef("quizzes", id).get(); if(!s.exists) return;
      const q = { id:s.id, ...s.data() };
      openModal("Edit Final", `
        <div class="grid">
          <input id="q-title" class="input" value="${(q.title||"").replace(/"/g,"&quot;")}"/>
          <input id="q-pass" class="input" type="number" value="${q.passScore||70}"/>
          <textarea id="q-json" class="input">${JSON.stringify(q.items||[], null, 2)}</textarea>
        </div>
      `, `<button class="btn" id="q-save"><i class="ri-save-3-line"></i> Save</button>`);
      $("#q-save").addEventListener("click", safe(async ()=>{
        let items=[]; try{ items = JSON.parse($("#q-json").value||"[]"); }catch{ return notify("Invalid JSON","danger"); }
        await docRef("quizzes", id).set({ title: $("#q-title").value.trim(), passScore:+($("#q-pass").value||70), items, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
        closeModal(); notify("Final updated");
      }));
    }
    if(del){
      const id = del.getAttribute("data-del"); await docRef("quizzes", id).delete(); notify("Final deleted");
    }
  }));
}

// ---------- Chat
function listRecipientsByCourse(cid){
  const course = state.courses.find(c=>c.id===cid);
  const ids = (course?.participants && course.participants.length) ? course.participants : state.profiles.map(p=>p.uid);
  const my = auth.currentUser?.uid; const by = new Map(state.profiles.map(p=>[p.uid, p]));
  return ids.filter(id=>id && id!==my).map(id=> by.get(id)).filter(Boolean).sort((a,b)=> (a.name||a.email||"").localeCompare(b.name||b.email||""));
}
function populateDmUserSelect(){
  const sel = $("#chat-dm"); if(!sel) return;
  const cid = $("#chat-course")?.value || "";
  const users = cid ? listRecipientsByCourse(cid) : state.profiles.filter(p=>p.uid!==auth.currentUser?.uid);
  sel.innerHTML = '<option value="">Pick user…</option>' + users.map(p=>`<option value="${p.uid}">${p.name||p.email}</option>`).join("");
}
function wireChat(){
  const box = $("#chat-box"); const modeSel = $("#chat-mode"); const courseSel=$("#chat-course"); const dmSel=$("#chat-dm"); const groupInp=$("#chat-group"); const input=$("#chat-input"); const send=$("#chat-send");
  const uiByMode = ()=>{
    const m = modeSel.value;
    courseSel.classList.toggle("hidden", m!=="course");
    dmSel.classList.toggle("hidden", m!=="dm");
    groupInp.classList.toggle("hidden", m!=="group");
    if(m==="dm") populateDmUserSelect();
  };
  if(!courseSel.value && state.courses.length) courseSel.value = state.courses[0].id;
  uiByMode();

  function chKey(){
    const m = modeSel.value;
    if(m==="course"){ const c=courseSel.value; return c?`course_${c}`:""; }
    if(m==="dm"){ const peer = dmSel.value; if(!peer) return ""; const pair=[auth.currentUser.uid, peer].sort(); return `dm_${pair[0]}_${pair[1]}`; }
    const gid = (groupInp.value||"").trim(); return gid?`group_${gid}`:"";
  }
  function paint(msgs){
    if(!Array.isArray(msgs)||!msgs.length){ box.innerHTML = '<div class="muted">No messages yet.</div>'; return; }
    box.innerHTML = msgs.sort((a,b)=>(a.createdAt?.toMillis?.()||0)-(b.createdAt?.toMillis?.()||0)).map(m=>`
      <div style="margin-bottom:8px;border-bottom:1px dashed var(--border);padding-bottom:6px">
        <div style="display:flex;justify-content:space-between;gap:8px">
          <div style="font-weight:600">${m.name||m.email||"User"} <span class="muted" style="font-size:12px">• ${new Date(m.createdAt?.toDate?.()||Date.now()).toLocaleTimeString()}</span></div>
          ${(canManageUsers() || m.uid===auth.currentUser?.uid)?`
            <div style="display:flex;gap:6px">
              <button class="btn ghost" data-edit-msg="${m.id}"><i class="ri-edit-line"></i></button>
              <button class="btn danger" data-del-msg="${m.id}"><i class="ri-delete-bin-6-line"></i></button>
            </div>`:""}
        </div>
        <div>${(m.text||"").replace(/</g,"&lt;")}</div>
      </div>
    `).join("");
    box.scrollTop = box.scrollHeight;
  }
  function sub(){
    if(state._chatUnsub){ try{ state._chatUnsub(); }catch{} state._chatUnsub=null; }
    const ch = chKey(); if(!ch){ box.innerHTML='<div class="muted">Pick channel…</div>'; return; }
    state._chatUnsub = col("messages").where("channel","==",ch).onSnapshot(
      s=> paint(s.docs.map(d=>({ id:d.id, ...d.data() }))), err=>{ console.warn(err); notify("Chat read failed","danger"); }
    );
  }

  modeSel?.addEventListener("change", ()=>{ uiByMode(); sub(); });
  courseSel?.addEventListener("change", ()=>{ populateDmUserSelect(); sub(); });
  dmSel?.addEventListener("change", sub);
  groupInp?.addEventListener("input", sub);
  groupInp?.addEventListener("keydown", (e)=>{ if(e.key==="Enter") sub(); });

  send?.addEventListener("click", safe(async ()=>{
    const ch = chKey(); const text = input.value.trim();
    if(!ch) return notify("Pick a channel first","warn"); if(!text) return;
    const me = state.profiles.find(p=>p.uid===auth.currentUser?.uid)||{};
    await col("messages").add({ channel:ch, type:modeSel.value, uid:auth.currentUser.uid, email:auth.currentUser.email, name:me.name||"", text, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      courseId: modeSel.value==="course"?courseSel.value:undefined, peerUid: modeSel.value==="dm"?dmSel.value:undefined, groupId: modeSel.value==="group"?groupInp.value.trim():undefined
    });
    input.value="";
  }));

  box?.addEventListener("click", safe(async (e)=>{
    const em = e.target.closest?.("[data-edit-msg]"); const dm = e.target.closest?.("[data-del-msg]");
    if(em){
      const id = em.getAttribute("data-edit-msg");
      const s = await docRef("messages", id).get(); if(!s.exists) return;
      const m = { id:s.id, ...s.data() };
      if(!(canManageUsers() || m.uid===auth.currentUser?.uid)) return notify("No permission","warn");
      openModal("Edit Message", `<textarea id="msg-text" class="input">${m.text||""}</textarea>`, `<button class="btn" id="msg-save">Save</button>`);
      $("#msg-save").addEventListener("click", safe(async ()=>{
        await docRef("messages", id).set({ text: $("#msg-text").value.trim(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
        closeModal(); notify("Updated");
      }));
    }
    if(dm){
      const id = dm.getAttribute("data-del-msg");
      const s = await docRef("messages", id).get(); if(!s.exists) return;
      const m = s.data(); if(!(canManageUsers() || m.uid===auth.currentUser?.uid)) return notify("No permission","warn");
      await docRef("messages", id).delete(); notify("Deleted");
    }
  }));

  sub();
}

// ---------- Contact
function wireContact(){
  $("#ct-send")?.addEventListener("click", safe(async ()=>{
    const name = $("#ct-name").value.trim(), email=$("#ct-email").value.trim(), subject=$("#ct-subject").value.trim(), message=$("#ct-message").value.trim();
    if(!name||!email||!subject||!message) return notify("Fill all fields","warn");
    if(!window.emailjs) return notify("EmailJS SDK missing","danger");
    try{ if(window.__EMAILJS_CONFIG?.publicKey) emailjs.init(window.__EMAILJS_CONFIG.publicKey); }catch{}
    await col("contact").add({ uid:auth.currentUser?.uid||null, name,email,subject,message, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    await emailjs.send(window.__EMAILJS_CONFIG.serviceId, window.__EMAILJS_CONFIG.templateId, { from_name:name, from_email:email, subject, message, to_email: window.__EMAILJS_CONFIG.toEmail||undefined, user_uid:auth.currentUser?.uid||"" });
    notify("Message sent — thank you!"); $("#ct-subject").value=""; $("#ct-message").value="";
  }));
}

// ---------- Tasks
function wireTasks(){
  const sec = $('[data-sec="tasks"]'); if(!sec || sec.__wired) return; sec.__wired = true;

  $("#addTask")?.addEventListener("click", ()=>{
    openModal("New Task", `<input id="t-title" class="input" placeholder="Task title"/>`, `<button class="btn" id="t-save">Save</button>`);
    $("#t-save").addEventListener("click", safe(async ()=>{
      const title = $("#t-title").value.trim(); if(!title) return notify("Enter a title","warn");
      await col("tasks").add({ uid:auth.currentUser.uid, title, status:"todo", createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      closeModal(); notify("Task added");
    }));
  });
  sec.addEventListener("click", safe(async (e)=>{
    const ed = e.target.closest?.("[data-edit]"); const del = e.target.closest?.("[data-del]");
    if(ed){
      const id = ed.getAttribute("data-edit"); const s = await docRef("tasks", id).get(); if(!s.exists) return;
      const t = { id:s.id, ...s.data() };
      openModal("Edit Task", `<input id="t-title" class="input" value="${(t.title||"").replace(/"/g,"&quot;")}" style="width:100%"/>`, `<button class="btn" id="t-save">Save</button>`);
      $("#t-save").addEventListener("click", safe(async ()=>{
        await docRef("tasks", id).set({ title: $("#t-title").value.trim(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
        closeModal(); notify("Saved");
      }));
    }
    if(del){
      const id = del.getAttribute("data-del"); await docRef("tasks", id).delete(); notify("Deleted");
    }
  }));
}

// ---------- Profile
function wireProfile(){
  $("#pf-pick")?.addEventListener("click", ()=> $("#pf-avatar")?.click());
  $("#pf-pick-sign")?.addEventListener("click", ()=> $("#pf-sign")?.click());

  $("#pf-save")?.addEventListener("click", safe(async ()=>{
    const uid = auth.currentUser.uid;
    const base = { uid, email: auth.currentUser.email||"", name: $("#pf-name").value.trim(), portfolio: $("#pf-portfolio").value.trim(), bio: $("#pf-bio").value.trim(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    await docRef("profiles", uid).set(base, { merge:true });
    const fileA = $("#pf-avatar")?.files?.[0]; if(fileA){ const ref = stg.ref().child(`avatars/${uid}/${Date.now()}_${fileA.name}`); await ref.put(fileA); const url = await ref.getDownloadURL(); await docRef("profiles", uid).set({ avatar:url, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true }); }
    const fileS = $("#pf-sign")?.files?.[0]; if(fileS){ const ref = stg.ref().child(`signatures/${uid}/${Date.now()}_${fileS.name}`); await ref.put(fileS); const url = await ref.getDownloadURL(); await docRef("profiles", uid).set({ signature:url, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true }); }
    notify("Profile saved");
  }));

  $("#pf-view")?.addEventListener("click", ()=>{
    const me = state.profiles.find(p=>p.uid===auth.currentUser?.uid) || {};
    openModal("Profile Card", `
      <div style="background:linear-gradient(135deg,#f8fafc,#eef2ff);border:1px solid var(--border);border-radius:14px;padding:16px;display:grid;gap:12px">
        <div style="display:flex;gap:12px;align-items:center">
          <img src="${me.avatar||"/icons/learnhub-cap.svg"}" alt="avatar" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:1px solid var(--border);background:#fff"/>
          <div><div style="font-weight:800;font-size:18px">${me.name||me.email||"—"}</div><div class="muted">${me.email||""}</div></div>
        </div>
        <div style="white-space:pre-wrap">${(me.bio||"").replace(/</g,"&lt;")}</div>
        ${me.signature?`<div><div class="muted" style="margin-bottom:4px">Signature</div><img src="${me.signature}" alt="signature" style="max-height:60px;background:#fff;border:1px solid var(--border);border-radius:8px;padding:6px"></div>`:""}
      </div>
    `, `<button class="btn" id="mm-ok">Close</button>`);
    $("#mm-ok").addEventListener("click", ()=> closeModal());
  });

  $("#pf-delete")?.addEventListener("click", safe(async ()=>{
    await docRef("profiles", auth.currentUser.uid).delete(); notify("Profile deleted");
  }));

  // certificate download (simple)
  $("#main")?.addEventListener("click", (e)=>{
    const b = e.target.closest?.("[data-cert]"); if(!b) return;
    const cid = b.getAttribute("data-cert"); const c = state.courses.find(x=>x.id===cid)||{};
    const p = state.profiles.find(x=>x.uid===auth.currentUser?.uid)||{ name: auth.currentUser.email };
    const certId = `LH-${(cid||"xxxx").slice(0,6).toUpperCase()}-${(auth.currentUser.uid||"user").slice(0,6).toUpperCase()}`;
    const canvas = document.createElement("canvas"); canvas.width=1200; canvas.height=800; const ctx = canvas.getContext("2d");
    ctx.fillStyle="#fff"; ctx.fillRect(0,0,1200,800); ctx.strokeStyle="#111"; ctx.strokeRect(40,40,1120,720);
    ctx.fillStyle="#111"; ctx.font="bold 42px Georgia"; ctx.textAlign="center"; ctx.fillText("Certificate of Completion", 600, 140);
    ctx.font="28px Inter"; ctx.fillText("This certifies that", 600, 220);
    ctx.font="bold 48px Georgia"; ctx.fillText(p.name||p.email, 600, 280);
    ctx.font="28px Inter"; ctx.fillText("has successfully completed", 600, 330);
    ctx.font="bold 36px Inter"; ctx.fillText(c.title||cid, 600, 380);
    ctx.font="20px Inter"; const dateText = new Date().toLocaleDateString(); ctx.fillText(`Date: ${dateText}   •   Certificate ID: ${certId}`, 600, 440);
    const url = canvas.toDataURL("image/png"); const a = document.createElement("a"); a.href=url; a.download=`certificate_${(c.title||"course").replace(/\s+/g,"_")}.png`; a.click();
  });
}

// ---------- Admin
function wireAdmin(){
  $("#rm-save")?.addEventListener("click", safe(async ()=>{
    const uid = $("#rm-uid").value.trim(); const role = ($("#rm-role").value||"student").toLowerCase();
    if(!uid) return notify("Enter UID + role","warn");
    await docRef("roles", uid).set({ uid, role, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
    notify("Role saved");
  }));

  $("#main")?.addEventListener("click", safe(async (e)=>{
    const ed = e.target.closest?.("[data-admin-edit]"); const del = e.target.closest?.("[data-admin-del]");
    if(ed){
      const uid = ed.getAttribute("data-admin-edit"); const s = await docRef("profiles", uid).get(); if(!s.exists) return;
      const p = { id:s.id, ...s.data() };
      openModal("Edit Profile (admin)", `<div class="grid"><input id="ap-name" class="input" value="${p.name||""}"/><input id="ap-portfolio" class="input" value="${p.portfolio||""}"/><textarea id="ap-bio" class="input">${p.bio||""}</textarea></div>`, `<button class="btn" id="ap-save">Save</button>`);
      $("#ap-save").addEventListener("click", safe(async ()=>{
        await docRef("profiles", uid).set({ name: $("#ap-name").value.trim(), portfolio: $("#ap-portfolio").value.trim(), bio: $("#ap-bio").value.trim(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
        closeModal(); notify("Saved");
      }));
    }
    if(del){
      const uid = del.getAttribute("data-admin-del"); await docRef("profiles", uid).delete(); notify("Profile deleted");
    }
  }));

  $("#btn-roster-sync")?.addEventListener("click", safe(async ()=>{
    const cid = $("#roster-course").value; if(!cid) return notify("Pick a course","warn");
    const [enr, cSnap] = await Promise.all([ col("enrollments").where("courseId","==",cid).get(), docRef("courses", cid).get() ]);
    const uids = new Set(enr.docs.map(d=>d.data().uid)); const c = cSnap.data()||{}; if(c.ownerUid) uids.add(c.ownerUid);
    await docRef("courses", cid).set({ participants: Array.from(uids) }, { merge:true });
    notify("Roster synced"); $("#roster-out").textContent = `Participants: ${Array.from(uids).join(", ")}`;
  }));

  $("#btn-roster-view")?.addEventListener("click", safe(async ()=>{
    const cid = $("#roster-course").value; if(!cid) return notify("Pick a course","warn");
    const s = await docRef("courses", cid).get(); const arr = s.data()?.participants||[]; $("#roster-out").textContent = `Participants: ${arr.join(", ")||"—"}`;
  }));
}

// ---------- Data listeners
function clearUnsubs(){ state.unsub.forEach(u=>{ try{u();}catch{} }); state.unsub=[]; if(state._chatUnsub){ try{state._chatUnsub();}catch{} state._chatUnsub=null; }}

auth.onAuthStateChanged(async (u)=>{
  clearUnsubs();
  state.user = u;
  if(!u){ render(); return; }
  state.unsub.push(listenRole(u.uid));

  // Listen key collections
  state.unsub.push(col("announcements").orderBy("createdAt","desc").onSnapshot(s=>{
    state.announcements = s.docs.map(d=>({ id:d.id, ...d.data() })); if(state.route==="dashboard") render();
  }));
  state.unsub.push(col("courses").onSnapshot(s=>{ state.courses = s.docs.map(d=>({ id:d.id, ...d.data() })); if(["courses","course-detail","learning","admin","assessments","chat"].includes(state.route)) render(); }));
  state.unsub.push(col("quizzes").onSnapshot(s=>{ state.quizzes = s.docs.map(d=>({ id:d.id, ...d.data() })); if(state.route==="assessments") render(); }));
  state.unsub.push(col("tasks").where("uid","==",u.uid).onSnapshot(s=>{ state.tasks = s.docs.map(d=>({ id:d.id, ...d.data() })); if(state.route==="tasks") render(); }));
  state.unsub.push(col("profiles").onSnapshot(s=>{ state.profiles = s.docs.map(d=>({ id:d.id, ...d.data() })); if(["profile","admin","chat"].includes(state.route)) render(); }));
  state.unsub.push(col("enrollments").where("uid","==",u.uid).onSnapshot(s=>{ state.enrollments = s.docs.map(d=>({ id:d.id, ...d.data() })); if(["learning","course-detail"].includes(state.route)) render(); }));
  state.unsub.push(col("attempts").where("uid","==",u.uid).onSnapshot(s=>{ state.attempts = s.docs.map(d=>({ id:d.id, ...d.data() })); if(state.route==="assessments") render(); }));

  render();
});

// ---------- Global error surfacing
window.addEventListener("error", (e)=>{ notify(`Error: ${e.message}`,"danger"); console.error("Global error:", e.error||e); });
window.addEventListener("unhandledrejection", (e)=>{ const m=e?.reason?.message||e?.reason||"Unhandled rejection"; notify(m,"danger"); console.error("Unhandled:", e.reason); });

// ---------- Start
onReady(render);
