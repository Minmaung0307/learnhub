// services/seed.js
import {
  collection, doc, setDoc, getDocs, query, limit, deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/**
 * Admin-only demo seed. Safe to call multiple times.
 * @param {{db: import('firebase/firestore').Firestore, projectId: string, reset?: boolean}} opts
 */
export async function seedDemoData({ db, projectId, reset = true }) {
  if (!db) throw new Error("seedDemoData: missing db");

  // --- Step 0: optional reset/delete of existing demo collections
  const collections = [
    "courses", "announcements", "finals", "tasks",
    "courseChats", "profiles", "progress"
  ];
  if (reset) {
    for (const name of collections) {
      await deleteCollection(db, name, 200);
    }
  }

  // --- Step 1: create demo users (Auth REST) + roles
  const apiKey = (window.__FIREBASE_CONFIG && window.__FIREBASE_CONFIG.apiKey) || "";
  const demoUsers = [
    { email: "student.demo@learnhub.app", password: "demo1234", role: "student", displayName: "Demo Student" },
    { email: "teacher.demo@learnhub.app", password: "demo1234", role: "teacher", displayName: "Demo Teacher" },
  ];
  const created = await createUsersIfMissing(apiKey, demoUsers).catch((e) => {
    console.warn("Auth user creation via REST failed (maybe disabled Email/Password?)", e);
    return [];
  });

  // roles for created or existing emails (idempotent: we don’t know their UIDs unless created now)
  // if created now, we have localId -> we can write exact role doc
  for (const u of created) {
    await setDoc(doc(db, "roles", u.localId), { role: u.role, email: u.email }, { merge: true });
    await setDoc(doc(db, "profiles", u.localId), {
      displayName: u.displayName,
      email: u.email,
      avatarUrl: `https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=256&h=256&fit=crop&auto=format`,
      signatureUrl: `https://images.unsplash.com/photo-1520975922203-bd75f287a6f8?w=512&h=128&fit=clip&auto=format`,
      createdAt: serverTimestamp(),
    }, { merge: true });
  }

  // --- Step 2: seed content
  // 2a) courses with chapters/content & media (Unsplash/Pexels, sample audio/video)
  const courses = [
    {
      id: "web101",
      title: "Web Fundamentals",
      cover: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&auto=format&fit=crop&q=60",
      price: 0,
      description: "HTML/CSS/JS foundations with hands-on labs.",
      chapters: [
        {
          title: "Getting Started",
          lessons: [
            {
              type: "text",
              title: "The Web at a Glance",
              content: `
                <h3>What is the Web?</h3>
                <p>The Web is a network of documents connected by links. You access it with a browser.</p>
                <h4>Key Terms</h4>
                <ul><li>HTTP</li><li>HTML</li><li>CSS</li><li>JavaScript</li></ul>
              `
            },
            {
              type: "image",
              title: "Anatomy of a Web Page",
              src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&auto=format&fit=crop&q=60"
            },
            {
              type: "audio",
              title: "Intro Audio",
              src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
            },
            {
              type: "video",
              title: "Intro Video",
              src: "https://www.w3schools.com/html/mov_bbb.mp4"
            },
            {
              type: "quiz",
              title: "Quick Quiz",
              items: [
                { question: "HTML stands for…", options: ["Hyper Trainer Marking Language", "HyperText Markup Language"], answerIndex: 1, credit: 5 },
                { question: "CSS is used for…", options: ["Structure", "Style"], answerIndex: 1, credit: 5 },
              ]
            },
            {
              type: "short",
              title: "Short Answer",
              prompt: "Explain the difference between HTML and CSS.",
              maxChars: 280,
              credit: 10
            }
          ]
        },
        {
          title: "Page Layout",
          lessons: [
            { type: "text", title: "Box Model", content: "<p>Margin, border, padding, content.</p>" },
            { type: "image", title: "Layout Inspiration", src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&auto=format&fit=crop&q=60" }
          ]
        }
      ]
    },
    {
      id: "js201",
      title: "JavaScript for Builders",
      cover: "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=1200&auto=format&fit=crop&q=60",
      price: 29,
      description: "Modern JS essentials: DOM, fetch, async, modules.",
      chapters: [
        {
          title: "Syntax & Types",
          lessons: [
            { type: "text", title: "Primitives vs Objects", content: "<p>string, number, boolean, null, undefined, symbol, bigint.</p>" },
            { type: "video", title: "Async Basics", src: "https://www.w3schools.com/html/mov_bbb.mp4" },
            { type: "quiz", title: "Types Quiz", items: [{ question: "typeof null is…", options: ["'null'", "'object'"], answerIndex: 1, credit: 5 }] }
          ]
        }
      ]
    }
  ];
  for (const c of courses) {
    await setDoc(doc(db, "courses", c.id), {
      ...c, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  // 2b) announcements
  const announcements = [
    { id: "a1", title: "Welcome to LearnHub", body: "Explore your first course and track progress!", pinned: true },
    { id: "a2", title: "New: JavaScript for Builders", body: "Hands-on projects and quizzes now available." }
  ];
  for (const a of announcements) {
    await setDoc(doc(db, "announcements", a.id), { ...a, createdAt: serverTimestamp() }, { merge: true });
  }

  // 2c) finals (course features / final assessments)
  const finals = [
    { id: "f-web101", courseId: "web101", title: "Web101 Final", instructions: "Build a 1-page site, submit URL." },
    { id: "f-js201", courseId: "js201", title: "JS201 Final", instructions: "Implement a fetch-based app." }
  ];
  for (const f of finals) {
    await setDoc(doc(db, "finals", f.id), { ...f, createdAt: serverTimestamp() }, { merge: true });
  }

  // 2d) tasks (demo lanes: todo, doing, done)
  const tasks = [
    { id: "t1", uid: "__DEMO__", title: "Read Chapter 1", lane: "todo" },
    { id: "t2", uid: "__DEMO__", title: "Watch Intro Video", lane: "doing" },
    { id: "t3", uid: "__DEMO__", title: "Finish Quiz", lane: "done" },
  ];
  for (const t of tasks) {
    await setDoc(doc(db, "tasks", t.id), { ...t, createdAt: serverTimestamp() }, { merge: true });
  }

  // 2e) course chats
  const chats = [
    { id: "c1", courseId: "web101", author: "System", text: "Say hello and introduce yourself!" }
  ];
  for (const m of chats) {
    await setDoc(doc(db, "courseChats", m.id), { ...m, createdAt: serverTimestamp() }, { merge: true });
  }

  // 2f) progress: create demo progress docs keyed as `${uid}_${courseId}` (works with simple rules)
  const demoProgress = [
    { pk: "DEMOUSER_web101", uid: "DEMOUSER", courseId: "web101", completed: 1, total: 6, credits: 10, score: 10, bookmarks: [] },
  ];
  for (const p of demoProgress) {
    await setDoc(doc(db, "progress", p.pk), { ...p, createdAt: serverTimestamp() }, { merge: true });
  }
}

/** Delete a collection in batches to avoid timeouts */
async function deleteCollection(db, collName, batchSize = 200) {
  const collRef = collection(db, collName);
  while (true) {
    const snap = await getDocs(query(collRef, limit(batchSize)));
    if (snap.empty) break;
    const deletions = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletions);
  }
}

/**
 * Create demo users with REST without switching current session.
 * Returns array: [{ localId, email, role, displayName }]
 */
async function createUsersIfMissing(apiKey, list) {
  if (!apiKey) throw new Error("Missing apiKey for REST signup");
  const out = [];
  for (const u of list) {
    const exists = await emailExists(apiKey, u.email).catch(() => false);
    if (exists) {
      // We don’t have UID here; roles will be written later if they sign in.
      out.push({ localId: null, email: u.email, role: u.role, displayName: u.displayName });
      continue;
    }
    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email, password: u.password, returnSecureToken: true })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      out.push({ localId: data.localId, email: u.email, role: u.role, displayName: u.displayName });
    } catch (e) {
      console.warn("Failed to create user", u.email, e);
    }
  }
  return out;
}

// Lightweight email check using signInWithPassword REST (will fail but tells us if user exists)
async function emailExists(apiKey, email) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "___this_will_fail___", returnSecureToken: true })
  });
  const data = await res.json().catch(() => ({}));
  // If error is EMAIL_NOT_FOUND, then it's new; otherwise (e.g., INVALID_PASSWORD) it exists
  if (data?.error?.message === "EMAIL_NOT_FOUND") return false;
  return true; // either existed or ambiguous -> treat as exists to be safe
}