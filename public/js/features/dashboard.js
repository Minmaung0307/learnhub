export function renderDashboard(mount) {
  const user = window.App?.state?.user;
  const role = window.App?.state?.role || "guest";
  mount.innerHTML = `
    <section class="card p-4">
      <h2 class="mb-2">Dashboard</h2>
      <p>Signed in as: <strong>${user?.email || "n/a"}</strong> (${role})</p>
      <p class="muted">Use the sidebar to navigate. Admins can open <em>Admin</em> to bootstrap roles and seed demo content.</p>
    </section>
  `;
}