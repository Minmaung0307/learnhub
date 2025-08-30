import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

export function renderAdmin(mount) {
  const { user, isAdmin } = window.App.state;
  const uid = user?.uid;

  mount.innerHTML = `
    <section class="card p-4">
      <h2 class="mb-3">Admin Tools</h2>

      <div class="grid g-2">
        <div class="card p-3">
          <h3>1) Bootstrap Admin Role</h3>
          <p class="muted">Creates your <code>roles/${uid}</code> doc if it doesn't exist. (Allowed once by rules.)</p>
          <button id="make-admin" class="btn">Make me Admin (one-time)</button>
        </div>

        <div class="card p-3">
          <h3>2) Seed Demo Data</h3>
          <p class="muted">Resets demo collections and inserts demo courses, announcements, finals, tasks, chat, etc.</p>
          <button id="seed-demo" class="btn btn-primary">Seed Demo (reset)</button>
        </div>
      </div>

      <div id="admin-status" class="mt-3 muted"></div>
    </section>
  `;

  const status = mount.querySelector("#admin-status");
  const db = window.App.firebase.db;

  mount.querySelector("#make-admin")?.addEventListener("click", async () => {
    if (!uid) return alert("No user.");
    try {
      const roleRef = doc(db, "roles", uid);
      const snap = await getDoc(roleRef);
      if (snap.exists()) {
        status.textContent = "Role already exists. You are " + (snap.data().role || "unknown") + ".";
        return;
      }
      await setDoc(roleRef, {
        role: "admin",
        email: window.App.state.user.email,
        createdAt: serverTimestamp(),
      });
      window.App.state.role = "admin";
      window.App.state.isAdmin = true;
      status.textContent = "You are now admin. You can run seeding.";
    } catch (e) {
      console.error(e);
      alert("Failed to create role. Check Firestore rules were deployed.");
    }
  });

  mount.querySelector("#seed-demo")?.addEventListener("click", async () => {
    try {
      if (!window.App.state.isAdmin) {
        return alert("You must be admin to seed.");
      }
      const { seedDemoData } = await import("../services/seed.js");
      await seedDemoData({ db, projectId: window.App.firebase.app.options.projectId, reset: true });
      await setDoc(doc(db, "meta", "seed_v1"), {
        version: 1, ranBy: uid, ranAt: serverTimestamp()
      }, { merge: true });
      status.textContent = "Demo seed complete.";
      alert("Demo seed complete. Navigate to Courses / Tasks / Announcements.");
    } catch (e) {
      console.error(e);
      alert("Seeding failed: " + (e?.message || e));
    }
  });
}