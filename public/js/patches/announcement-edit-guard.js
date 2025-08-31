// Ensure Announcement Edit modal closes immediately on save and never leaves UI stuck
(function(){
  function looksLikeAnnouncement(node){
    const txt = (node.textContent||'').toLowerCase();
    return /announce/.test(txt);
  }
  function closeModalOf(el){
    if (!window.LHModal){ return false; }
    const cand = el.closest('dialog, [role="dialog"], .modal, [class*="modal"]') || document.body;
    return window.LHModal.close(cand);
  }
  // 1) On form submit: close immediately and then allow async work to continue
  document.addEventListener('submit', (e)=>{
    const f = e.target;
    if (!(f instanceof HTMLFormElement)) return;
    if (!looksLikeAnnouncement(f)) return;
    // Close right away (zero-jank)
    setTimeout(()=> closeModalOf(f), 0);
    // Safety timer: if anything still open after 1s, force close all
    setTimeout(()=>{ if (window.LHModal) window.LHModal.forceCloseAll(); }, 1000);
  }, true);

  // 2) On click of common Save buttons inside announcement modals
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('button, [role="button"], input[type="submit"]');
    if (!btn) return;
    const container = btn.closest('dialog, [role="dialog"], .modal, [class*="modal"]');
    if (!container || !looksLikeAnnouncement(container)) return;
    const name = (btn.getAttribute('name')||'') + ' ' + (btn.getAttribute('id')||'') + ' ' + (btn.textContent||'');
    if (/(save|update|apply|ok|done)/i.test(name)){
      setTimeout(()=> closeModalOf(btn), 0);
      setTimeout(()=>{ if (window.LHModal) window.LHModal.forceCloseAll(); }, 1000);
    }
  }, true);

  // 3) Listen to app-level events if present
  window.addEventListener('learnhub:announcement:saved', ()=>{
    if (window.LHModal) window.LHModal.forceCloseAll();
  });

  // 4) Mutation observer: detect focus/scroll lock without visible modal and clean
  const mo = new MutationObserver(()=>{
    // If body is locked but no modal is visible, unlock
    const anyVisible = document.querySelector('dialog[open], [role="dialog"]:not([aria-hidden="true"]), .modal.show, .modal.open, .modal.visible, .modal.active');
    const locked = document.body.classList.contains('modal-open') || document.body.style.overflow === 'hidden';
    if (!anyVisible && locked){
      if (window.LHModal) window.LHModal.clearBackdrops();
      document.body.style.overflow = '';
    }
  });
  mo.observe(document.documentElement, {subtree: true, childList: true, attributes: true});

  console.log('[AnnouncementEditGuard] armed');
})();
