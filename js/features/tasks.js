// features/tasks.js
import { col, doc } from '../core/state.js';
import { openModal, closeModal, safeWrite, notify } from '../core/modal.js';

let unsub = null;

function card(t){
  return `<div class="card task-card" id="${t.id}"><div class="card-body" style="display:flex;justify-content:space-between;align-items:center">
    <div>${t.title}</div>
    <div class="actions">
      <button class="btn ghost" data-edit="${t.id}">Edit</button>
      <button class="btn danger" data-del="${t.id}">Delete</button>
    </div>
  </div></div>`;
}

export default {
  route:'tasks',
  view(){
    return `<div class="card"><div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h3 style="margin:0">Tasks</h3>
        <button class="btn" id="addTask">Add Task</button>
      </div>
      <div id="t-list" class="grid"></div>
    </div></div>`;
  },
  async mount(){
    const list = document.getElementById('t-list');
    const paint = (arr)=>{ list.innerHTML = arr.map(card).join('') || '<div class="muted">No tasks</div>'; };
    unsub = col('tasks').orderBy('createdAt','desc').onSnapshot(s=>paint(s.docs.map(d=>({id:d.id, ...d.data()}))));

    document.getElementById('addTask').addEventListener('click', ()=>{
      openModal('New Task', `<div class="grid"><input id="t-title" class="input" placeholder="Task title"/></div>`, `<button class="btn" id="t-save">Save</button>`);
      document.getElementById('t-save').addEventListener('click', async e=>{
        await safeWrite(e.currentTarget, async ()=>{
          await col('tasks').add({
            title: document.getElementById('t-title').value.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }, {ok:'Task added', closeFirst:true});
      });
    });

    list.addEventListener('click', async e=>{
      const del = e.target.closest('button[data-del]');
      const edit = e.target.closest('button[data-edit]');
      if (del){
        const id = del.getAttribute('data-del');
        try{ await doc('tasks', id).delete(); notify('Deleted'); }catch(err){ notify(err.message || 'Delete failed','danger'); }
      }
      if (edit){
        const id = edit.getAttribute('data-edit');
        const s = await doc('tasks', id).get(); if (!s.exists) return;
        const t = {id:s.id, ...s.data()};
        openModal('Edit Task', `<div class="edit-inline">
          <input id="t-title" class="input" value="${(t.title||'').replace(/"/g,'&quot;')}"/>
        </div>`, `<button class="btn" id="t-save">Save</button><button class="btn ghost" id="t-cancel">Back</button>`);
        document.getElementById('t-cancel').addEventListener('click', ()=>closeModal());
        document.getElementById('t-save').addEventListener('click', async ev=>{
          await safeWrite(ev.currentTarget, async ()=>{
            await doc('tasks', id).set({ title: document.getElementById('t-title').value.trim() }, {merge:true});
          }, {ok:'Saved', closeFirst:true});
        });
      }
    });
  },
  unmount(){ try{ unsub && unsub(); }catch{} unsub=null; }
};
