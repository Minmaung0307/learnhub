// features/dashboard.js
export default {
  route:'dashboard',
  view(){
    return `<div class="grid cols-3">
      <div class="card"><div class="card-body"><div class="muted">Courses</div><div style="font-size:22px;font-weight:800" id="k-courses">—</div></div></div>
      <div class="card"><div class="card-body"><div class="muted">Finals</div><div style="font-size:22px;font-weight:800" id="k-finals">—</div></div></div>
      <div class="card"><div class="card-body"><div class="muted">Tasks</div><div style="font-size:22px;font-weight:800" id="k-tasks">—</div></div></div>
    </div>`;
  },
  async mount(){
    const { col } = await import('../core/state.js');
    const c = await col('courses').get(); document.getElementById('k-courses').textContent = c.size;
    const q = await col('quizzes').get(); document.getElementById('k-finals').textContent = q.size;
    const t = await col('tasks').get(); document.getElementById('k-tasks').textContent = t.size;
  },
  unmount(){}
};
