// ========== one-time init guard ==========
if (window.__LEARNHUB_INITTED__) {
  console.warn("main.js already initialized – aborting duplicate run");
  throw new Error("Duplicate main.js include");
}
window.__LEARNHUB_INITTED__ = true;
// ========================================

// ---- Keep your inline config exactly here ----
window.__FIREBASE_CONFIG = window.__FIREBASE_CONFIG || {
  apiKey: "AIzaSyDVsqq0FLiGUp1I7JjH_yeYZBpqlDSo-uM",
  authDomain: "learnhub-mm.firebaseapp.com",
  projectId: "learnhub-mm",
  storageBucket: "learnhub-mm.appspot.com", // NOTE: fixed common format
  messagingSenderId: "961341989824",
  appId: "1:961341989824:web:760be616c75561008cde25",
  measurementId: "G-LM292D5D36",
};

window.__EMAILJS_CONFIG = window.__EMAILJS_CONFIG || {
  publicKey: "WT0GOYrL9HnDKvLUf",
  serviceId: "service_z9tkmvr",
  templateId: "template_q5q471f",
  toEmail: "minmaung0307@gmail.com",
};

window.__PAYPAL_CLIENT_ID = window.__PAYPAL_CLIENT_ID ||
  "AVpfmQ8DyyatFaAGQ3Jg58XtUt_2cJDr1leqcc_JI8LvKIR2N5WB_yljqCOTTCtvK1hFJ7Q9X0ojXsEC";

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
App.state = {
  user: null,
  role: "guest", // guest | student | teacher | admin
  isAdmin: false,
  seededVersion: null,
};
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

// Expo for other modules
export { app, auth, db, storage };

// ---------- Basic utilities ----------
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
App.$ = $; App.$$ = $$;

function setToday() {
  const el = $("#today");
  if (el) el.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "short", year: "numeric", month: "short", day: "numeric"
  });
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
}
setToday();

function notify(msg, type = "info") {
  console[type === "error" ? "error" : "log"]("[LearnHub]", msg);
  // You can replace with a toast later
}

// ---------- Sidebar behavior ----------
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
const searchInput = $("#global-search");
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    window.dispatchEvent(new CustomEvent("learnhub:search", { detail: { q } }));
  });
}

// ---------- Logout (delegated) ----------
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

// ---------- Simple router shell ----------
async function renderRoute() {
  const hash = location.hash || "#/dashboard";
  const [_, route] = hash.split("#/");
  const appEl = $("#app");
  if (!appEl) return;

  // show/hide admin menu
  const adminLink = document.querySelector("[data-admin='true']");
  if (adminLink) {
    adminLink.style.display = App.state.isAdmin ? "" : "none";
  }

  // Route map -> lazy load modules
  try {
    switch (route) {
      case "login": {
        const mod = await import("./features/login.js").catch(() => null);
        if (mod?.renderLogin) return mod.renderLogin(appEl);
        return renderFallback(appEl, "Login page not available yet.");
      }
      case "dashboard": {
        const mod = await import("./features/dashboard.js").catch(() => null);
        if (mod?.renderDashboard) return mod.renderDashboard(appEl);
        return renderFallback(appEl, "Dashboard is loading…");
      }
      case "courses": {
        const mod = await import("./features/courses.js").catch(() => null);
        if (mod?.renderCourses) return mod.renderCourses(appEl);
        return renderFallback(appEl, "Courses are loading…");
      }
      case "mylearning": {
        const mod = await import("./features/mylearning.js").catch(() => null);
        if (mod?.renderMyLearning) return mod.renderMyLearning(appEl);
        return renderFallback(appEl, "My Learning is loading…");
      }
      case "tasks": {
        const mod = await import("./features/tasks.js").catch(() => null);
        if (mod?.renderTasks) return mod.renderTasks(appEl);
        return renderFallback(appEl, "Tasks are loading…");
      }
      case "announcements": {
        const mod = await import("./features/announcements.js").catch(() => null);
        if (mod?.renderAnnouncements) return mod.renderAnnouncements(appEl);
        return renderFallback(appEl, "Announcements are loading…");
      }
      case "chat": {
        const mod = await import("./features/chat.js").catch(() => null);
        if (mod?.renderChat) return mod.renderChat(appEl);
        return renderFallback(appEl, "Course Chat is loading…");
      }
      case "finals": {
        const mod = await import("./features/finals.js").catch(() => null);
        if (mod?.renderFinals) return mod.renderFinals(appEl);
        return renderFallback(appEl, "Finals are loading…");
      }
      case "profile": {
        const mod = await import("./features/profile.js").catch(() => null);
        if (mod?.renderProfile) return mod.renderProfile(appEl);
        return renderFallback(appEl, "Profile is loading…");
      }
      case "guide": {
        const mod = await import("./features/guide.js").catch(() => null);
        if (mod?.renderGuide) return mod.renderGuide(appEl);
        return renderFallback(appEl, "Guide is loading…");
      }
      case "settings": {
        const mod = await import("./features/settings.js").catch(() => null);
        if (mod?.renderSettings) return mod.renderSettings(appEl);
        return renderFallback(appEl, "Settings are loading…");
      }
      case "admin": {
        const mod = await import("./features/admin.js").catch(() => null);
        if (mod?.renderAdmin) return mod.renderAdmin(appEl);
        return renderFallback(appEl, "Admin is loading…");
      }
      default:
        return renderFallback(appEl, "Page not found.");
    }
  } catch (err) {
    console.error("Route render error", err);
    renderError(appEl, err);
  }
}
function renderFallback(el, text) {
  el.innerHTML = `
    <section class="card p-4">
      <h2 class="mb-2">${text}</h2>
      <p>If this persists, hard refresh the page (Ctrl/Cmd + Shift + R).</p>
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
  // Admin-only, on first login in this project
  if (role !== "admin") return;

  try {
    const seedMetaRef = doc(db, "meta", "seed_v1");
    const seedSnap = await getDoc(seedMetaRef);
    if (!seedSnap.exists()) {
      const { seedDemoData } = await import("./services/seed.js");
      notify("Running first-time demo seed (admin)…");
      await seedDemoData({ db, projectId: app.options.projectId, reset: true });
      await setDoc(seedMetaRef, {
        version: 1,
        ranBy: user.uid,
        ranAt: serverTimestamp(),
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

    // auto-seed for admins on first login
    await ensureFirstLoginSeed(user, role);

    // show dashboard by default after login
    if (!location.hash || location.hash === "#/login") {
      location.hash = "#/dashboard";
    }
    renderRoute();
  } catch (err) {
    console.error("Auth bootstrap failed", err);
    renderError($("#app"), err);
  }
});

// react to hash changes
window.addEventListener("hashchange", renderRoute);
window.addEventListener("load", renderRoute);

// ---- Simple login fallback (if features/login.js missing) ----
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
  const googleBtn = $("#google-login", mount);
  if (googleBtn) {
    googleBtn.addEventListener("click", async () => {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.error(err);
        alert("Google sign-in failed.");
      }
    });
  }
};

// If login route renders before features/login.js is present
window.addEventListener("hashchange", () => {
  if (location.hash === "#/login") {
    const mount = $("#app");
    if (mount && !mount.dataset.populated) {
      mount.dataset.populated = "1";
      App.renderInlineLogin(mount);
    }
  }
});