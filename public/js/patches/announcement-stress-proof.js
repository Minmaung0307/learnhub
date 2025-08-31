// Stress-proof Announcement Add/Edit system — prevents freeze with many operations
(function(){
  const STORAGE_KEY = "announcements";
  let writing = false;
  let queue = [];
  let writeScheduled = false;

  function safeParse(str, fallback){
    try{ return JSON.parse(str); }catch(_){ return fallback; }
  }
  function loadAll(){
    return safeParse(localStorage.getItem(STORAGE_KEY), []);
  }
  function scheduleWrite(){
    if (writeScheduled) return;
    writeScheduled = true;
    setTimeout(flushQueue, 50);
  }
  function flushQueue(){
    writeScheduled = false;
    if (queue.length === 0){ writing=false; return; }
    const batch = queue.splice(0, queue.length);
    let items = loadAll();
    for (const it of batch){
      const idx = items.findIndex(x => x.id===it.id);
      if (idx>=0) items[idx] = it; else items.push(it);
    }
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }catch(e){
      console.error('Storage write failed', e);
    }
    writing=false;
  }

  function saveItem(it){
    queue.push(it);
    scheduleWrite();
  }

  function renderList(){
    const root = document.getElementById('announcementList');
    if (!root) return;
    const items = loadAll().sort((a,b)=> (b.ts||0)-(a.ts||0));
    root.innerHTML="";
    for (const it of items){
      const li=document.createElement('li');
      li.textContent=it.text+" ("+(new Date(it.ts)).toLocaleString()+")";
      root.appendChild(li);
    }
  }

  function closeModal(el){
    if (window.LHModal) return window.LHModal.close(el.closest('dialog,[role="dialog"],.modal,[class*="modal"]'));
    const dlg=el.closest('dialog'); if(dlg&&dlg.close)dlg.close();
    const md=el.closest('.modal'); if(md)md.style.display='none';
  }

  document.addEventListener('submit', (e)=>{
    const f=e.target;
    if (!(f instanceof HTMLFormElement)) return;
    const txt=f.querySelector('textarea,input[type=text]');
    if (!txt) return;
    if (!/announce/i.test(f.textContent||"")) return;
    e.preventDefault();
    const val=(txt.value||"").trim();
    if (!val) return;
    const id=f.getAttribute('data-id')||("a_"+Date.now());
    const item={id, text:val, ts:Date.now()};
    saveItem(item);
    renderList();
    closeModal(f);
    setTimeout(()=>{renderList();},200);
    setTimeout(()=>{if(window.LHModal)window.LHModal.forceCloseAll();},1000);
  },true);

  document.addEventListener('click',(e)=>{
    const btn=e.target.closest('button,[role=button],input[type=submit]');
    if(!btn)return;
    const label=(btn.textContent||btn.value||"").toLowerCase();
    if(/save|add|update|publish|ok|done/.test(label)){
      const form=btn.closest('form');
      if(form){
        setTimeout(()=>closeModal(form),0);
        setTimeout(()=>{if(window.LHModal)window.LHModal.forceCloseAll();},1000);
      }
    }
  },true);

  window.addEventListener('storage', (e)=>{
    if (e.key===STORAGE_KEY) renderList();
  });

  if(document.readyState!=='loading')renderList();
  else document.addEventListener('DOMContentLoaded',renderList);

  console.log('[Announcement Stress-Proof] active');
})();
