// Ensure Announcement add/edit flows are serialized and modals always close
(function(){
  const looksLikeAnnouncement = (node) => /announce/.test((node.textContent||'').toLowerCase());

  function closeModalOf(el){
    const mod = el && el.closest && el.closest('dialog, [role="dialog"], .modal, [class*="modal"]');
    if (mod && window.LHModal){ window.LHModal.close(mod); }
  }
  function forceClean(){
    if (window.LHModal){ window.LHModal.forceCloseAll(); }
    // Also remove duplicate backdrops if any
    document.querySelectorAll('.modal-backdrop ~ .modal-backdrop').forEach(n=>{ try{ n.remove(); }catch(_){}});
  }

  async function handleSubmitForm(f){
    if (!window.LHQueue){ return doImmediate(); }
    return window.LHQueue.enqueue(async ()=> doImmediate());
    function doImmediate(){
      // Close UI instantly
      setTimeout(()=> closeModalOf(f), 0);
      setTimeout(forceClean, 600);
    }
  }

  document.addEventListener('submit', (e)=>{
    const f = e.target;
    if (!(f instanceof HTMLFormElement)) return;
    if (!looksLikeAnnouncement(f)) return;
    handleSubmitForm(f);
  }, true);

  document.addEventListener('click', (e)=>{
    const btn = e.target.closest && e.target.closest('button, [role="button"], input[type="submit"]');
    if (!btn) return;
    const container = btn.closest && btn.closest('dialog, [role="dialog"], .modal, [class*="modal"]');
    if (!container || !looksLikeAnnouncement(container)) return;
    const name = ((btn.getAttribute('name')||'') + ' ' + (btn.getAttribute('id')||'') + ' ' + (btn.textContent||'')).toLowerCase();
    if (/(save|update|apply|ok|done|publish)/i.test(name)){
      if (window.LHQueue){
        window.LHQueue.enqueue(async ()=>{
          setTimeout(()=> closeModalOf(btn), 0);
          setTimeout(forceClean, 600);
        });
      } else {
        setTimeout(()=> closeModalOf(btn), 0);
        setTimeout(forceClean, 600);
      }
    }
  }, true);

  window.addEventListener('learnhub:announcement:saved', ()=>{
    if (window.LHQueue){
      window.LHQueue.enqueue(async ()=> forceClean());
    } else {
      forceClean();
    }
  });

  console.log('[AnnouncementGuard++] serialized & hardened');
})();
