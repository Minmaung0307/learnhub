// features/profile.js
import { col, doc } from '../core/state.js';
import { notify, openModal, closeModal, safeWrite } from '../core/modal.js';
import { stg } from '../core/firebase.js';

export default {
  route:'profile',
  view(){
    return `<div class="grid" style="grid-template-columns:1fr;gap:10px">
      <div class="card"><div class="card-body">
        <h3 style="margin:0 0 8px 0">My Profile</h3>
        <div class="grid">
          <input id="pf-name" class="input" placeholder="Name"/>
          <input id="pf-portfolio" class="input" placeholder="Portfolio URL"/>
          <textarea id="pf-bio" class="input" placeholder="Short bio"></textarea>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <input id="pf-avatar" type="file" accept="image/*" style="display:none"/>
            <input id="pf-sign" type="file" accept="image/*" style="display:none"/>
            <button class="btn" id="pf-save">Save</button>
            <button class="btn ghost" id="pf-pick">Avatar</button>
            <button class="btn ghost" id="pf-pick-sign">Signature</button>
            <button class="btn secondary" id="pf-view">View Card</button>
            <button class="btn danger" id="pf-delete">Delete profile</button>
          </div>
        </div>
      </div></div>
    </div>`;
  },
  async mount(){
    const { auth } = await import('../core/firebase.js');
    const uid = auth.currentUser?.uid;
    const s = await doc('profiles', uid).get();
    const p = s.exists ? s.data() : {name:'',bio:'',portfolio:'',avatar:'',signature:''};
    document.getElementById('pf-name').value = p.name || '';
    document.getElementById('pf-portfolio').value = p.portfolio || '';
    document.getElementById('pf-bio').value = p.bio || '';

    document.getElementById('pf-pick').addEventListener('click', ()=>document.getElementById('pf-avatar').click());
    document.getElementById('pf-pick-sign').addEventListener('click', ()=>document.getElementById('pf-sign').click());

    document.getElementById('pf-save').addEventListener('click', async (e)=>{
      const btn = e.currentTarget;
      await safeWrite(btn, async ()=>{
        const base = {
          uid, email: auth.currentUser?.email || '',
          name: document.getElementById('pf-name').value.trim(),
          portfolio: document.getElementById('pf-portfolio').value.trim(),
          bio: document.getElementById('pf-bio').value.trim(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        await doc('profiles', uid).set(base, {merge:true});

        const fileA = document.getElementById('pf-avatar').files?.[0];
        if (fileA){
          const ref = stg.ref().child(`avatars/${uid}/${Date.now()}_${fileA.name}`);
          await ref.put(fileA); const url = await ref.getDownloadURL();
          await doc('profiles', uid).set({ avatar:url, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
        }
        const fileS = document.getElementById('pf-sign').files?.[0];
        if (fileS){
          const ref = stg.ref().child(`signatures/${uid}/${Date.now()}_${fileS.name}`);
          await ref.put(fileS); const url = await ref.getDownloadURL();
          await doc('profiles', uid).set({ signature:url, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
        }
      }, {ok:'Profile saved', closeFirst:false});
    });

    document.getElementById('pf-view').addEventListener('click', async ()=>{
      const s = await doc('profiles', uid).get();
      const me = s.data() || {};
      openModal('Profile Card', `
        <div style="background:linear-gradient(135deg,#f8fafc,#eef2ff);color:#0b1220;border:1px solid var(--border);
                    border-radius:14px;padding:16px;display:grid;gap:12px">
          <div style="display:flex;gap:12px;align-items:center">
            <img src="${me.avatar||''}" onerror="this.src='';this.alt='No avatar';" alt="avatar"
                 style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:1px solid var(--border);background:#fff"/>
            <div>
              <div style="font-weight:800;font-size:18px">${me.name||me.email||'—'}</div>
              <div class="muted" style="color:#334155">${me.email||''}</div>
            </div>
          </div>
          <div style="white-space:pre-wrap; line-height:1.5">${(me.bio||'')}</div>
          ${me.signature?`<div><div class="muted" style="color:#475569;margin-bottom:4px">Signature</div>
            <img src="${me.signature}" alt="signature" style="max-height:60px;background:#fff;border:1px solid var(--border);border-radius:8px;padding:6px"></div>`:''}
        </div>`, `<button class="btn" id="mm-ok">Close</button>`);
      document.getElementById('mm-ok').addEventListener('click', ()=>closeModal());
    });

    document.getElementById('pf-delete').addEventListener('click', async ()=>{
      try{ await doc('profiles', uid).delete(); notify('Profile deleted'); }catch(e){ notify(e.message || 'Delete failed','danger'); }
    });
  },
  unmount(){}
};
