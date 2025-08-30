export function renderLogin(mount) {
  // Just delegate to the inline renderer provided by main.js
  if (window.App?.renderInlineLogin) {
    return window.App.renderInlineLogin(mount);
  }
  mount.innerHTML = `<section class="card p-4"><h2>Login</h2><p>Login module loaded.</p></section>`;
}