// features/courses.js
import { state, canTeach, col, doc, clean } from '../core/state.js';
import { router } from '../core/router.js';
import { openModal, closeModal, safeWrite, notify } from '../core/modal.js';

let unsub = null;

function courseCard(c){
  return `<div class="card" id="${c.id}"><div class="card-body" style="display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-weight:800">${c.title||'—'}</div>
      <div class="muted" style="font-size:12px">${c.category||'General'} • Credits ${c.credits||0}</div>
    </div>
    <div style="display:flex;gap:6px">
      <button class="btn" data-open="${c.id}">Open</button>
      ${canTeach()?`<button class="btn ghost" data-edit="${c.id}">Edit</button><button class="btn danger" data-del="${c.id}">Delete</button>`:''}
    </div>
  </div></div>`;
}

export default {
  route:'courses',
  view(){
    return `<div class="card"><div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h3 style="margin:0">Courses</h3>
        ${canTeach()?`<button class="btn" id="add-course">New Course</button>`:''}
      </div>
      <div class="grid" id="course-list"></div>
    </div></div>`;
  },
  async mount(){
    const list = document.getElementById('course-list');
    const paint = (arr)=>{ list.innerHTML = arr.map(courseCard).join('') || '<div class="muted">No courses</div>'; };
    unsub = col('courses').onSnapshot(s=>paint(s.docs.map(d=>({id:d.id, ...d.data()}))));

    document.getElementById('add-course')?.addEventListener('click', ()=>{
      openModal('New Course', `
        <div class="grid">
          <input id="c-title" class="input" placeholder="Title"/>
          <input id="c-category" class="input" placeholder="Category"/>
          <input id="c-credits" class="input" type="number" placeholder="Credits" value="0"/>
          <input id="c-price" class="input" type="number" placeholder="Price" value="0"/>
          <textarea id="c-short" class="input" placeholder="Short description"></textarea>
        </div>`, `<button class="btn" id="c-save">Save</button>`);
      document.getElementById('c-save').addEventListener('click', async (e)=>{
        const btn = e.currentTarget;
        await safeWrite(btn, async ()=>{
          await col('courses').add(clean({
            title: document.getElementById('c-title').value.trim(),
            category: document.getElementById('c-category').value.trim(),
            credits: +document.getElementById('c-credits').value || 0,
            price: +document.getElementById('c-price').value || 0,
            short: document.getElementById('c-short').value.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }));
        }, {ok:'Saved', closeFirst:true});
      });
    });

    list.addEventListener('click', async e=>{
      const open = e.target.closest('button[data-open]');
      const del = e.target.closest('button[data-del]');
      const edit = e.target.closest('button[data-edit]');
      if (open){
        state.currentCourseId = open.getAttribute('data-open');
        router.go('course-detail');
      }
      if (del){
        const id = del.getAttribute('data-del');
        try{ await doc('courses', id).delete(); notify('Deleted'); }catch(err){ notify(err.message || 'Delete failed','danger'); }
      }
      if (edit){
        const id = edit.getAttribute('data-edit');
        const s = await doc('courses', id).get(); if (!s.exists) return;
        const c = {id:s.id, ...s.data()};
        openModal('Edit Course', `
          <div class="grid">
            <input id="c-title" class="input" value="${(c.title||'').replace(/"/g,'&quot;')}"/>
            <input id="c-category" class="input" value="${(c.category||'').replace(/"/g,'&quot;')}"/>
            <input id="c-credits" class="input" type="number" value="${c.credits||0}"/>
            <input id="c-price" class="input" type="number" value="${c.price||0}"/>
            <textarea id="c-short" class="input">${c.short||''}</textarea>
          </div>`, `<button class="btn" id="c-save">Save</button><button class="btn ghost" id="c-cancel">Back</button>`);
        document.getElementById('c-cancel').addEventListener('click', ()=>closeModal());
        document.getElementById('c-save').addEventListener('click', async (ev)=>{
          await safeWrite(ev.currentTarget, async ()=>{
            await doc('courses', id).set(clean({
              title: document.getElementById('c-title').value.trim(),
              category: document.getElementById('c-category').value.trim(),
              credits: +document.getElementById('c-credits').value || 0,
              price: +document.getElementById('c-price').value || 0,
              short: document.getElementById('c-short').value.trim(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }), {merge:true});
          }, {ok:'Saved', closeFirst:true});
        });
      }
    });
  },
  unmount(){ try{ unsub && unsub(); }catch{} unsub=null; }
};
