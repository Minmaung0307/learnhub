// Event Safety Guard: prevent duplicate listeners and reduce jank
(function(){
  const origAdd = EventTarget.prototype.addEventListener;
  const origRemove = EventTarget.prototype.removeEventListener;
  const registry = new WeakMap();
  function getKey(type, listener, options){
    const cap = typeof options === 'boolean' ? options : !!(options && options.capture);
    const once = !!(options && options.once);
    return type + '::' + String(listener) + '::' + cap + '::' + once;
  }
  EventTarget.prototype.addEventListener = function(type, listener, options){
    try{
      if (!listener) return origAdd.call(this, type, listener, options);
      let map = registry.get(this);
      if (!map){ map = new Map(); registry.set(this, map); }
      const key = getKey(type, listener, options);
      if (map.has(key)) return; // dedupe
      map.set(key, true);
      // Make touch/scroll events passive by default for better perf
      let opts = options;
      if (typeof options === 'object' && options !== null){
        if (options.passive == null && /^(touchstart|touchmove|wheel|mousewheel|scroll)$/i.test(type)){
          opts = Object.assign({}, options, {passive:true});
        }
      } else if (/^(touchstart|touchmove|wheel|mousewheel|scroll)$/i.test(type)){
        opts = {capture: !!options, passive:true};
      }
      return origAdd.call(this, type, listener, opts);
    }catch(_){
      return origAdd.call(this, type, listener, options);
    }
  };
  EventTarget.prototype.removeEventListener = function(type, listener, options){
    try{
      const map = registry.get(this);
      if (map){ map.delete(getKey(type, listener, options)); }
    }catch(_){}
    return origRemove.call(this, type, listener, options);
  };
  console.log('[EventSafetyGuard] active');
})();
