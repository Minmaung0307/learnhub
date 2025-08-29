import { $, notify } from "./util0.js";
export function installRouter(state, render){
  state.routes = ["dashboard","courses","course-detail","learning","assessments","chat","tasks","profile","admin","guide","settings","search","contact"];
  state.route = "dashboard";
  function go(route){
    const prev = state.route;
    state.route = state.routes.includes(route) ? route : "dashboard";
    // close mobile sidebar & scroll top
    document.body.classList.remove("sidebar-open");
    document.getElementById("backdrop")?.classList.remove("active");
    document.querySelector(".main")?.scrollTo({top:0,behavior:"smooth"});
    render();
  }
  state.go = go;
  window.addEventListener("popstate", ()=>{
    const r = location.hash.replace("#","") || "dashboard";
    go(r);
  });
  const start = location.hash.replace("#","") || "dashboard";
  go(start);
}
