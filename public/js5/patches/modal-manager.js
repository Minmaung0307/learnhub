// LearnHub Modal Manager — robust closer and backdrop cleaner
(function(){
  function isOpen(el){
    if (!el) return false;
    if (el.tagName === 'DIALOG') return el.hasAttribute('open');
    const style = getComputedStyle(el);
    const visibleByClass = el.classList.contains('show') || el.classList.contains('open') || el.classList.contains('visible') || el.classList.contains('active');
    return style.display !== 'none' && style.visibility !== 'hidden' || visibleByClass;
  }
  function closeDialogLike(el){
    if (!el) return false;
    // Bootstrap
    try{
      if (window.bootstrap && window.bootstrap.Modal){
        const inst = window.bootstrap.Modal.getInstance(el) || new window.bootstrap.Modal(el);
        if (inst){ inst.hide(); return true; }
      }
    }catch(_){}
    // HTML <dialog>
    if (el.tagName === 'DIALOG' && typeof el.close === 'function'){ try{ el.close(); return true; }catch(_){ } }
    // Aria/role dialog
    if (el.getAttribute('role') === 'dialog' || el.matches('[role="dialog"]')){
      el.setAttribute('aria-hidden','true');
    }
    // Generic modal classes
    el.classList.remove('show','open','visible','active');
    el.style.display = 'none';
    return true;
  }
  function clearBackdrops(){
    document.querySelectorAll('.modal-backdrop, .MuiBackdrop-root, .cdk-overlay-backdrop, .v-overlay__scrim')
      .forEach(n=>{ try{ n.remove(); }catch(_){} });
    document.body.classList.remove('modal-open','overflow-hidden','no-scroll','is-modal-open');
  }
  function releaseFocus(){
    try{ if (document.activeElement) document.activeElement.blur(); }catch(_){}
    try{ document.body.removeAttribute('aria-hidden'); }catch(_){}
  }
  function forceCloseAllModals(){
    const nodes = document.querySelectorAll('dialog[open], [role="dialog"]:not([aria-hidden="true"]), .modal.show, .modal.open, .modal.visible, .modal.active');
    nodes.forEach(n=> closeDialogLike(n));
    clearBackdrops();
    releaseFocus();
  }
  // Expose a global utility (for other patches)
  window.LHModal = {
    close: closeDialogLike,
    forceCloseAll: forceCloseAllModals,
    clearBackdrops,
  };

  // If we navigate or route, ensure no stuck modals
  window.addEventListener('lh:navigate', forceCloseAllModals);
  window.addEventListener('popstate', forceCloseAllModals);
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape'){ forceCloseAllModals(); }
  });
  console.log('[ModalManager] ready');
})();
