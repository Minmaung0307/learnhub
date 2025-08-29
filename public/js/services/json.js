// services/json.js
export async function fetchJSON(url){
  const r = await fetch(url, {cache:'no-store'});
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return await r.json();
}
