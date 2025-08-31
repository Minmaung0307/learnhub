
// Global safety wrapper to prevent app freeze on any feature save/add/edit
(function(){
  function guard(fn, ctx){
    return function(...args){
      try {
        return fn.apply(ctx||this, args);
      } catch(e){
        console.error("Guarded error:", e);
        // non-blocking toast
        try{
          const d=document.createElement("div");
          d.textContent="⚠️ App error prevented freeze";
          Object.assign(d.style,{position:"fixed",top:"1rem",right:"1rem",background:"#f87171",color:"white",padding:"6px 10px",borderRadius:"6px",zIndex:99999});
          document.body.appendChild(d);
          setTimeout(()=>d.remove(),2000);
        }catch(_){}
      }
    };
  }

  // Patch addEventListener
  const origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, opts){
    if (typeof listener === "function"){
      return origAdd.call(this, type, guard(listener,this), opts);
    }
    return origAdd.call(this, type, listener, opts);
  };

  // Patch setTimeout / setInterval
  const ot = window.setTimeout;
  const oi = window.setInterval;
  window.setTimeout = (fn,ms,...rest)=> ot(guard(fn),ms,...rest);
  window.setInterval = (fn,ms,...rest)=> oi(guard(fn),ms,...rest);

  // Patch Promises
  const opThen = Promise.prototype.then;
  Promise.prototype.then = function(onFul,onRej){
    return opThen.call(this, onFul&&guard(onFul), onRej&&guard(onRej));
  };
})();
