// core/router.js
import { state } from './state.js';
import { renderShell } from './shell.js';
import { notify } from './modal.js';

const registry = new Map();
let current = null;

export function registerRoutes(arr){
  arr.forEach(r => registry.set(r.route, r));
}

export const router = {
  go(route){
    if (!registry.has(route)) route = 'dashboard';
    state.route = route;

    // unmount previous
    try { current?.unmount?.(); } catch(e){ console.warn('unmount error', e); }

    // render shell + view
    renderShell();
    const feature = registry.get(route);
    const main = document.getElementById('main');
    main.innerHTML = feature.view();
    try { feature.mount?.(main); } catch(e){
      console.error(e);
      notify('Mount failed: ' + (e.message||'error'), 'danger');
    }
    // mobile: scroll to top
    main.scrollTop = 0; window.scrollTo({top:0, behavior:'instant'});
    current = feature;
  }
};
