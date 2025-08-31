import { el } from '../services/ui.js';
export async function viewSettings(){ const app=document.getElementById('app'); app.innerHTML=''; app.append(el('h2',{},'Settings'));
  const themes=['slate','emerald','royal']; const themeRow=el('div',{class:'row gap mt-2'},themes.map(t=>el('button',{class:'btn',onclick:()=>applyTheme(t)},t)));
  const fontRow=el('div',{class:'row gap mt-2'},['0.9','1.0','1.1'].map(s=>el('button',{class:'btn',onclick:()=>applyFont(s)},s=='1.0'?'A':(s=='0.9'?'A-':'A+'))));
  app.append(el('div',{class:'card'},[el('h3',{},'Theme'),themeRow,el('h3',{class:'mt-2'},'Font size'),fontRow]));
  function applyTheme(n){ document.documentElement.dataset.theme=n; localStorage.setItem('lh_theme',n); }
  function applyFont(s){ document.documentElement.style.setProperty('--font-scale',s); localStorage.setItem('lh_font',s); }
}