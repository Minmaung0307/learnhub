// features/assessments.js
import { canTeach, col, doc, clean } from '../core/state.js';
import { openModal, closeModal, safeWrite, notify } from '../core/modal.js';

let unsub = null;

function quizRow(q){
  return `<div class="card" id="${q.id}"><div class="card-body" style="display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-weight:800">${q.title}</div>
      <div class="muted" style="font-size:12px">Pass ≥ ${q.passScore||70}%</div>
    </div>
    <div style="display:flex;gap:6px">
      <button class="btn ghost" data-edit="${q.id}">Edit</button>
      <button class="btn danger" data-del="${q.id}">Delete</button>
    </div>
  </div></div>`;
}

export default {
  route:'assessments',
  view(){
    return `<div class="card"><div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0">Finals</h3>
        ${canTeach()?`<button class="btn" id="q-new">New Final</button>`:''}
      </div>
      <div id="q-list" class="grid"></div>
    </div></div>`;
  },
  async mount(){
    const list = document.getElementById('q-list');
    const paint = (arr)=>{ list.innerHTML = arr.map(quizRow).join('') || '<div class="muted">No finals</div>'; };
    unsub = col('quizzes').onSnapshot(s=>paint(s.docs.map(d=>({id:d.id, ...d.data()}))));

    document.getElementById('q-new')?.addEventListener('click', ()=>{
      openModal('New Final', `
        <div class="grid">
          <input id="q-title" class="input" placeholder="Final title"/>
          <input id="q-pass" class="input" type="number" value="70" placeholder="Pass score (%)"/>
          <textarea id="q-json" class="input" placeholder='[{"q":"2+2?","choices":["3","4","5"],"answer":1}]'></textarea>
        </div>`, `<button class="btn" id="q-save">Save</button>`);
      document.getElementById('q-save').addEventListener('click', async e=>{
        const btn = e.currentTarget;
        await safeWrite(btn, async ()=>{
          let items = []; try{ items = JSON.parse(document.getElementById('q-json').value||'[]'); }catch{ throw new Error('Invalid JSON'); }
          await col('quizzes').add(clean({
            title: document.getElementById('q-title').value.trim(),
            passScore: +document.getElementById('q-pass').value || 70,
            items,
            isFinal:true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }));
        }, {ok:'Final saved', closeFirst:true});
      });
    });

    list.addEventListener('click', async e=>{
      const del = e.target.closest('button[data-del]');
      const edit = e.target.closest('button[data-edit]');
      if (del){
        const id = del.getAttribute('data-del');
        try{ await doc('quizzes', id).delete(); notify('Deleted'); }catch(err){ notify(err.message || 'Delete failed','danger'); }
      }
      if (edit){
        const id = edit.getAttribute('data-edit');
        const s = await doc('quizzes', id).get(); if (!s.exists) return;
        const q = {id:s.id, ...s.data()};
        openModal('Edit Final', `
          <div class="grid">
            <input id="q-title" class="input" value="${(q.title||'').replace(/"/g,'&quot;')}"/>
            <input id="q-pass" class="input" type="number" value="${q.passScore||70}"/>
            <textarea id="q-json" class="input">${JSON.stringify(q.items||[],null,2)}</textarea>
          </div>`, `<button class="btn" id="q-save">Save</button><button class="btn ghost" id="q-cancel">Back</button>`);
        document.getElementById('q-cancel').addEventListener('click', ()=>closeModal());
        document.getElementById('q-save').addEventListener('click', async ev=>{
          await safeWrite(ev.currentTarget, async ()=>{
            let items = []; try{ items = JSON.parse(document.getElementById('q-json').value||'[]'); }catch{ throw new Error('Invalid JSON'); }
            await doc('quizzes', id).set(clean({
              title: document.getElementById('q-title').value.trim(),
              passScore: +document.getElementById('q-pass').value || 70,
              items,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }), {merge:true});
          }, {ok:'Saved', closeFirst:true});
        });
      }
    });
  },
  unmount(){ try{ unsub && unsub(); }catch{} unsub=null; }
};
