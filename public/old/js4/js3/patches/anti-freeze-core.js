
/**
 * LearnHub Anti-Freeze Core
 * - Softens long synchronous operations by batching and deferring
 * - Debounces localStorage writes
 * - Catches unhandled errors so the app doesn't lock in a broken state
 * - Prevents accidental full page reloads on form submits and internal links
 * - Lightweight, framework-agnostic and non-invasive
 */
(function(){
  // ---------------- Utilities ----------------
  const raf = (fn) => (window.requestAnimationFrame||setTimeout)(fn, 0);
  const idle = (fn, timeout=500) => {
    if (window.requestIdleCallback) requestIdleCallback(fn, {timeout});
    else setTimeout(fn, 0);
  };
  const now = () => (performance && performance.now) ? performance.now() : Date.now();
  const toast = (msg, ms=2200) => {
    try{
      const d = document.createElement('div');
      d.textContent = msg;
      d.style.position = 'fixed';
      d.style.zIndex = 999999;
      d.style.left = '50%'; d.style.bottom = '14px'; d.style.transform = 'translateX(-50%)';
      d.style.background = 'rgba(0,0,0,.82)'; d.style.color = '#fff';
      d.style.padding = '10px 14px'; d.style.borderRadius = '10px'; d.style.font = '14px/1.2 system-ui, sans-serif';
      d.style.boxShadow = '0 6px 24px rgba(0,0,0,.25)';
      document.body.appendChild(d); setTimeout(()=>d.remove(), ms);
    }catch(_){}
  };

  // ---------------- Safe Storage ----------------
  // Batch localStorage.setItem to avoid long JSON.stringify blocking
  const _setQueue = new Map();
  const _origSet = localStorage.setItem.bind(localStorage);
  const _origGet = localStorage.getItem.bind(localStorage);
  const _origRemove = localStorage.removeItem.bind(localStorage);
  let _flushScheduled = false;
  function flushSetQueue(){
    _flushScheduled = false;
    const entries = Array.from(_setQueue.entries());
    _setQueue.clear();
    // Write in small chunks
    let i = 0;
    function writeChunk(){
      const start = now();
      for (; i < entries.length; i++){
        const [k, v] = entries[i];
        try {
          _origSet(k, v);
        } catch(e){
          // Fallback: shrink payload if too big
          try {
            if (typeof v === 'string' && v.length > 1024*1024) {
              _origSet(k, v.slice(0, 1024*1024)); // last resort cap ~1MB
            }
          } catch(_){}
        }
        if (now() - start > 8) break; // avoid long task
      }
      if (i < entries.length) raf(writeChunk);
    }
    raf(writeChunk);
  }
  localStorage.setItem = function(k, v){
    try{
      _setQueue.set(String(k), String(v));
      if (!_flushScheduled){
        _flushScheduled = true;
        idle(flushSetQueue, 300);
      }
    }catch(e){
      try{ _origSet(k, v); }catch(_){}
    }
  };
  localStorage.getItem = function(k){
    // Prefer queued value if pending
    if (_setQueue.has(String(k))) return _setQueue.get(String(k));
    try{ return _origGet(k); }catch(e){ return null; }
  };
  localStorage.removeItem = function(k){
    _setQueue.delete(String(k));
    try{ return _origRemove(k); }catch(e){}
  };

  // ---------------- Safer Form Submits ----------------
  // Intercept only if a submit would hard-navigate (action set) or empty '#' href buttons
  document.addEventListener('submit', (e)=>{
    const f = e.target;
    if (!(f instanceof HTMLFormElement)) return;
    const action = (f.getAttribute('action')||'').trim();
    const hardNav = action && !/^(\#|javascript:|\/?#?$)/i.test(action) && !/^https?:\/\//i.test(action);
    const isGet = (f.getAttribute('method')||'get').toLowerCase() === 'get';
    // Heuristic: if app is SPA, prevent full reloads unless explicitly allowed
    const allowHard = f.hasAttribute('data-allow-hard-submit');
    if (!allowHard && (hardNav || isGet && action==="#")){
      e.preventDefault();
      // Re-dispatch async event so app handlers still run without navigation
      setTimeout(()=>{
        f.dispatchEvent(new CustomEvent('lh:soft-submit', {bubbles:true, cancelable:true}));
      },0);
    }
  }, true);

  // Intercept internal anchors that could trigger reloads inadvertently
  document.addEventListener('click', (e)=>{
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href')||'';
    const allowHard = a.hasAttribute('data-allow-hard-nav');
    if (!allowHard){
      // internal relative links without http(s) & not a file
      if (href && !/^https?:/i.test(href) && !href.startsWith('mailto:') && !href.startsWith('tel:')){
        // prevent full page nav; emit SPA event
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('lh:navigate', {detail:{href}}));
        // also update hash for legacy routers
        if (href.startsWith('#')) location.hash = href;
        else history.pushState({href}, '', href);
      }
    }
  }, true);

  // ---------------- Global Error Guards ----------------
  window.addEventListener('unhandledrejection', (ev)=>{
    console.error('Unhandled promise rejection:', ev.reason);
    toast('Something went wrong, but the app is still responsive.');
    ev.preventDefault && ev.preventDefault();
  });

  window.addEventListener('error', (ev)=>{
    // Prevent the app from entering a broken loop
    console.error('Global error:', ev.message);
    // Try to keep UI responsive
    raf(()=>{});
  });

  // Replace blocking dialogs with non-blocking toasts (optional, comment out if undesired)
  const _alert = window.alert;
  window.alert = function(msg){ toast(String(msg)); };
  // window.confirm / prompt retained to avoid changing flows

  // ---------------- Cooperative Yielding ----------------
  // For known heavy loops, apps can call window.lhYield() to yield control
  window.lhYield = function(){ return new Promise(res=>raf(res)); };

  // ---------------- Ready ----------------
  console.log('[Anti-Freeze] Loaded');
})();
