// core/modal.js
export function notify(msg, type='ok'){
  let n = document.getElementById('notification');
  if (!n){
    n = document.createElement('div');
    n.id = 'notification';
    n.className = 'notification';
    document.body.appendChild(n);
  }
  n.textContent = msg;
  n.className = 'notification show ' + (type||'ok');
  clearTimeout(notify._t);
  notify._t = setTimeout(()=>{ n.className='notification'; }, 2200);
}

export function ensureModal(){
  let m = document.getElementById('m-modal');
  let b = document.querySelector('.modal-backdrop');
  if (!m){
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="modal" id="m-modal"><div class="dialog">
        <div class="head">
          <button class="btn back" id="mm-close">Back</button>
          <strong id="mm-title" style="margin-left:8px">Modal</strong>
        </div>
        <div class="body" id="mm-body"></div>
        <div class="foot" id="mm-foot"></div>
      </div></div>
      <div class="modal-backdrop"></div>`;
    document.body.appendChild(wrap.firstElementChild);
    document.body.appendChild(wrap.lastElementChild);
    m = document.getElementById('m-modal');
    b = document.querySelector('.modal-backdrop');
    document.getElementById('mm-close').addEventListener('click', ()=>closeModal());
    document.addEventListener('keydown', e=>{ if (e.key==='Escape') closeModal(); });
  }
  return [m,b];
}

export function openModal(title='Modal', bodyHTML='', footHTML=''){
  const [m,b] = ensureModal();
  document.getElementById('mm-title').textContent = title;
  document.getElementById('mm-body').innerHTML = bodyHTML;
  document.getElementById('mm-foot').innerHTML = footHTML;
  m.classList.add('active'); b.classList.add('active');
  return m;
}
export function closeModal(){
  const m = document.getElementById('m-modal');
  const b = document.querySelector('.modal-backdrop');
  if (m) m.classList.remove('active');
  if (b) b.classList.remove('active');
}
export const safe = (fn)=>function(...args){ try{
  const r = fn.apply(this,args); if (r && typeof r.then==='function') r.catch(e=>notify(e.message||'Action failed','danger')); return r;
}catch(e){ notify(e.message||'Action failed','danger'); }};

export function withBusy(btn, label='Saving…'){
  if (!btn) return ()=>{};
  const prev = btn.innerHTML; btn.disabled = true; btn.innerHTML = '⏳ ' + label;
  return ()=>{ btn.disabled=false; btn.innerHTML = prev; };
}

export async function safeWrite(btn, op, {ok='Saved', closeFirst=false}={}){
  const done = withBusy(btn);
  try{
    if (closeFirst) closeModal();
    await Promise.resolve().then(op);
    notify(ok,'ok');
  }catch(e){ notify(e.message||'Action failed','danger'); }
  finally{ done(); }
}
