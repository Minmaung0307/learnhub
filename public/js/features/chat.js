// features/chat.js
import { canManage, col } from '../core/state.js';
import { openModal, safeWrite, notify } from '../core/modal.js';

let unsub = null;

function row(m){
  const canAdmin = canManage();
  return `<div class="card"><div class="card-body" style="display:flex;justify-content:space-between;gap:8px">
    <div>
      <div style="font-weight:800">${m.name||m.email||'User'} <span class="muted" style="font-size:12px">• ${new Date(m.createdAt?.toDate?.()||Date.now()).toLocaleString()}</span></div>
      <div>${(m.text||'').replace(/</g,'&lt;')}</div>
    </div>
    ${canAdmin?`<div style="display:flex;gap:6px">
      <button class="btn ghost" data-edit="${m.id}">Edit</button>
      <button class="btn danger" data-del="${m.id}">Delete</button>
    </div>`:''}
  </div></div>`;
}

export default {
  route:'chat',
  view(){
    return `<div class="card"><div class="card-body">
      <h3 style="margin:0 0 8px 0">Course Chat (Admin can edit/delete)</h3>
      <div id="chat-list" class="grid"></div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <input id="chat-text" class="input" placeholder="Message…"/>
        <button class="btn" id="chat-send">Send</button>
      </div>
    </div></div>`;
  },
  async mount(){
    const list = document.getElementById('chat-list');
    const paint = (arr)=>{ list.innerHTML = arr.map(row).join('') || '<div class="muted">No messages</div>'; };
    unsub = col('messages').orderBy('createdAt','asc').limit(50).onSnapshot(s=>paint(s.docs.map(d=>({id:d.id,...d.data()}))));

    document.getElementById('chat-send').addEventListener('click', async (e)=>{
      const t = document.getElementById('chat-text').value.trim(); if (!t) return;
      const { auth } = await import('../core/firebase.js');
      await col('messages').add({
        text:t,
        email:auth.currentUser?.email||'',
        name:auth.currentUser?.email?.split('@')[0]||'User',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      document.getElementById('chat-text').value = '';
    });

    list.addEventListener('click', async e=>{
      const del = e.target.closest('button[data-del]');
      const edit = e.target.closest('button[data-edit]');
      if (del){
        const id = del.getAttribute('data-del');
        try{ await col('messages').doc(id).delete(); notify('Deleted'); }catch(err){ notify(err.message || 'Delete failed','danger'); }
      }
      if (edit){
        const id = edit.getAttribute('data-edit');
        const s = await col('messages').doc(id).get(); if (!s.exists) return;
        const m = {id:s.id, ...s.data()};
        openModal('Edit Message', `
          <div class="grid">
            <textarea id="m-text" class="input">${m.text||''}</textarea>
          </div>`, `<button class="btn" id="m-save">Save</button>`);
        document.getElementById('m-save').addEventListener('click', async ev=>{
          await safeWrite(ev.currentTarget, async ()=>{
            await col('messages').doc(id).set({ text:document.getElementById('m-text').value.trim() }, {merge:true});
          }, {ok:'Saved', closeFirst:true});
        });
      }
    });
  },
  unmount(){ try{ unsub && unsub(); }catch{} unsub=null; }
};
