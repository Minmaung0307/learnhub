// LH Operation Queue: serialize add/edit ops and keep UI responsive
(function(){
  class Q {
    constructor(){ this._p = Promise.resolve(); }
    enqueue(fn){
      this._p = this._p.then(()=> new Promise(async (res)=>{
        try{
          // yield to keep UI responsive between ops
          await new Promise(r => (window.requestAnimationFrame||setTimeout)(r, 0));
          const out = await fn();
          res(out);
        } catch(e){
          console.error('[LHQueue] op error', e);
          res(undefined);
        }
      }));
      return this._p;
    }
  }
  window.LHQueue = window.LHQueue || new Q();
  console.log('[LHQueue] ready');
})();
