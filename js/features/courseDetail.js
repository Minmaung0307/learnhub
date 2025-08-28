// features/courseDetail.js
import { state, col, doc } from '../core/state.js';
import { notify } from '../core/modal.js';

export default {
  route:'course-detail',
  view(){
    return `<div id="cd"></div>`;
  },
  async mount(){
    const root = document.getElementById('cd');
    const id = state.currentCourseId;
    if (!id){ root.innerHTML = '<div class="muted">No course selected</div>'; return; }
    const s = await doc('courses', id).get();
    const c = {id:s.id, ...s.data()};
    root.innerHTML = `<div class="card"><div class="card-body">
      <div style="display:flex;gap:8px;align-items:center;justify-content:space-between">
        <button class="btn ghost" id="cd-back">Back</button>
        <div class="badge">Credits: ${c.credits||0}</div>
      </div>
      <h2 style="margin:8px 0">${c.title||''}</h2>
      <p class="muted">${c.short||''}</p>
    </div></div>`;
    document.getElementById('cd-back').addEventListener('click', ()=>history.back());
  },
  unmount(){}
};
