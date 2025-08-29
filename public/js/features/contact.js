export function vContact(){
  return `<div class="card"><div class="card-body">
    <h3 style="margin:0 0 8px 0">Contact Us</h3>
    <div class="grid">
      <input class="input" id="ct-name" placeholder="Your name"/>
      <input class="input" id="ct-email" placeholder="Your email"/>
      <textarea class="input" id="ct-msg" placeholder="How can we help?" rows="5"></textarea>
      <button class="btn" id="ct-send">Send</button>
      <div class="muted" style="font-size:12px">Uses EmailJS — configure keys in <code>public/js/services/config.js</code>.</div>
    </div>
  </div></div>`;
}
export function wireContact(state){
  document.getElementById("ct-send")?.addEventListener("click", async ()=>{
    const name = document.getElementById("ct-name")?.value.trim();
    const email = document.getElementById("ct-email")?.value.trim();
    const msg = document.getElementById("ct-msg")?.value.trim();
    if(!name || !email || !msg){ window.notify("Fill all fields","warn"); return; }
    try{
      if(!window.emailjs || !window.__EMAILJS_CONFIG?.publicKey) throw new Error("EmailJS not configured");
      emailjs.init(window.__EMAILJS_CONFIG.publicKey);
      await emailjs.send(window.__EMAILJS_CONFIG.serviceId, window.__EMAILJS_CONFIG.templateId, { from_name: name, reply_to: email, message: msg, to_email: window.__EMAILJS_CONFIG.toEmail });
      window.notify("Message sent!");
      document.getElementById("ct-name").value = "";
      document.getElementById("ct-email").value = "";
      document.getElementById("ct-msg").value = "";
    }catch(e){ console.error(e); window.notify(e?.message||"Failed to send","danger"); }
  });
}
