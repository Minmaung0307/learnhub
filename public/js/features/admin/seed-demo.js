// ---- seed-demo (v9 modular) ----
// If you already have `auth` and `db` exported from your firebase core, delete the imports below
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc, collection,
  serverTimestamp, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Use your existing instances if available:
const auth = getAuth();
const db   = getFirestore();

const ui = {
  wrap:  document.getElementById("seed-demo-wrap"),
  btn:   document.getElementById("btn-seed-demo"),
  note:  document.getElementById("seed-demo-status"),
};

function setStatus(msg, type="info"){
  if(!ui.note) return;
  ui.note.textContent = msg || "";
  ui.note.style.color = (type === "error" ? "#b00020" : type === "ok" ? "#0f7b0f" : "#555");
}

async function isAdmin(uid){
  try {
    const snap = await getDoc(doc(db, "roles", uid));
    return snap.exists() && snap.data()?.role === "admin";
  } catch (e){
    console.error("roles read failed:", e);
    return false;
  }
}

async function alreadySeeded(){
  const meta = await getDoc(doc(db, "meta", "seedDemo"));
  return meta.exists() && !!meta.data()?.done;
}

async function seedDemo(){
  const user = auth.currentUser;
  if(!user){ setStatus("Sign in first.", "error"); return; }

  setStatus("Seeding… please wait");
  ui.btn.disabled = true;

  try {
    // 1) Ensure current user has an admin role doc (harmless if already set)
    await setDoc(doc(db, "roles", user.uid), { role: "admin", updatedAt: serverTimestamp() }, { merge: true });

    // 2) Guard against duplicates
    if (await alreadySeeded()){
      setStatus("Already seeded. Nothing to do.", "ok");
      ui.btn.disabled = false;
      return;
    }

    // 3) Announcements
    const anns = [
      { title: "Welcome to LearnHub!", body: "Explore courses, finals, chat, tasks, and certificates.", createdAt: serverTimestamp() },
      { title: "New Features", body: "Short-answer finals and landscape certificates are live.", createdAt: serverTimestamp() }
    ];
    for (const a of anns) {
      await addDoc(collection(db, "announcements"), { ...a, uid: user.uid });
    }

    // 4) Courses (free + paid) with mixed content
    const courseDefs = [
      {
        title: "HTML & CSS Basics (Free)",
        price: 0,
        tags: ["web", "html", "css", "beginner"],
        content: [
          { type: "text",   title: "Intro", text: "Learn structure (HTML) and style (CSS)." },
          { type: "audio",  title: "Layout Audio", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
          { type: "video",  title: "Typography Video", url: "https://www.youtube.com/watch?v=1Rs2ND1ryYc" },
          { type: "quiz",   title: "Quick Quiz", items: [
            { kind: "mcq",   q: "HTML stands for…", choices:["Hyperlinks and Text Markup Language","Hyper Text Markup Language"], answer: 1 },
            { kind: "short", q: "CSS property to change text color?", answer: "color" }
          ]}
        ]
      },
      {
        title: "JavaScript for Data (Paid)",
        price: 49,
        tags: ["javascript", "data", "charts", "intermediate"],
        content: [
          { type: "text",  title: "Numbers & Arrays", text: "Basics of arrays, reduce/map/filter." },
          { type: "video", title: "Chart.js Intro", url: "https://www.youtube.com/watch?v=sE08f4iuOhA" },
          { type: "quiz",  title: "Data Quiz", items: [
            { kind: "mcq",   q: "Mean of [2,4,6]?", choices: ["3","4","5"], answer: 1 },
            { kind: "short", q: "Popular JS chart lib starting with 'C'?", answer: "chart.js" }
          ]}
        ]
      }
    ];

    const courseIds = [];
    for (const c of courseDefs){
      const ref = await addDoc(collection(db, "courses"), {
        ...c,
        active: true,
        createdAt: serverTimestamp(),
        ownerUid: user.uid
      });
      courseIds.push({ id: ref.id, title: c.title });
    }

    // 5) Finals (link to courses)
    const finals = [
      {
        courseId: courseIds[0]?.id || "",
        courseTitle: courseIds[0]?.title || "HTML & CSS Basics (Free)",
        isFinal: true,
        passScore: 60,
        items: [
          { type: "mcq", q: "CSS stands for…", choices: ["Cascading Style Sheets", "Creative Style System"], answer: 0 },
          { type: "short", q: "HTML tag for a link?", answer: "<a>" }
        ]
      },
      {
        courseId: courseIds[1]?.id || "",
        courseTitle: courseIds[1]?.title || "JavaScript for Data (Paid)",
        isFinal: true,
        passScore: 70,
        items: [
          { type: "mcq", q: "Mean of [1,2,3]?", choices: ["1","2","3"], answer: 1 },
          { type: "short", q: "Array method to combine values?", answer: "reduce" }
        ]
      }
    ];
    for (const f of finals){
      await addDoc(collection(db, "finals"), { ...f, ownerUid: user.uid, createdAt: serverTimestamp() });
    }

    // 6) Tasks (assigned to current admin as example)
    await addDoc(collection(db, "tasks"), {
      uid: user.uid,
      title: "Review Demo Course",
      due: new Date(Date.now()+ 7*24*60*60*1000).toISOString(),
      done: false,
      createdAt: serverTimestamp()
    });

    // 7) Course chat demo (two channels)
    for (const ch of ["general", courseIds[0]?.id].filter(Boolean)) {
      await addDoc(collection(db, "messages"), {
        channel: ch,
        text: ch === "general" ? "Welcome to the general chat!" : "Discussion for the HTML & CSS course.",
        uid: user.uid,
        createdAt: serverTimestamp()
      });
    }

    // 8) Profile for current user
    await setDoc(doc(db, "profiles", user.uid), {
      displayName: user.displayName || "Admin User",
      email: user.email,
      avatarUrl: "",
      signatureUrl: "",
      bio: "This is a demo admin profile.",
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 9) Certificate + transcript placeholders
    await addDoc(collection(db, "certificates"), {
      uid: user.uid,
      courseId: courseIds[0]?.id || "",
      style: "landscape",
      downloadUrl: "",
      createdAt: serverTimestamp()
    });
    await addDoc(collection(db, "transcripts"), {
      uid: user.uid,
      entries: [
        { courseId: courseIds[0]?.id || "", title: courseIds[0]?.title || "HTML & CSS Basics (Free)", score: 95 },
        { courseId: courseIds[1]?.id || "", title: courseIds[1]?.title || "JavaScript for Data (Paid)", score: 88 }
      ],
      createdAt: serverTimestamp()
    });

    // 10) Mark seeded
    await setDoc(doc(db, "meta", "seedDemo"), { done: true, by: user.uid, at: serverTimestamp(), version: 1 });

    setStatus("Seeded ✔", "ok");
  } catch (err){
    console.error(err);
    setStatus(err.message || "Seeding failed", "error");
  } finally {
    ui.btn.disabled = false;
  }
}

// Show the button only for admins
onAuthStateChanged(auth, async (u) => {
  if (!u) { if (ui.wrap) ui.wrap.style.display = "none"; return; }
  if (await isAdmin(u.uid)) {
    if (ui.wrap) ui.wrap.style.display = "";
    if (ui.btn && !ui.btn.dataset.bound){
      ui.btn.dataset.bound = "1";
      ui.btn.addEventListener("click", seedDemo);
    }
  } else {
    if (ui.wrap) ui.wrap.style.display = "none";
  }
});