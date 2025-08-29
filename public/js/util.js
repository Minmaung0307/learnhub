export const $ = (s, r=document)=>r.querySelector(s);
export const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
export const notify = (msg, type="ok") => {
  const n = document.getElementById("notification");
  if(!n) return;
  n.textContent = msg;
  n.className = `notification show ${type}`;
  setTimeout(()=>n.className="notification", 2200);
};
export const safe = (fn)=>function(...args){
  try{
    const r = fn.apply(this,args);
    if(r && typeof r.then==="function"){ r.catch(e=>{ console.error(e); notify(e?.message||"Failed", "danger"); }); }
    return r;
  }catch(e){ console.error(e); notify(e?.message||"Failed","danger"); }
};
export function on(el, type, handler, opts){ if(el) el.addEventListener(type, safe(handler), opts); }
export function delegate(root, selector, type, handler, opts){
  if(!root) return;
  root.addEventListener(type, safe((e)=>{
    const t = e.target?.closest?.(selector);
    if(t && root.contains(t)) handler(e,t);
  }), opts);
}
export function ensureModalDOM(){
  let m = document.getElementById("m-modal");
  if(!m){
    const wrap = document.createElement("div");
    wrap.innerHTML = `<div class="modal" id="m-modal"><div class="dialog">
      <div class="head"><button class="btn ghost" id="mm-close">Back</button><strong id="mm-title" style="margin-left:8px">Modal</strong></div>
      <div class="body" id="mm-body"></div>
      <div class="foot" id="mm-foot"></div>
    </div></div><div class="modal-backdrop"></div>`;
    const frag = document.createDocumentFragment();
    frag.appendChild(wrap.firstElementChild);
    frag.appendChild(wrap.lastChild);
    document.body.appendChild(frag);
    m = document.getElementById("m-modal");
    document.getElementById("mm-close")?.addEventListener("click", ()=>closeModal("m-modal"));
    document.addEventListener("keydown",(ev)=>{ if(ev.key==="Escape") closeModal("m-modal"); });
  }
}
export function openModal(id){ ensureModalDOM(); const m = document.getElementById(id); if(!m) return; m.classList.add("active"); m.nextElementSibling?.classList.add("active"); }
export function closeModal(id){ const m = document.getElementById(id); if(m) m.classList.remove("active"); document.querySelectorAll(".modal-backdrop").forEach(b=>b.classList.remove("active")); }
export const clean = (obj)=>Object.fromEntries(Object.entries(obj).filter(([k,v])=>v!==undefined && !(typeof v==="number" && Number.isNaN(v))));
export const money = (x)=> x===0 ? "Free" : `$${Number(x).toFixed(2)}`;
