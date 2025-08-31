
// Firebase Ops Guard: queue & throttle Firestore/Storage ops, clean snapshots, enable persistence
(function(){
  const wait = (ms)=> new Promise(r=>setTimeout(r, ms));
  const raf = ()=> new Promise(r => (window.requestAnimationFrame||setTimeout)(r, 0));

  class Queue {
    constructor(){ this._p = Promise.resolve(); this._pending = 0; }
    enqueue(fn){
      this._pending++;
      this._p = this._p.then(async ()=>{
        try { await raf(); return await fn(); }
        finally { this._pending--; }
      });
      return this._p;
    }
    get size(){ return this._pending; }
  }
  const Q = window.LHQueue || new Queue();
  window.LHQueue = Q;

  async function setup(){
    if (!window.getFirebase) { return; }
    try{
      const fb = await window.getFirebase();
      const db = fb.db;
      const storage = fb.storage;

      // Enable offline persistence if possible (ignore errors if already enabled or not supported)
      try{
        const { enableIndexedDbPersistence } = fb;
        if (enableIndexedDbPersistence){ await enableIndexedDbPersistence(db).catch(()=>{}); }
      }catch(_){}

      // ---- Wrap Firestore Write APIs ----
      const wrapAsync = (obj, key) => {
        if (!obj[key] || obj[key].__lh_wrapped) return;
        const orig = obj[key].bind(obj);
        obj[key] = function(...args){
          return Q.enqueue(()=> orig(...args));
        };
        obj[key].__lh_wrapped = true;
      };

      ['addDoc','setDoc','updateDoc','deleteDoc','runTransaction'].forEach(k=> wrapAsync(fb, k));

      // writeBatch: wrap commit()
      if (fb.writeBatch && !fb.writeBatch.__lh_wrapped){
        const origWB = fb.writeBatch.bind(fb);
        fb.writeBatch = function(...args){
          const batch = origWB(...args);
          if (batch && batch.commit && !batch.commit.__lh_wrapped){
            const c = batch.commit.bind(batch);
            batch.commit = function(){ return Q.enqueue(()=> c()); };
            batch.commit.__lh_wrapped = true;
          }
          return batch;
        };
        fb.writeBatch.__lh_wrapped = true;
      }

      // ---- Wrap Storage uploads (limit concurrency) ----
      let inFlight = 0;
      const MAX_CONC = 2;
      if (fb.uploadBytesResumable && !fb.uploadBytesResumable.__lh_wrapped){
        const origUp = fb.uploadBytesResumable.bind(fb);
        fb.uploadBytesResumable = function(ref, file, meta){
          const start = async ()=>{
            while (inFlight >= MAX_CONC){ await wait(50); }
            inFlight++;
            try{ return origUp(ref, file, meta); }
            finally{ inFlight--; }
          };
          return Q.enqueue(start);
        };
        fb.uploadBytesResumable.__lh_wrapped = true;
      }

      // ---- Guard onSnapshot: auto-unsubscribe duplicates & limit per target ----
      if (fb.onSnapshot && !fb.onSnapshot.__lh_wrapped){
        const origSnap = fb.onSnapshot.bind(fb);
        const pool = new Set();
        fb.onSnapshot = function(...args){
          const unsub = origSnap(...args);
          pool.add(unsub);
          // If too many listeners exist, drop the oldest
          if (pool.size > 5){
            const first = pool.values().next().value;
            try{ first(); }catch(_){}
            pool.delete(first);
          }
          // Ensure removal on route changes
          const off = ()=>{ try{ unsub(); }catch(_){} pool.delete(unsub); window.removeEventListener('lh:navigate', off); };
          window.addEventListener('lh:navigate', off);
          return ()=>{ try{ unsub(); }catch(_){} pool.delete(unsub); window.removeEventListener('lh:navigate', off); };
        };
        fb.onSnapshot.__lh_wrapped = true;
      }

      console.log('[FirebaseOpsGuard] Online. Writes queued, uploads limited, snapshots managed.');
    }catch(e){
      console.warn('[FirebaseOpsGuard] setup failed', e);
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setup, {once:true});
  } else {
    setup();
  }
})();
