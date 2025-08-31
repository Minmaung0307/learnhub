
// Fix: Prevent freeze on "New announcement" save and render immediately
// This patch is defensive: it works even if we don't know exact IDs/classes.
// Strategy:
//  - Observe DOM for a dashboard view that contains an announcement form.
//  - Intercept its submit/click, prevent default navigation/reload.
//  - Save to localStorage key "announcements" (or merge with existing if array/object).
//  - Immediately re-render into a list container if present; otherwise append a quick list.
//  - Never block the main thread; wrap heavy ops in requestIdleCallback/fallback setTimeout.

(function(){
  const STORAGE_KEY = "announcements";
  const DASH_ATTR = "data-view";
  const isDashboardRoot = (node) => {
    if (!(node instanceof HTMLElement)) return false;
    // Many apps mark a container; look for hints
    const text = node.textContent || "";
    const looksLikeDashboard = /\bDashboard\b/i.test(text);
    // also check for a column that mentions "Announcement"
    const hints = node.querySelectorAll("h2,h3,header,legend,section,div,span");
    let hasAnnounce = false;
    hints.forEach(h => { if (/announce/i.test(h.textContent||"")) hasAnnounce = true; });
    return looksLikeDashboard && hasAnnounce;
  };

  function safeParse(json, fallback){
    try{ return JSON.parse(json); }catch(e){ return fallback; }
  }
  function loadAnnouncements(){
    const raw = localStorage.getItem(STORAGE_KEY);
    const val = safeParse(raw, []);
    if (Array.isArray(val)) return val;
    // if it's an object/dict, convert
    if (val && typeof val === "object"){
      if (Array.isArray(val.items)) return val.items;
    }
    return [];
  }
  function saveAnnouncements(arr){
    // save minimal array to avoid bloat
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  function findAnnouncementForm(root){
    // look for a form that has textarea or input for announcement
    const forms = root.querySelectorAll("form");
    for (const f of forms){
      const txt = f.querySelector('textarea[name*="announce" i], textarea, input[name*="announce" i], input[type="text"]');
      const btn = f.querySelector('button[type="submit"], button, input[type="submit"]');
      const label = (f.textContent||"").toLowerCase();
      if (txt && btn && /announce/.test(label)) return {form: f, field: txt, submit: btn};
    }
    // fallback: any form in a section mentioning announcement
    const sections = [...root.querySelectorAll("section,div,article")].filter(s=>/announce/i.test(s.textContent||""));
    for (const s of sections){
      const f = s.querySelector("form");
      if (f){
        const txt = f.querySelector("textarea, input[type='text']");
        const btn = f.querySelector('button[type="submit"], button, input[type="submit"]');
        if (txt && btn) return {form: f, field: txt, submit: btn};
      }
    }
    return null;
  }

  function findListContainer(root){
    return root.querySelector('[data-announcements], #announcementList, .announcement-list, .announcements, [role="list"], ul, ol');
  }

  function renderList(root, items){
    let list = findListContainer(root);
    if (!list){
      // create a simple list if none exists
      list = document.createElement("ul");
      list.id = "announcementList";
      list.style.marginTop = "0.75rem";
      list.style.paddingLeft = "1rem";
      const heading = document.createElement("h3");
      heading.textContent = "Announcements";
      const host = root.querySelector("section, article, div") || root;
      host.appendChild(heading);
      host.appendChild(list);
    }
    // normalize items: newest first
    const sorted = [...items].sort((a,b)=> (b.ts||0) - (a.ts||0));
    list.innerHTML = "";
    for (const it of sorted){
      const li = document.createElement("li");
      li.style.margin = "0.25rem 0";
      const date = it.ts ? new Date(it.ts).toLocaleString() : "";
      li.textContent = it.title ? `${it.title} — ${date}` : `${it.text||""} ${date ? "— "+date : ""}`;
      list.appendChild(li);
    }
  }

  function attachHandlers(dashRoot){
    const found = findAnnouncementForm(dashRoot);
    if (!found) return;
    const {form, field, submit} = found;
    if (form.__lh_patched) return;
    form.__lh_patched = true;

    const handler = (ev)=>{
      try{
        ev.preventDefault();
      }catch(_){}
      // grab value
      const val = (field.value || "").trim();
      if (!val){
        // tiny toast
        try{ 
          const t = document.createElement("div");
          t.textContent = "Please enter an announcement.";
          t.style.position = "fixed"; t.style.bottom = "1rem"; t.style.left = "50%"; t.style.transform = "translateX(-50%)";
          t.style.background = "rgba(0,0,0,.8)"; t.style.color = "white"; t.style.padding = "8px 12px"; t.style.borderRadius = "8px";
          document.body.appendChild(t); setTimeout(()=>t.remove(), 1800);
        }catch(_){}
        return false;
      }
      const now = Date.now();
      const items = loadAnnouncements();
      const newItem = { id: "a_"+now, text: val, title: val, ts: now };
      items.push(newItem);

      // Write in idle time to avoid jank
      const write = ()=>{ saveAnnouncements(items); };
      if (typeof window.requestIdleCallback === "function"){
        requestIdleCallback(()=>write(), {timeout: 500});
      }else{
        setTimeout(()=>write(), 0);
      }

      // Immediate in-memory update
      renderList(dashRoot, items);

      // Clear field quickly
      try{ field.value = ""; }catch(_){}

      // Optional: dispatch a custom event for app listeners
      try{
        const e = new CustomEvent("learnhub:announcement:saved", {detail: newItem});
        window.dispatchEvent(e);
      }catch(_){}

      return false;
    };

    // Intercept submit and clicks
    form.addEventListener("submit", handler, true);
    if (submit) submit.addEventListener("click", handler, true);
  }

  function scan(){
    const app = document.getElementById("app") || document.body;
    // Look for a dashboard root node that mentions announcements
    const candidates = app.querySelectorAll("main,section,article,div");
    candidates.forEach(node => {
      if (isDashboardRoot(node)) attachHandlers(node);
    });
  }

  // Observe for route/view changes
  const mo = new MutationObserver((muts)=>{
    let changed = false;
    for (const m of muts){
      if (m.addedNodes && m.addedNodes.length) { changed = true; break; }
    }
    if (changed){
      // throttle
      clearTimeout(scan._t);
      scan._t = setTimeout(scan, 60);
    }
  });
  mo.observe(document.documentElement, {childList: true, subtree: true});

  // initial
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", scan);
  }else{
    scan();
  }
})();
