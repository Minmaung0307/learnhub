// features/admin.js
import { canManage, col, doc } from '../core/state.js';
import { notify } from '../core/modal.js';

export default {
  route:'admin',
  view(){
    if (!canManage()) return `<div class="card"><div class="card-body">Admins only.</div></div>`;
    return `<div class="card"><div class="card-body">
      <h3 style="margin:0 0 8px 0">Roster Tools</h3>
      <div class="grid cols-3">
        <div>
          <label class="muted">Course</label>
          <select id="roster-course" class="input"></select>
        </div>
        <div style="display:flex;gap:8px;align-items:flex-end">
          <button class="btn" id="btn-roster-sync">Sync from Enrollments</button>
          <button class="btn ghost" id="btn-roster-view">View</button>
        </div>
      </div>
      <div id="roster-out" class="muted" style="margin-top:8px"></div>
    </div></div>`;
  },
  async mount(){
    if (!canManage()) return;
    const sel = document.getElementById('roster-course');
    const s = await col('courses').get();
    sel.innerHTML = '<option value="">Select course…</option>' + s.docs.map(d=>`<option value="${d.id}">${d.data().title||'(no title)'}</option>`).join('');

    document.getElementById('btn-roster-sync').addEventListener('click', async ()=>{
      try{
        const cid = sel.value; if (!cid) return notify('Pick a course','warn');
        const enr = await col('enrollments').where('courseId','==',cid).get();
        const uids = Array.from(new Set(enr.docs.map(d=>d.data().uid))).filter(Boolean);
        await doc('courses', cid).set({ participants: uids }, {merge:true});
        notify('Roster synced'); document.getElementById('roster-out').textContent = 'Participants: ' + (uids.join(', ')||'—');
      }catch(e){
        notify(e.message || 'Missing or insufficient permissions','danger');
      }
    });

    document.getElementById('btn-roster-view').addEventListener('click', async ()=>{
      const cid = sel.value; if (!cid) return notify('Pick a course','warn');
      const cs = await doc('courses', cid).get();
      const arr = cs.data()?.participants || [];
      document.getElementById('roster-out').textContent = 'Participants: ' + (arr.join(', ')||'—');
    });
  },
  unmount(){}
};
