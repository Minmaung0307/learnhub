// ===== one-time init guard (prevents duplicate runs) =====
if (window.__LEARNHUB_INITTED__) {
  console.warn("main.js already initialized – aborting duplicate run");
  throw new Error("Duplicate main.js include");
}
window.__LEARNHUB_INITTED__ = true;
// ========================================================

// ---- KEEP your inline config but use safe assignments (avoid invalid LHS) ----
if (!window.__FIREBASE_CONFIG) {
  window.__FIREBASE_CONFIG = {
    apiKey: "AIzaSyDVsqq0FLiGUp1I7JjH_yeYZBpqlDSo-uM",
    authDomain: "learnhub-mm.firebaseapp.com",
    projectId: "learnhub-mm",
    // IMPORTANT: use appspot.com here (the other host breaks Storage)
    storageBucket: "learnhub-mm.appspot.com",
    messagingSenderId: "961341989824",
    appId: "1:961341989824:web:760be616c75561008cde25",
    measurementId: "G-LM292D5D36",
  };
}

if (!window.__EMAILJS_CONFIG) {
  window.__EMAILJS_CONFIG = {
    publicKey: "WT0GOYrL9HnDKvLUf",
    serviceId: "service_z9tkmvr",
    templateId: "template_q5q471f",
    toEmail: "minmaung0307@gmail.com",
  };
}

if (!window.__PAYPAL_CLIENT_ID) {
  window.__PAYPAL_CLIENT_ID =
    "AVpfmQ8DyyatFaAGQ3Jg58XtUt_2cJDr1leqcc_JI8LvKIR2N5WB_yljqCOTTCtvK1hFJ7Q9X0ojXsEC";
}

// ------- Firebase (v10 modular) -------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// ------- App namespace -------
window.App = window.App || {};
App.state = { user: null, role: "guest", isAdmin: false, seededVersion: null };
App.ui = App.ui || {};
App.routes = App.routes || {};
App.services = App.services || {};
App.features = App.features || {};
App.core = App.core || {};
App.firebase = {};

// Initialize Firebase
const app = initializeApp(window.__FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
App.firebase = { app, auth, db, storage };

export { app, auth, db, storage };

// ---------- utils ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
App.$ = $; App.$$ = $$;

function setToday() {
  $("#today")?.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "short", year: "numeric", month: "short", day: "numeric"
  });
  $("#year")?.textContent = String(new Date().getFullYear());
}
setToday();

function notify(msg, type = "info") {
  console[type === "error" ? "error" : "log"]("[LearnHub]", msg);
}

// ---------- Sidebar + burger ----------
const sidebar = $("#sidebar");
const burger = $("#burger");
if (burger) {
  burger.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("sidebar-open", open);
  });
}
window.addEventListener("hashchange", () => {
  if (sidebar.classList.contains("open")) {
    sidebar.classList.remove("open");
    document.body.classList.remove("sidebar-open");
  }
  $("#app")?.scrollTo?.({ top: 0, behavior: "instant" });
});

// ---------- Global Search ----------
$("#global-search")?.addEventListener("input", (e) => {
  const q = e.target.value.trim();
  window.dispatchEvent(new CustomEvent("learnhub:search", { detail: { q } }));
});

// ---------- Logout ----------
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action='logout']");
  if (!btn) return;
  try {
    await signOut(auth);
    location.hash = "#/login";
  } catch (err) {
    console.error("Logout failed", err);
    alert("Sign out failed.");
  }
});

// ---------- Router ----------
async function renderRoute() {
  const hash = location.hash || "#/dashboard";
  const [_, route] = hash.split("#/");
  const appEl = $("#app");
  if (!appEl) return;

  // show/hide admin menu
  const adminLink = document.querySelector("[data-admin='true']");
  if (adminLink) adminLink.style.display = App.state.isAdmin ? "" : "none";

  try {
    switch (route) {
      case "login": {
        // Try module first
        let mod = null;
        try {
          mod = await import("./features/login.js");
        } catch (e) {
          console.warn("login.js missing, using inline login");
        }
        if (mod?.renderLogin) return mod.renderLogin(appEl);
        return App.renderInlineLogin(appEl); // <— inline fallback (no blank page)
      }
      case "dashboard": {
        const mod = await safeImport("./features/dashboard.js");
        return mod?.renderDashboard
          ? mod.renderDashboard(appEl)
          : renderFallback(appEl, "Dashboard is loading…");
      }
      case "courses": {
        const mod = await safeImport("./features/courses.js");
        return mod?.renderCourses
          ? mod.renderCourses(appEl)
          : renderFallback(appEl, "Courses are loading…");
      }
      case "mylearning": {
        const mod = await safeImport("./features/mylearning.js");
        return mod?.renderMyLearning
          ? mod.renderMyLearning(appEl)
          : renderFallback(appEl, "My Learning is loading…");
      }
      case "tasks": {
        const mod = await safeImport("./features/tasks.js");
        return mod?.renderTasks
          ? mod.renderTasks(appEl)
          : renderFallback(appEl, "Tasks are loading…");
      }
      case "announcements": {
        const mod = await safeImport("./features/announcements.js");
        return mod?.renderAnnouncements
          ? mod.renderAnnouncements(appEl)
          : renderFallback(appEl, "Announcements are loading…");
      }
      case "chat": {
        const mod = await safeImport("./features/chat.js");
        return mod?.renderChat
          ? mod.renderChat(appEl)
          : renderFallback(appEl, "Course Chat is loading…");
      }
      case "finals": {
        const mod = await safeImport("./features/finals.js");
        return mod?.renderFinals
          ? mod.renderFinals(appEl)
          : renderFallback(appEl, "Finals are loading…");
      }
      case "profile": {
        const mod = await safeImport("./features/profile.js");
        return mod?.renderProfile
          ? mod.renderProfile(appEl)
          : renderFallback(appEl, "Profile is loading…");
      }
      case "guide": {
        const mod = await safeImport("./features/guide.js");
        return mod?.renderGuide
          ? mod.renderGuide(appEl)
          : renderFallback(appEl, "Guide is loading…");
      }
      case "settings": {
        const mod = await safeImport("./features/settings.js");
        return mod?.renderSettings
          ? mod.renderSettings(appEl)
          : renderFallback(appEl, "Settings are loading…");
      }
      case "admin": {
        const mod = await safeImport("./features/admin.js");
        return mod?.renderAdmin
          ? mod.renderAdmin(appEl)
          : renderFallback(appEl, "Admin is loading…");
      }
      default:
        return renderFallback(appEl, "Page not found.");
    }
  } catch (err) {
    console.error("Route render error", err);
    renderError(appEl, err);
  }
}
async function safeImport(path) {
  try { return await import(path); } catch { return null; }
}
function renderFallback(el, text) {
  el.innerHTML = `
    <section class="card p-4">
      <h2 class="mb-2">${text}</h2>
      <p>If this persists, hard refresh (Ctrl/Cmd + Shift + R).</p>
    </section>`;
}
function renderError(el, err) {
  el.innerHTML = `
    <section class="card p-4">
      <h2 class="mb-2">Something went wrong</h2>
      <pre class="error">${(err && err.message) || err}</pre>
    </section>`;
}

// ---------- Auth + Role + Auto-seed ----------
async function getRole(uid) {
  if (!uid) return "guest";
  const snap = await getDoc(doc(db, "roles", uid));
  return snap.exists() ? (snap.data().role || "student") : "student";
}

async function ensureFirstLoginSeed(user, role) {
  if (role !== "admin") return; // only admins
  try {
    const seedMetaRef = doc(db, "meta", "seed_v1");
    const seedSnap = await getDoc(seedMetaRef);
    if (!seedSnap.exists()) {
      notify("Running first-time demo seed (admin)…");
      const { seedDemoData } = await import("./services/seed.js");
      await seedDemoData({ db, projectId: app.options.projectId, reset: true });
      await setDoc(seedMetaRef, {
        version: 1, ranBy: user.uid, ranAt: serverTimestamp()
      }, { merge: true });
      App.state.seededVersion = 1;
      notify("Demo seed complete.");
    } else {
      App.state.seededVersion = seedSnap.data().version || 1;
    }
  } catch (err) {
    console.error("Auto-seed failed:", err);
    notify("Auto-seed failed. Open Admin → Tools to seed manually.", "error");
  }
}

onAuthStateChanged(auth, async (user) => {
  App.state.user = user;
  if (!user) {
    App.state.role = "guest";
    App.state.isAdmin = false;
    location.hash = "#/login";
    return renderRoute();
  }
  try {
    const role = await getRole(user.uid);
    App.state.role = role;
    App.state.isAdmin = role === "admin";
    await ensureFirstLoginSeed(user, role);
    if (!location.hash || location.hash === "#/login") location.hash = "#/dashboard";
    renderRoute();
  } catch (err) {
    console.error("Auth bootstrap failed", err);
    renderError($("#app"), err);
  }
});

// react to hash changes
window.addEventListener("hashchange", renderRoute);
window.addEventListener("load", renderRoute);

// ---- Inline Login fallback ----
App.renderInlineLogin = async function (mount) {
  mount.innerHTML = `
    <section class="card auth-card">
      <h2>Welcome to LearnHub</h2>
      <p class="muted">Sign in to continue.</p>
      <div class="btn-row">
        <button id="google-login" class="btn btn-primary">Continue with Google</button>
      </div>
    </section>
  `;
  $("#google-login", mount)?.addEventListener("click", async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      alert("Google sign-in failed.");
    }
  });
};