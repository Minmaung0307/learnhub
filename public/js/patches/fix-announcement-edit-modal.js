// Close the Announcement Edit modal immediately after saving
(function(){
  function isAnnouncementForm(f){
    if (!(f instanceof HTMLFormElement)) return false;
    const txt = (f.textContent || '').toLowerCase();
    const hasAnnounceWord = /announce/.test(txt);
    const hasField = f.querySelector('textarea, input[type="text"], [contenteditable="true"]');
    return hasAnnounceWord && !!hasField;
  }

  function closeClosestModal(el){
    if (!el) return;
    // 1) <dialog> support
    const dialog = el.closest('dialog');
    if (dialog && typeof dialog.close === 'function'){
      try { dialog.close(); return true; } catch(_){}
    }
    // 2) role="dialog"
    const roleDlg = el.closest('[role="dialog"]');
    if (roleDlg){
      roleDlg.style.display = 'none';
      roleDlg.classList.remove('open','show','visible','active');
      roleDlg.setAttribute('aria-hidden','true');
      return true;
    }
    // 3) class*="modal"
    const modal = el.closest('.modal, .Modal, .app-modal, [class*="modal"]');
    if (modal){
      modal.style.display = 'none';
      modal.classList.remove('open','show','visible','active');
      modal.setAttribute('aria-hidden','true');
      return true;
    }
    return false;
  }

  // When any announcement form submits, close its container modal immediately
  document.addEventListener('submit', (e)=>{
    const f = e.target;
    if (!isAnnouncementForm(f)) return;
    // Don't depend on async writes—close right away
    setTimeout(()=> closeClosestModal(f), 0);
  }, true);

  // If the app dispatches our custom saved event, close any open modals too
  window.addEventListener('learnhub:announcement:saved', ()=>{
    // try the most recent focus element first
    if (document.activeElement) closeClosestModal(document.activeElement);
    // otherwise any visible dialog/modal
    const dialogs = document.querySelectorAll('dialog[open], [role="dialog"]:not([aria-hidden="true"]), .modal.show, .modal.open, .modal.visible, .modal.active');
    dialogs.forEach(d => closeClosestModal(d));
  });

  console.log('[Fix] Announcement edit modal will close on save.');
})();
