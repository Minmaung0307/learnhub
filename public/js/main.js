// === Firebase Init ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Inline Firebase Config (yours pasted earlier)
const firebaseConfig = {
  apiKey: "AIzaSyDVsqq0FLiGUp1I7JjH_yeYZBpqlDSo-uM",
  authDomain: "learnhub-mm.firebaseapp.com",
  projectId: "learnhub-mm",
  storageBucket: "learnhub-mm.firebasestorage.app",
  messagingSenderId: "961341989824",
  appId: "1:961341989824:web:760be616c75561008cde25",
  measurementId: "G-LM292D5D36",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// === Globals ===
let currentUser = null;
let currentRole = "student"; // default

// === Auth State ===
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await loadUserRole(user.uid);

    console.log(`Logged in as ${user.email} with role ${currentRole}`);

    if (currentRole === "admin") {
      await autoSeedDemoData(); // auto-seed on first login as admin
    }

    showApp();
  } else {
    currentUser = null;
    currentRole = "student";
    showLogin();
  }
});

// === Load User Role from Firestore ===
async function loadUserRole(uid) {
  try {
    const ref = doc(db, "roles", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      currentRole = snap.data().role || "student";
    } else {
      currentRole = "student";
    }
  } catch (err) {
    console.error("Error loading role:", err);
    currentRole = "student";
  }
}

// === Auto-Seed Demo Data (Admin only, once per project) ===
async function autoSeedDemoData() {
  try {
    const flagRef = doc(db, "meta", "seeded");
    const flagSnap = await getDoc(flagRef);

    if (flagSnap.exists()) {
      console.log("✅ Demo data already seeded.");
      return;
    }

    console.log("🌱 Seeding demo data...");
    // Roles
    await setDoc(doc(db, "roles", currentUser.uid), { role: "admin" });

    // Courses
    const coursesCol = collection(db, "courses");
    await addDoc(coursesCol, {
      title: "JavaScript Basics",
      type: "free",
      img: "https://images.unsplash.com/photo-1581092334440-2c8b1d4a2f2b",
      description: "Learn the fundamentals of JS step by step.",
      chapters: [
        { title: "Intro to JS", content: "History and basics of JS." },
        { title: "Variables", content: "Using let, const, var." },
      ],
      createdAt: Date.now(),
    });

    await addDoc(coursesCol, {
      title: "Fullstack Web Development",
      type: "paid",
      img: "https://images.unsplash.com/photo-1529101091764-c3526daf38fe",
      description: "Frontend + Backend + Deployment.",
      chapters: [
        { title: "HTML & CSS", content: "Structure and styling." },
        { title: "Node.js", content: "Server-side JavaScript." },
      ],
      createdAt: Date.now(),
    });

    // Announcements
    await addDoc(collection(db, "announcements"), {
      title: "Welcome to LearnHub!",
      body: "This is your demo announcement.",
      createdAt: Date.now(),
    });

    // Tasks (Kanban)
    await addDoc(collection(db, "tasks"), {
      title: "Setup Firebase",
      status: "todo",
      uid: currentUser.uid,
    });

    // Finals
    await addDoc(collection(db, "finals"), {
      course: "JavaScript Basics",
      exam: "Final Exam - 20 Questions",
      createdAt: Date.now(),
    });

    // Mark seed complete
    await setDoc(flagRef, { seededAt: Date.now() });

    console.log("🌱 Demo data seeded successfully.");
  } catch (err) {
    console.error("Error seeding demo data:", err);
  }
}

// === Simple UI placeholders ===
function showLogin() {
  document.body.innerHTML = `
    <div class="login-wrapper">
      <h1>LearnHub Login</h1>
      <input id="email" placeholder="Email" />
      <input id="password" type="password" placeholder="Password" />
      <button id="loginBtn">Login</button>
    </div>
  `;

  document.getElementById("loginBtn").onclick = async () => {
    const email = document.getElementById("email").value;
    const pw = document.getElementById("password").value;
    try {
      await signInWithEmailAndPassword(auth, email, pw);
    } catch (err) {
      alert("Login failed: " + err.message);
    }
  };
}

function showApp() {
  document.body.innerHTML = `
    <div class="app-wrapper">
      <h2>Welcome ${currentUser.email}</h2>
      <p>Role: ${currentRole}</p>
      <button id="logoutBtn">Logout</button>
      <div id="content">Loading dashboard...</div>
    </div>
  `;

  document.getElementById("logoutBtn").onclick = () => signOut(auth);
}

// === TASKS: Kanban Board ===
async function loadTasks() {
  const tasksCol = collection(db, "tasks");
  const snap = await getDocs(tasksCol);

  const tasks = [];
  snap.forEach((docSnap) => {
    tasks.push({ id: docSnap.id, ...docSnap.data() });
  });

  renderTasks(tasks);
}

function renderTasks(tasks) {
  const statuses = ["todo", "inprogress", "done"];
  let html = `
    <div class="kanban-board">
      ${statuses
        .map(
          (status) => `
          <div class="kanban-column" data-status="${status}">
            <h3>${status.toUpperCase()}</h3>
            <div class="kanban-dropzone" id="${status}-zone">
              ${tasks
                .filter((t) => t.status === status)
                .map(
                  (t) => `
                <div class="task-card" draggable="true" data-id="${t.id}">
                  ${t.title}
                  ${
                    currentRole === "admin"
                      ? `<button onclick="deleteTask('${t.id}')">✕</button>`
                      : ""
                  }
                </div>`
                )
                .join("")}
            </div>
          </div>`
        )
        .join("")}
    </div>
    ${
      currentRole === "admin"
        ? `<button id="newTaskBtn">+ New Task</button>`
        : ""
    }
  `;

  document.getElementById("content").innerHTML = html;

  // Drag & drop
  document.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("dragstart", dragStart);
  });

  document.querySelectorAll(".kanban-dropzone").forEach((zone) => {
    zone.addEventListener("dragover", dragOver);
    zone.addEventListener("drop", dropTask);
  });

  if (document.getElementById("newTaskBtn")) {
    document.getElementById("newTaskBtn").onclick = newTask;
  }
}

function dragStart(e) {
  e.dataTransfer.setData("id", e.target.dataset.id);
}

function dragOver(e) {
  e.preventDefault();
}

async function dropTask(e) {
  e.preventDefault();
  const id = e.dataTransfer.getData("id");
  const newStatus = e.currentTarget.parentElement.dataset.status;

  const ref = doc(db, "tasks", id);
  await updateDoc(ref, { status: newStatus });
  loadTasks();
}

async function newTask() {
  const title = prompt("Task title:");
  if (!title) return;
  await addDoc(collection(db, "tasks"), {
    title,
    status: "todo",
    uid: currentUser.uid,
  });
  loadTasks();
}

async function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  await deleteDoc(doc(db, "tasks", id));
  loadTasks();
}

// === COURSES & MY LEARNING ===
async function loadCourses() {
  const snap = await getDocs(collection(db, "courses"));
  const courses = [];
  snap.forEach((docSnap) => {
    courses.push({ id: docSnap.id, ...docSnap.data() });
  });

  renderCourses(courses);
}

function renderCourses(courses) {
  let html = `
    <div class="course-grid">
      ${courses
        .map(
          (c) => `
        <div class="course-card">
          <img src="${c.image || 'https://source.unsplash.com/400x200/?education'}" alt="${c.title}">
          <div class="course-body">
            <h3>${c.title}</h3>
            <p>${c.description || ""}</p>
            <button onclick="openCourse('${c.id}')">Open</button>
            ${
              currentRole === "admin"
                ? `
              <button onclick="editCourse('${c.id}')">Edit</button>
              <button onclick="deleteCourse('${c.id}')">Delete</button>`
                : ""
            }
          </div>
        </div>`
        )
        .join("")}
    </div>
    ${
      currentRole === "admin"
        ? `<button id="newCourseBtn">+ New Course</button>`
        : ""
    }
  `;

  document.getElementById("content").innerHTML = html;

  if (document.getElementById("newCourseBtn")) {
    document.getElementById("newCourseBtn").onclick = newCourse;
  }
}

async function openCourse(id) {
  const ref = doc(db, "courses", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Course not found");

  const course = { id: snap.id, ...snap.data() };

  let html = `
    <div class="course-detail">
      <h2>${course.title}</h2>
      <p>${course.description || ""}</p>
      <div class="progress-bar">
        <div id="progress-${course.id}" class="progress-fill" style="width:0%"></div>
      </div>
      <div class="chapters">
        ${course.chapters
          .map(
            (ch, i) => `
          <div class="chapter">
            <h4>${i + 1}. ${ch.title}</h4>
            <p>${ch.text || ""}</p>
            ${ch.image ? `<img src="${ch.image}">` : ""}
            ${ch.audio ? `<audio controls src="${ch.audio}"></audio>` : ""}
            ${ch.video ? `<video controls src="${ch.video}"></video>` : ""}
            <button onclick="markChapter('${course.id}', ${i})">Mark as Read</button>
            <button onclick="bookmarkChapter('${course.id}', ${i})">Bookmark</button>
          </div>`
          )
          .join("")}
      </div>
      <button onclick="backToCourses()">← Back</button>
    </div>
  `;

  document.getElementById("content").innerHTML = html;

  // Load user progress
  loadProgress(course.id);
}

function backToCourses() {
  loadCourses();
}

// === Progress & Bookmarks ===
async function markChapter(courseId, index) {
  const ref = doc(db, "progress", `${currentUser.uid}_${courseId}`);
  const snap = await getDoc(ref);
  let data = snap.exists() ? snap.data() : { chapters: [] };

  if (!data.chapters.includes(index)) data.chapters.push(index);
  await setDoc(ref, data);

  loadProgress(courseId);
}

async function bookmarkChapter(courseId, index) {
  const ref = doc(db, "bookmarks", `${currentUser.uid}_${courseId}`);
  const snap = await getDoc(ref);
  let data = snap.exists() ? snap.data() : { chapters: [] };

  if (!data.chapters.includes(index)) data.chapters.push(index);
  await setDoc(ref, data);

  alert("Bookmarked!");
}

async function loadProgress(courseId) {
  const ref = doc(db, "progress", `${currentUser.uid}_${courseId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const chapters = snap.data().chapters || [];
  const courseRef = doc(db, "courses", courseId);
  const courseSnap = await getDoc(courseRef);
  const total = courseSnap.data().chapters.length;

  const percent = Math.round((chapters.length / total) * 100);
  document.getElementById(`progress-${courseId}`).style.width = percent + "%";
}

// === CRUD: Admin Courses ===
async function newCourse() {
  const title = prompt("Course title:");
  if (!title) return;
  await addDoc(collection(db, "courses"), {
    title,
    description: "Demo description",
    image: "https://source.unsplash.com/400x200/?classroom",
    chapters: [
      { title: "Intro", text: "Welcome lesson", image: "", audio: "", video: "" },
      { title: "Second Lesson", text: "Deeper content", image: "", audio: "", video: "" },
    ],
  });
  loadCourses();
}

async function editCourse(id) {
  const ref = doc(db, "courses", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Not found");

  const newTitle = prompt("New title:", snap.data().title);
  if (!newTitle) return;
  await updateDoc(ref, { title: newTitle });
  loadCourses();
}

async function deleteCourse(id) {
  if (!confirm("Delete course?")) return;
  await deleteDoc(doc(db, "courses", id));
  loadCourses();
}

// === FINALS (per course) ===
async function loadFinals() {
  const snap = await getDocs(collection(db, "finals"));
  const finals = [];
  snap.forEach((d) => finals.push({ id: d.id, ...d.data() }));

  let html = `
    <h2>Final Exams</h2>
    <div class="finals-grid">
      ${finals
        .map(
          (f) => `
        <div class="final-card">
          <h3>${f.title}</h3>
          <p>${f.description || ""}</p>
          <button onclick="takeFinal('${f.id}')">Take Exam</button>
          ${
            currentRole === "admin"
              ? `<button onclick="editFinal('${f.id}')">Edit</button>
                 <button onclick="deleteFinal('${f.id}')">Delete</button>`
              : ""
          }
        </div>`
        )
        .join("")}
    </div>
    ${currentRole === "admin" ? `<button id="newFinalBtn">+ New Final</button>` : ""}
  `;

  document.getElementById("content").innerHTML = html;

  if (document.getElementById("newFinalBtn")) {
    document.getElementById("newFinalBtn").onclick = newFinal;
  }
}

async function takeFinal(id) {
  const ref = doc(db, "finals", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Final not found");

  const final = snap.data();

  let html = `
    <h2>${final.title}</h2>
    <form id="finalForm">
      ${final.questions
        .map(
          (q, i) => `
        <div class="question">
          <p><b>Q${i + 1}:</b> ${q.text}</p>
          ${q.type === "mcq"
            ? q.options
                .map(
                  (opt) =>
                    `<label><input type="radio" name="q${i}" value="${opt}"> ${opt}</label>`
                )
                .join("<br>")
            : `<textarea name="q${i}" placeholder="Your answer"></textarea>`}
        </div>`
        )
        .join("")}
      <button type="submit">Submit</button>
    </form>
  `;

  document.getElementById("content").innerHTML = html;

  document.getElementById("finalForm").onsubmit = async (e) => {
    e.preventDefault();
    let score = 0;

    final.questions.forEach((q, i) => {
      const val = e.target[`q${i}`].value;
      if (q.type === "mcq" && val === q.answer) score++;
    });

    const total = final.questions.length;
    const percent = Math.round((score / total) * 100);

    await setDoc(doc(db, "scores", `${currentUser.uid}_${id}`), {
      uid: currentUser.uid,
      finalId: id,
      score,
      total,
      percent,
      credits: percent >= 60 ? 3 : 0,
      timestamp: Date.now(),
    });

    alert(`You scored ${score}/${total} (${percent}%).`);

    if (percent >= 60) {
      await generateCertificate(currentUser.uid, final.title, percent);
      await generateTranscript(currentUser.uid);
    }

    loadFinals();
  };
}

// === CERTIFICATE (Landscape PDF) ===
async function generateCertificate(uid, courseTitle, percent) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("landscape");

  doc.setFontSize(22);
  doc.text("Certificate of Completion", 105, 40, null, null, "center");

  doc.setFontSize(16);
  doc.text(`This certifies that`, 105, 60, null, null, "center");
  doc.setFontSize(20);
  doc.text(`${currentUser.email}`, 105, 75, null, null, "center");

  doc.setFontSize(14);
  doc.text(
    `has successfully completed the course "${courseTitle}" with a score of ${percent}%.`,
    105,
    95,
    null,
    null,
    "center"
  );

  doc.setFontSize(12);
  doc.text("LearnHub Academy", 105, 120, null, null, "center");

  doc.save(`certificate-${uid}.pdf`);
}

// === TRANSCRIPT (Portrait PDF) ===
async function generateTranscript(uid) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("portrait");

  doc.setFontSize(18);
  doc.text("Academic Transcript", 105, 20, null, null, "center");

  const q = query(collection(db, "scores"), where("uid", "==", uid));
  const snap = await getDocs(q);

  let y = 40;
  snap.forEach((s) => {
    const data = s.data();
    doc.setFontSize(12);
    doc.text(
      `${data.finalId}: ${data.score}/${data.total} (${data.percent}%) – Credits: ${data.credits}`,
      20,
      y
    );
    y += 10;
  });

  doc.save(`transcript-${uid}.pdf`);
}

// === CRUD: Admin Finals ===
async function newFinal() {
  const title = prompt("Final exam title:");
  if (!title) return;

  await addDoc(collection(db, "finals"), {
    title,
    description: "Demo final exam",
    questions: [
      { text: "2+2=?", type: "mcq", options: ["3", "4", "5"], answer: "4" },
      { text: "Write a short note about learning.", type: "text" },
    ],
  });

  loadFinals();
}

async function editFinal(id) {
  const ref = doc(db, "finals", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Not found");

  const newTitle = prompt("New final title:", snap.data().title);
  if (!newTitle) return;
  await updateDoc(ref, { title: newTitle });
  loadFinals();
}

async function deleteFinal(id) {
  if (!confirm("Delete final exam?")) return;
  await deleteDoc(doc(db, "finals", id));
  loadFinals();
}

// === ANNOUNCEMENTS ===
async function loadAnnouncements() {
  const snap = await getDocs(collection(db, "announcements"));
  const anns = [];
  snap.forEach((d) => anns.push({ id: d.id, ...d.data() }));

  let html = `
    <h2>Announcements</h2>
    <div class="ann-list">
      ${anns
        .map(
          (a) => `
        <div class="ann-card">
          <h3>${a.title}</h3>
          <p>${a.body}</p>
          <small>${new Date(a.timestamp).toLocaleString()}</small>
          ${
            currentRole === "admin"
              ? `<button onclick="editAnnouncement('${a.id}')">Edit</button>
                 <button onclick="deleteAnnouncement('${a.id}')">Delete</button>`
              : ""
          }
        </div>`
        )
        .join("")}
    </div>
    ${currentRole === "admin" ? `<button id="newAnnBtn">+ New Announcement</button>` : ""}
  `;

  document.getElementById("content").innerHTML = html;

  if (document.getElementById("newAnnBtn")) {
    document.getElementById("newAnnBtn").onclick = newAnnouncement;
  }
}

async function newAnnouncement() {
  const title = prompt("Announcement title:");
  const body = prompt("Announcement body:");
  if (!title || !body) return;

  await addDoc(collection(db, "announcements"), {
    title,
    body,
    timestamp: Date.now(),
  });

  loadAnnouncements();
}

async function editAnnouncement(id) {
  const ref = doc(db, "announcements", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Not found");

  const newTitle = prompt("New title:", snap.data().title);
  const newBody = prompt("New body:", snap.data().body);

  await updateDoc(ref, { title: newTitle, body: newBody });
  loadAnnouncements();
}

async function deleteAnnouncement(id) {
  if (!confirm("Delete announcement?")) return;
  await deleteDoc(doc(db, "announcements", id));
  loadAnnouncements();
}

// === COURSE CHAT (per course) ===
async function loadChat(courseId) {
  const q = query(
    collection(db, "chat"),
    where("courseId", "==", courseId),
    orderBy("timestamp", "asc")
  );
  const snap = await getDocs(q);
  const msgs = [];
  snap.forEach((d) => msgs.push({ id: d.id, ...d.data() }));

  let html = `
    <h2>Course Chat</h2>
    <div class="chat-box">
      ${msgs
        .map(
          (m) => `
        <div class="msg">
          <b>${m.user}</b>: ${m.text}
          <small>${new Date(m.timestamp).toLocaleTimeString()}</small>
          ${
            currentRole === "admin" || m.uid === currentUser.uid
              ? `<button onclick="deleteMsg('${m.id}')">x</button>`
              : ""
          }
        </div>`
        )
        .join("")}
    </div>
    <div class="chat-input">
      <input id="chatText" placeholder="Type message...">
      <button onclick="sendMsg('${courseId}')">Send</button>
    </div>
  `;

  document.getElementById("content").innerHTML = html;
}

async function sendMsg(courseId) {
  const text = document.getElementById("chatText").value.trim();
  if (!text) return;

  await addDoc(collection(db, "chat"), {
    courseId,
    uid: currentUser.uid,
    user: currentUser.email,
    text,
    timestamp: Date.now(),
  });

  loadChat(courseId);
}

async function deleteMsg(id) {
  if (!confirm("Delete this message?")) return;
  await deleteDoc(doc(db, "chat", id));
}

// (Part F – Tasks + Profile)
// === TASKS (Kanban Board with Drag & Drop) ===
async function loadTasks() {
  const snap = await getDocs(collection(db, "tasks"));
  const tasks = [];
  snap.forEach((d) => tasks.push({ id: d.id, ...d.data() }));

  let html = `
    <h2>Tasks</h2>
    <div class="task-board">
      ${["To Do", "In Progress", "Done"]
        .map(
          (col) => `
          <div class="task-col" data-status="${col}">
            <h3>${col}</h3>
            <div class="task-list" id="col-${col.replace(/\s+/g, "")}">
              ${tasks
                .filter((t) => t.status === col)
                .map(
                  (t) => `
                <div class="task-card" draggable="true" data-id="${t.id}">
                  <p>${t.title}</p>
                  <small>${t.desc || ""}</small>
                  ${
                    currentRole === "admin"
                      ? `<button onclick="editTask('${t.id}')">✏</button>
                         <button onclick="deleteTask('${t.id}')">🗑</button>`
                      : ""
                  }
                </div>`
                )
                .join("")}
            </div>
          </div>`
        )
        .join("")}
    </div>
    <button id="newTaskBtn">+ New Task</button>
  `;

  document.getElementById("content").innerHTML = html;

  document.getElementById("newTaskBtn").onclick = newTask;

  enableDragDrop();
}

async function newTask() {
  const title = prompt("Task title:");
  if (!title) return;

  await addDoc(collection(db, "tasks"), {
    title,
    desc: "",
    status: "To Do",
    uid: currentUser.uid,
  });

  loadTasks();
}

async function editTask(id) {
  const ref = doc(db, "tasks", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Not found");

  const newTitle = prompt("New title:", snap.data().title);
  const newDesc = prompt("New desc:", snap.data().desc);

  await updateDoc(ref, { title: newTitle, desc: newDesc });
  loadTasks();
}

async function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  await deleteDoc(doc(db, "tasks", id));
  loadTasks();
}

function enableDragDrop() {
  const cards = document.querySelectorAll(".task-card");
  const cols = document.querySelectorAll(".task-list");

  cards.forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("id", card.dataset.id);
    });
  });

  cols.forEach((col) => {
    col.addEventListener("dragover", (e) => e.preventDefault());
    col.addEventListener("drop", async (e) => {
      const id = e.dataTransfer.getData("id");
      const newStatus = col.parentElement.dataset.status;
      await updateDoc(doc(db, "tasks", id), { status: newStatus });
      loadTasks();
    });
  });
}

// === PROFILE ===
async function loadProfile() {
  const ref = doc(db, "profiles", currentUser.uid);
  const snap = await getDoc(ref);
  let profile = snap.exists() ? snap.data() : {};

  let html = `
    <h2>Profile</h2>
    <div class="profile-card">
      <img src="${profile.avatar || "https://via.placeholder.com/100"}" class="avatar">
      <h3>${profile.name || currentUser.email}</h3>
      <p>${profile.bio || "No bio yet."}</p>
      <button onclick="editProfile()">Edit</button>
    </div>
  `;

  document.getElementById("content").innerHTML = html;
}

async function editProfile() {
  const name = prompt("Your name:");
  const bio = prompt("Your bio:");
  const avatar = prompt("Avatar URL:");

  await setDoc(doc(db, "profiles", currentUser.uid), {
    name,
    bio,
    avatar,
  });

  loadProfile();
}

// (Part G – Scores, Credits, Certificate & Transcript)
// === SCORES & CREDITS ===
async function loadScores() {
  const snap = await getDocs(
    query(collection(db, "scores"), where("uid", "==", currentUser.uid))
  );
  let scores = [];
  snap.forEach((d) => scores.push({ id: d.id, ...d.data() }));

  let totalCredits = scores.reduce((sum, s) => sum + (s.credits || 0), 0);

  let html = `
    <h2>My Scores & Credits</h2>
    <table class="score-table">
      <tr><th>Course</th><th>Score</th><th>Credits</th></tr>
      ${scores
        .map(
          (s) => `
        <tr>
          <td>${s.courseTitle}</td>
          <td>${s.score}</td>
          <td>${s.credits}</td>
        </tr>
      `
        )
        .join("")}
      <tr><td colspan="2"><strong>Total</strong></td><td><strong>${totalCredits}</strong></td></tr>
    </table>
    <button onclick="downloadTranscript()">📄 Download Transcript</button>
  `;

  document.getElementById("content").innerHTML = html;
}

// === CERTIFICATE GENERATION (Landscape PDF) ===
async function downloadCertificate(courseId) {
  const courseRef = doc(db, "courses", courseId);
  const snap = await getDoc(courseRef);
  if (!snap.exists()) return alert("Course not found");

  const { title } = snap.data();
  const { jsPDF } = window.jspdf;

  const pdf = new jsPDF({ orientation: "landscape" });
  pdf.setFontSize(24);
  pdf.text("Certificate of Completion", 105, 40, { align: "center" });

  pdf.setFontSize(16);
  pdf.text(
    `This certifies that ${currentUser.email} has successfully completed`,
    105,
    70,
    { align: "center" }
  );

  pdf.setFontSize(20);
  pdf.text(title, 105, 90, { align: "center" });

  pdf.setFontSize(12);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 105, 120, {
    align: "center",
  });

  pdf.save(`certificate-${title}.pdf`);
}

// === TRANSCRIPT GENERATION (Portrait PDF) ===
async function downloadTranscript() {
  const snap = await getDocs(
    query(collection(db, "scores"), where("uid", "==", currentUser.uid))
  );
  let scores = [];
  snap.forEach((d) => scores.push({ ...d.data() }));

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait" });

  pdf.setFontSize(20);
  pdf.text("Academic Transcript", 105, 20, { align: "center" });

  pdf.setFontSize(12);
  pdf.text(`Student: ${currentUser.email}`, 20, 40);

  let y = 60;
  scores.forEach((s) => {
    pdf.text(`${s.courseTitle} - Score: ${s.score}, Credits: ${s.credits}`, 20, y);
    y += 10;
  });

  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, y + 10);

  pdf.save("transcript.pdf");
}

// (Part H – Courses & My Learning)
// === COURSES LIST (Admin + Student View) ===
async function loadCourses() {
  const snap = await getDocs(collection(db, "courses"));
  let html = `<h2>Courses</h2><div class="card-grid">`;

  snap.forEach((docSnap) => {
    const c = docSnap.data();
    html += `
      <div class="card">
        <img src="${c.image || 'https://source.unsplash.com/400x200/?study,book'}" class="card-img" />
        <div class="card-body">
          <h3>${c.title}</h3>
          <p>${c.description || ""}</p>
          <button onclick="enrollCourse('${docSnap.id}')">📘 Enroll</button>
          ${isAdmin() ? `<button onclick="editCourse('${docSnap.id}')">✏️ Edit</button>
                        <button onclick="deleteCourse('${docSnap.id}')">🗑️ Delete</button>` : ""}
        </div>
      </div>`;
  });

  html += `</div>`;
  document.getElementById("content").innerHTML = html;
}

// === ENROLL COURSE ===
async function enrollCourse(courseId) {
  await setDoc(doc(db, "enrollments", `${currentUser.uid}_${courseId}`), {
    uid: currentUser.uid,
    courseId,
    progress: 0,
    bookmarks: []
  });
  alert("Enrolled successfully!");
  loadMyLearning();
}

// === MY LEARNING (progress + bookmarks) ===
async function loadMyLearning() {
  const snap = await getDocs(
    query(collection(db, "enrollments"), where("uid", "==", currentUser.uid))
  );

  let html = `<h2>My Learning</h2><div class="card-grid">`;

  for (const docSnap of snap.docs) {
    const e = docSnap.data();
    const courseSnap = await getDoc(doc(db, "courses", e.courseId));
    if (!courseSnap.exists()) continue;
    const c = courseSnap.data();

    html += `
      <div class="card">
        <img src="${c.image || 'https://source.unsplash.com/400x200/?classroom'}" class="card-img" />
        <div class="card-body">
          <h3>${c.title}</h3>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${e.progress || 0}%"></div>
          </div>
          <p>${e.progress || 0}% completed</p>
          <button onclick="openCourse('${e.courseId}')">▶️ Continue</button>
        </div>
      </div>
    `;
  }

  html += `</div>`;
  document.getElementById("content").innerHTML = html;
}

// === OPEN COURSE & LESSONS ===
async function openCourse(courseId) {
  const courseSnap = await getDoc(doc(db, "courses", courseId));
  if (!courseSnap.exists()) return alert("Course not found");
  const c = courseSnap.data();

  let html = `<h2>${c.title}</h2>`;
  c.chapters.forEach((ch, idx) => {
    html += `
      <div class="chapter">
        <h3>${ch.header}</h3>
        <p>${ch.content}</p>
        ${
          ch.video
            ? `<video controls width="100%"><source src="${ch.video}" type="video/mp4"></video>`
            : ""
        }
        ${
          ch.audio
            ? `<audio controls><source src="${ch.audio}" type="audio/mpeg"></audio>`
            : ""
        }
        <button onclick="markChapterComplete('${courseId}', ${idx})">✔️ Mark Complete</button>
        <button onclick="bookmarkChapter('${courseId}', ${idx})">🔖 Bookmark</button>
      </div>
    `;
  });

  document.getElementById("content").innerHTML = html;
}

// === UPDATE PROGRESS ===
async function markChapterComplete(courseId, chapterIdx) {
  const ref = doc(db, "enrollments", `${currentUser.uid}_${courseId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  let data = snap.data();
  let progress = Math.min(100, ((chapterIdx + 1) / snap.data().totalChapters) * 100);

  await updateDoc(ref, { progress });
  alert("Progress updated!");
  loadMyLearning();
}

// === BOOKMARK ===
async function bookmarkChapter(courseId, chapterIdx) {
  const ref = doc(db, "enrollments", `${currentUser.uid}_${courseId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  let bookmarks = snap.data().bookmarks || [];
  if (!bookmarks.includes(chapterIdx)) bookmarks.push(chapterIdx);

  await updateDoc(ref, { bookmarks });
  alert("Chapter bookmarked!");
}

// (Part I – Announcements, Course Chat, Finals)
// === ANNOUNCEMENTS ===
async function loadAnnouncements() {
  const snap = await getDocs(collection(db, "announcements"));
  let html = `<h2>Announcements</h2><div class="card-grid">`;

  snap.forEach((docSnap) => {
    const a = docSnap.data();
    html += `
      <div class="card">
        <div class="card-body">
          <h3>${a.title}</h3>
          <p>${a.message}</p>
          <small>${new Date(a.createdAt?.seconds * 1000).toLocaleString()}</small>
          ${isAdmin() ? `
            <button onclick="editAnnouncement('${docSnap.id}')">✏️ Edit</button>
            <button onclick="deleteAnnouncement('${docSnap.id}')">🗑️ Delete</button>
          ` : ""}
        </div>
      </div>`;
  });

  if (isAdmin()) {
    html += `<button onclick="newAnnouncement()">➕ New Announcement</button>`;
  }

  html += `</div>`;
  document.getElementById("content").innerHTML = html;
}

async function newAnnouncement() {
  const title = prompt("Announcement title:");
  const message = prompt("Message:");
  if (!title || !message) return;
  await addDoc(collection(db, "announcements"), {
    title, message, createdAt: new Date()
  });
  loadAnnouncements();
}

async function editAnnouncement(id) {
  const ref = doc(db, "announcements", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const a = snap.data();
  const title = prompt("Edit title:", a.title);
  const message = prompt("Edit message:", a.message);
  if (!title || !message) return;
  await updateDoc(ref, { title, message });
  loadAnnouncements();
}

async function deleteAnnouncement(id) {
  if (!confirm("Delete this announcement?")) return;
  await deleteDoc(doc(db, "announcements", id));
  loadAnnouncements();
}

// === COURSE CHAT ===
async function loadCourseChat(courseId) {
  const snap = await getDocs(query(collection(db, "messages"), where("courseId", "==", courseId)));
  let html = `<h2>Course Chat</h2><div class="chat-box">`;

  snap.forEach((docSnap) => {
    const m = docSnap.data();
    html += `
      <div class="chat-msg">
        <b>${m.userName || "Anon"}:</b> ${m.text}
        ${isAdmin() ? `
          <button onclick="editChat('${docSnap.id}')">✏️</button>
          <button onclick="deleteChat('${docSnap.id}')">🗑️</button>
        ` : ""}
      </div>`;
  });

  html += `
    <div class="chat-input">
      <input id="chatText" placeholder="Type a message..." />
      <button onclick="sendChat('${courseId}')">Send</button>
    </div>
  </div>`;

  document.getElementById("content").innerHTML = html;
}

async function sendChat(courseId) {
  const text = document.getElementById("chatText").value;
  if (!text) return;
  await addDoc(collection(db, "messages"), {
    uid: currentUser.uid,
    userName: currentUser.email,
    courseId,
    text,
    createdAt: new Date()
  });
  loadCourseChat(courseId);
}

async function editChat(id) {
  const ref = doc(db, "messages", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const m = snap.data();
  const text = prompt("Edit message:", m.text);
  if (!text) return;
  await updateDoc(ref, { text });
  loadCourseChat(m.courseId);
}

async function deleteChat(id) {
  if (!confirm("Delete this chat message?")) return;
  const ref = doc(db, "messages", id);
  const snap = await getDoc(ref);
  const courseId = snap.data().courseId;
  await deleteDoc(ref);
  loadCourseChat(courseId);
}

// === FINALS (Exam-like feature) ===
async function loadFinals() {
  const snap = await getDocs(collection(db, "finals"));
  let html = `<h2>Final Exams</h2><div class="card-grid">`;

  snap.forEach((docSnap) => {
    const f = docSnap.data();
    html += `
      <div class="card">
        <div class="card-body">
          <h3>${f.title}</h3>
          <p>${f.description}</p>
          ${isAdmin() ? `
            <button onclick="editFinal('${docSnap.id}')">✏️ Edit</button>
            <button onclick="deleteFinal('${docSnap.id}')">🗑️ Delete</button>
          ` : `<button onclick="takeFinal('${docSnap.id}')">Take Exam</button>`}
        </div>
      </div>`;
  });

  if (isAdmin()) {
    html += `<button onclick="newFinal()">➕ New Final</button>`;
  }

  html += `</div>`;
  document.getElementById("content").innerHTML = html;
}

async function newFinal() {
  const title = prompt("Final exam title:");
  const description = prompt("Description:");
  if (!title || !description) return;
  await addDoc(collection(db, "finals"), {
    title, description, createdAt: new Date()
  });
  loadFinals();
}

async function editFinal(id) {
  const ref = doc(db, "finals", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const f = snap.data();
  const title = prompt("Edit title:", f.title);
  const description = prompt("Edit description:", f.description);
  if (!title || !description) return;
  await updateDoc(ref, { title, description });
  loadFinals();
}

async function deleteFinal(id) {
  if (!confirm("Delete this final?")) return;
  await deleteDoc(doc(db, "finals", id));
  loadFinals();
}

async function takeFinal(id) {
  alert(`This will start the exam: ${id}. (Exam logic can be added here)`);
}

// (Part J – Certificates + Transcript)
// === CERTIFICATES (Landscape) ===
async function loadCertificates() {
  const snap = await getDocs(collection(db, "certificates"));
  let html = `<h2>Certificates</h2><div class="card-grid">`;

  snap.forEach((docSnap) => {
    const c = docSnap.data();
    html += `
      <div class="card">
        <div class="card-body">
          <h3>${c.courseTitle}</h3>
          <p>Awarded to: <b>${c.studentName}</b></p>
          <p>Date: ${new Date(c.date?.seconds * 1000).toLocaleDateString()}</p>
          <button onclick="downloadCertificate('${docSnap.id}')">📜 Download</button>
          ${isAdmin() ? `<button onclick="deleteCertificate('${docSnap.id}')">🗑️ Delete</button>` : ""}
        </div>
      </div>`;
  });

  if (isAdmin()) {
    html += `<button onclick="newCertificate()">➕ Issue Certificate</button>`;
  }

  html += `</div>`;
  document.getElementById("content").innerHTML = html;
}

async function newCertificate() {
  const studentName = prompt("Student name:");
  const courseTitle = prompt("Course title:");
  if (!studentName || !courseTitle) return;
  await addDoc(collection(db, "certificates"), {
    studentName, courseTitle, date: new Date()
  });
  loadCertificates();
}

async function deleteCertificate(id) {
  if (!confirm("Delete this certificate?")) return;
  await deleteDoc(doc(db, "certificates", id));
  loadCertificates();
}

async function downloadCertificate(id) {
  const { jsPDF } = window.jspdf;
  const ref = doc(db, "certificates", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const c = snap.data();

  const docPDF = new jsPDF("landscape");
  docPDF.setFontSize(24);
  docPDF.text("Certificate of Completion", 105, 40, { align: "center" });

  docPDF.setFontSize(16);
  docPDF.text(`This certifies that`, 105, 60, { align: "center" });
  docPDF.setFontSize(20);
  docPDF.text(c.studentName, 105, 80, { align: "center" });
  docPDF.setFontSize(16);
  docPDF.text(`has successfully completed the course`, 105, 100, { align: "center" });
  docPDF.setFontSize(20);
  docPDF.text(c.courseTitle, 105, 120, { align: "center" });

  docPDF.setFontSize(12);
  docPDF.text(`Date: ${new Date(c.date.seconds * 1000).toLocaleDateString()}`, 20, 150);

  docPDF.save(`Certificate-${c.studentName}.pdf`);
}

// === TRANSCRIPTS (Portrait) ===
async function loadTranscripts() {
  const snap = await getDocs(collection(db, "transcripts"));
  let html = `<h2>Transcripts</h2><div class="card-grid">`;

  snap.forEach((docSnap) => {
    const t = docSnap.data();
    html += `
      <div class="card">
        <div class="card-body">
          <h3>${t.studentName}</h3>
          <p>Credits: ${t.credits}</p>
          <p>GPA: ${t.gpa}</p>
          <button onclick="downloadTranscript('${docSnap.id}')">📄 Download</button>
          ${isAdmin() ? `<button onclick="deleteTranscript('${docSnap.id}')">🗑️ Delete</button>` : ""}
        </div>
      </div>`;
  });

  if (isAdmin()) {
    html += `<button onclick="newTranscript()">➕ Add Transcript</button>`;
  }

  html += `</div>`;
  document.getElementById("content").innerHTML = html;
}

async function newTranscript() {
  const studentName = prompt("Student name:");
  const credits = prompt("Credits earned:");
  const gpa = prompt("GPA:");
  if (!studentName || !credits || !gpa) return;
  await addDoc(collection(db, "transcripts"), {
    studentName, credits, gpa, date: new Date()
  });
  loadTranscripts();
}

async function deleteTranscript(id) {
  if (!confirm("Delete this transcript?")) return;
  await deleteDoc(doc(db, "transcripts", id));
  loadTranscripts();
}

async function downloadTranscript(id) {
  const { jsPDF } = window.jspdf;
  const ref = doc(db, "transcripts", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const t = snap.data();

  const docPDF = new jsPDF("portrait");
  docPDF.setFontSize(20);
  docPDF.text("Official Transcript", 105, 30, { align: "center" });

  docPDF.setFontSize(14);
  docPDF.text(`Student: ${t.studentName}`, 20, 60);
  docPDF.text(`Credits: ${t.credits}`, 20, 80);
  docPDF.text(`GPA: ${t.gpa}`, 20, 100);

  docPDF.setFontSize(12);
  docPDF.text(`Issued: ${new Date(t.date.seconds * 1000).toLocaleDateString()}`, 20, 130);

  docPDF.save(`Transcript-${t.studentName}.pdf`);
}

// (Part K – Lesson Progress & Bookmarks)
// === LESSON PROGRESS + BOOKMARKS ===
async function loadLesson(courseId, lessonId) {
  const lessonRef = doc(db, "courses", courseId, "lessons", lessonId);
  const lessonSnap = await getDoc(lessonRef);
  if (!lessonSnap.exists()) {
    document.getElementById("content").innerHTML = `<p>Lesson not found.</p>`;
    return;
  }

  const lesson = lessonSnap.data();
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  // Load user's progress/bookmark
  const progressRef = doc(db, "users", userId, "progress", lessonId);
  const progressSnap = await getDoc(progressRef);
  let progressData = progressSnap.exists() ? progressSnap.data() : { completed: false, bookmarked: false };

  // Render lesson with progress and bookmark controls
  let html = `
    <div class="lesson-card">
      <h2>${lesson.title}</h2>
      <h4>${lesson.subtitle || ""}</h4>
      <p>${lesson.content || ""}</p>
      ${lesson.img ? `<img src="${lesson.img}" alt="Lesson image" class="lesson-img">` : ""}
      ${lesson.audio ? `<audio controls src="${lesson.audio}"></audio>` : ""}
      ${lesson.video ? `<video controls width="100%" src="${lesson.video}"></video>` : ""}
      
      <div class="lesson-controls">
        <button onclick="toggleBookmark('${courseId}','${lessonId}')">
          ${progressData.bookmarked ? "🔖 Remove Bookmark" : "🔖 Add Bookmark"}
        </button>
        <button onclick="markCompleted('${courseId}','${lessonId}')"
          ${progressData.completed ? "disabled" : ""}>
          ✅ Mark as Completed
        </button>
      </div>
      <div class="progress-bar">
        <div id="progress-fill-${lessonId}" class="progress-fill" style="width:${progressData.completed ? '100' : '0'}%"></div>
      </div>
    </div>
  `;
  document.getElementById("content").innerHTML = html;
}

async function toggleBookmark(courseId, lessonId) {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  const ref = doc(db, "users", userId, "progress", lessonId);
  const snap = await getDoc(ref);
  const current = snap.exists() ? snap.data().bookmarked : false;
  await setDoc(ref, { bookmarked: !current }, { merge: true });
  loadLesson(courseId, lessonId);
}

async function markCompleted(courseId, lessonId) {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  const ref = doc(db, "users", userId, "progress", lessonId);
  await setDoc(ref, { completed: true }, { merge: true });

  // Update course-level progress %
  const lessonsSnap = await getDocs(collection(db, "courses", courseId, "lessons"));
  const totalLessons = lessonsSnap.size;
  const completedSnap = await getDocs(query(collection(db, "users", userId, "progress"), where("completed", "==", true)));
  const completedCount = completedSnap.size;

  const percent = Math.round((completedCount / totalLessons) * 100);
  await setDoc(doc(db, "users", userId, "courseProgress", courseId), { percent }, { merge: true });

  document.getElementById(`progress-fill-${lessonId}`).style.width = "100%";
}

// (Part L – Course Dashboard)
// === COURSE DASHBOARD VIEW ===
async function loadCourseDashboard(courseId) {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  const courseRef = doc(db, "courses", courseId);
  const courseSnap = await getDoc(courseRef);
  if (!courseSnap.exists()) {
    document.getElementById("content").innerHTML = `<p>Course not found.</p>`;
    return;
  }
  const course = courseSnap.data();

  // Load overall progress
  const progressRef = doc(db, "users", userId, "courseProgress", courseId);
  const progressSnap = await getDoc(progressRef);
  const percent = progressSnap.exists() ? progressSnap.data().percent : 0;

  // Load bookmarks
  const progressColl = collection(db, "users", userId, "progress");
  const bookmarksSnap = await getDocs(query(progressColl, where("bookmarked", "==", true)));
  const bookmarks = [];
  bookmarksSnap.forEach(docSnap => bookmarks.push(docSnap.id));

  // Render dashboard
  let html = `
    <div class="dashboard-card">
      <h2>${course.title}</h2>
      <p>${course.description || ""}</p>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${percent}%"></div>
      </div>
      <p><strong>${percent}% completed</strong></p>

      <h3>Bookmarked Lessons</h3>
      <ul>
        ${bookmarks.length === 0 ? "<li>No bookmarks yet</li>" :
          bookmarks.map(b => `<li><button onclick="loadLesson('${courseId}','${b}')">📖 ${b}</button></li>`).join("")}
      </ul>

      <button onclick="viewAllLessons('${courseId}')">📚 View All Lessons</button>
    </div>
  `;
  document.getElementById("content").innerHTML = html;
}

async function viewAllLessons(courseId) {
  const lessonsSnap = await getDocs(collection(db, "courses", courseId, "lessons"));
  let html = `<div class="lesson-list"><h2>All Lessons</h2><ul>`;
  lessonsSnap.forEach(lesson => {
    const data = lesson.data();
    html += `
      <li>
        <button onclick="loadLesson('${courseId}','${lesson.id}')">
          ${data.title || lesson.id}
        </button>
      </li>`;
  });
  html += `</ul></div>`;
  document.getElementById("content").innerHTML = html;
}

// (Part M – Admin Dashboard)
// === ADMIN DASHBOARD ===
async function loadAdminDashboard() {
  const user = auth.currentUser;
  if (!user) return;
  const roleRef = doc(db, "roles", user.uid);
  const roleSnap = await getDoc(roleRef);
  if (!roleSnap.exists() || roleSnap.data().role !== "admin") {
    document.getElementById("content").innerHTML = "<p>Admin only.</p>";
    return;
  }

  let html = `
    <div class="admin-dashboard">
      <h2>Admin Tools</h2>
      <p>Manage courses, announcements, finals, chat, and tasks.</p>

      <section>
        <h3>📢 Announcements</h3>
        <div id="admin-announcements"></div>
        <button onclick="openAnnouncementModal()">+ Add Announcement</button>
      </section>

      <section>
        <h3>💬 Course Chat</h3>
        <div id="admin-chat"></div>
      </section>

      <section>
        <h3>📝 Finals</h3>
        <div id="admin-finals"></div>
        <button onclick="openFinalModal()">+ Add Final</button>
      </section>

      <section>
        <h3>✅ Tasks</h3>
        <div id="admin-tasks"></div>
        <button onclick="openTaskModal()">+ Add Task</button>
      </section>
    </div>
  `;
  document.getElementById("content").innerHTML = html;

  renderAdminAnnouncements();
  renderAdminChat();
  renderAdminFinals();
  renderAdminTasks();
}

// --- Render Announcements with Edit/Delete ---
async function renderAdminAnnouncements() {
  const snap = await getDocs(collection(db, "announcements"));
  let html = "<ul>";
  snap.forEach(docSnap => {
    const a = docSnap.data();
    html += `
      <li>
        <b>${a.title}</b> – ${a.content}
        <button onclick="editAnnouncement('${docSnap.id}')">✏</button>
        <button onclick="deleteDoc(doc(db,'announcements','${docSnap.id}'))">🗑</button>
      </li>
    `;
  });
  html += "</ul>";
  document.getElementById("admin-announcements").innerHTML = html;
}

// --- Render Course Chat with Edit/Delete ---
async function renderAdminChat() {
  const snap = await getDocs(collection(db, "messages"));
  let html = "<ul>";
  snap.forEach(docSnap => {
    const m = docSnap.data();
    html += `
      <li>
        ${m.text}
        <button onclick="editChat('${docSnap.id}')">✏</button>
        <button onclick="deleteDoc(doc(db,'messages','${docSnap.id}'))">🗑</button>
      </li>
    `;
  });
  html += "</ul>";
  document.getElementById("admin-chat").innerHTML = html;
}

// --- Render Finals with Edit/Delete ---
async function renderAdminFinals() {
  const snap = await getDocs(collection(db, "finals"));
  let html = "<ul>";
  snap.forEach(docSnap => {
    const f = docSnap.data();
    html += `
      <li>
        <b>${f.title}</b>
        <button onclick="editFinal('${docSnap.id}')">✏</button>
        <button onclick="deleteDoc(doc(db,'finals','${docSnap.id}'))">🗑</button>
      </li>
    `;
  });
  html += "</ul>";
  document.getElementById("admin-finals").innerHTML = html;
}

// --- Render Tasks with Edit/Delete ---
async function renderAdminTasks() {
  const snap = await getDocs(collection(db, "tasks"));
  let html = "<ul>";
  snap.forEach(docSnap => {
    const t = docSnap.data();
    html += `
      <li>
        ${t.title} (${t.status})
        <button onclick="editTask('${docSnap.id}')">✏</button>
        <button onclick="deleteDoc(doc(db,'tasks','${docSnap.id}'))">🗑</button>
      </li>
    `;
  });
  html += "</ul>";
  document.getElementById("admin-tasks").innerHTML = html;
}

// (Part N – Edit Modals)
// === UNIVERSAL MODAL HANDLER ===
function openModal(title, fields, saveCallback) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-card">
      <h2>${title}</h2>
      <form id="modal-form">
        ${fields}
        <div class="modal-actions">
          <button type="submit">Save</button>
          <button type="button" id="cancelBtn">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("cancelBtn").onclick = () => modal.remove();
  document.getElementById("modal-form").onsubmit = async e => {
    e.preventDefault();
    await saveCallback(new FormData(e.target));
    modal.remove();
  };
}

// === EDIT ANNOUNCEMENT ===
async function editAnnouncement(id) {
  const ref = doc(db, "announcements", id);
  const snap = await getDoc(ref);
  const a = snap.data();

  openModal("Edit Announcement", `
    <label>Title<input name="title" value="${a.title}" required></label>
    <label>Content<textarea name="content">${a.content}</textarea></label>
  `, async data => {
    await updateDoc(ref, {
      title: data.get("title"),
      content: data.get("content")
    });
    renderAdminAnnouncements();
  });
}

// === EDIT CHAT MESSAGE ===
async function editChat(id) {
  const ref = doc(db, "messages", id);
  const snap = await getDoc(ref);
  const m = snap.data();

  openModal("Edit Chat Message", `
    <label>Message<textarea name="text">${m.text}</textarea></label>
  `, async data => {
    await updateDoc(ref, { text: data.get("text") });
    renderAdminChat();
  });
}

// === EDIT FINAL ===
async function editFinal(id) {
  const ref = doc(db, "finals", id);
  const snap = await getDoc(ref);
  const f = snap.data();

  openModal("Edit Final", `
    <label>Title<input name="title" value="${f.title}" required></label>
    <label>Description<textarea name="desc">${f.desc || ""}</textarea></label>
  `, async data => {
    await updateDoc(ref, {
      title: data.get("title"),
      desc: data.get("desc")
    });
    renderAdminFinals();
  });
}

// === EDIT TASK ===
async function editTask(id) {
  const ref = doc(db, "tasks", id);
  const snap = await getDoc(ref);
  const t = snap.data();

  openModal("Edit Task", `
    <label>Title<input name="title" value="${t.title}" required></label>
    <label>Status
      <select name="status">
        <option ${t.status==="todo"?"selected":""}>todo</option>
        <option ${t.status==="inprogress"?"selected":""}>inprogress</option>
        <option ${t.status==="done"?"selected":""}>done</option>
      </select>
    </label>
  `, async data => {
    await updateDoc(ref, {
      title: data.get("title"),
      status: data.get("status")
    });
    renderAdminTasks();
  });
}

// (Part O – Drag & Drop Tasks)
// === TASKS KANBAN DRAG & DROP ===
function setupTaskDragAndDrop() {
  document.querySelectorAll(".task-card").forEach(card => {
    card.draggable = true;

    card.ondragstart = e => {
      e.dataTransfer.setData("taskId", card.dataset.id);
    };
  });

  document.querySelectorAll(".kanban-column").forEach(col => {
    col.ondragover = e => e.preventDefault();

    col.ondrop = async e => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData("taskId");
      const newStatus = col.dataset.status;

      if (!taskId || !newStatus) return;

      try {
        await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
        renderAdminTasks(); // refresh UI
      } catch (err) {
        console.error("Failed to update task:", err);
        alert("Error moving task: " + err.message);
      }
    };
  });
}

// Hook after rendering tasks
async function renderAdminTasks() {
  const container = document.getElementById("adminTasks");
  container.innerHTML = `
    <div class="kanban">
      <div class="kanban-column" data-status="todo"><h3>To Do</h3></div>
      <div class="kanban-column" data-status="inprogress"><h3>In Progress</h3></div>
      <div class="kanban-column" data-status="done"><h3>Done</h3></div>
    </div>
  `;

  const q = query(collection(db, "tasks"), orderBy("title"));
  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const t = docSnap.data();
    const card = document.createElement("div");
    card.className = "task-card";
    card.dataset.id = docSnap.id;
    card.innerHTML = `
      <strong>${t.title}</strong>
      <div class="actions">
        <button onclick="editTask('${docSnap.id}')">✏</button>
        <button onclick="deleteTask('${docSnap.id}')">🗑</button>
      </div>
    `;

    const col = container.querySelector(`.kanban-column[data-status="${t.status || "todo"}"]`);
    col.appendChild(card);
  });

  setupTaskDragAndDrop();
}

// (Part P – Profile Fixes)
// === PROFILE ===
async function loadProfile() {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;

  try {
    const docRef = doc(db, "profiles", uid);
    const snap = await getDoc(docRef);
    let data = snap.exists() ? snap.data() : {};

    // Prefill form
    document.getElementById("profileName").value = data.name || "";
    document.getElementById("profileEmail").value = data.email || auth.currentUser.email;
    document.getElementById("profileAvatar").src = data.avatarUrl || "/img/default-avatar.png";
    document.getElementById("profileSignature").src = data.signatureUrl || "";

  } catch (err) {
    console.error("Error loading profile:", err);
  }
}

async function saveProfile() {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;

  try {
    const name = document.getElementById("profileName").value;
    const email = document.getElementById("profileEmail").value;
    const avatarUrl = document.getElementById("profileAvatar").src;
    const signatureUrl = document.getElementById("profileSignature").src;

    await setDoc(doc(db, "profiles", uid), {
      name,
      email,
      avatarUrl,
      signatureUrl,
      updatedAt: Date.now()
    }, { merge: true });

    alert("Profile saved successfully ✅");
    loadProfile();
  } catch (err) {
    console.error("Error saving profile:", err);
    alert("Error saving profile: " + err.message);
  }
}

// Upload avatar
document.getElementById("uploadAvatar").addEventListener("change", async e => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const file = e.target.files[0];
  if (!file) return;

  try {
    const refPath = ref(storage, `avatars/${uid}`);
    await uploadBytes(refPath, file);
    const url = await getDownloadURL(refPath);

    document.getElementById("profileAvatar").src = url;
  } catch (err) {
    console.error("Error uploading avatar:", err);
  }
});

// Upload signature
document.getElementById("uploadSignature").addEventListener("change", async e => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const file = e.target.files[0];
  if (!file) return;

  try {
    const refPath = ref(storage, `signatures/${uid}`);
    await uploadBytes(refPath, file);
    const url = await getDownloadURL(refPath);

    document.getElementById("profileSignature").src = url;
  } catch (err) {
    console.error("Error uploading signature:", err);
  }
});

// View Card
async function viewProfileCard() {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;

  try {
    const snap = await getDoc(doc(db, "profiles", uid));
    if (!snap.exists()) {
      alert("Profile not found");
      return;
    }

    const p = snap.data();
    const modal = document.getElementById("profileCardModal");
    modal.innerHTML = `
      <div class="profile-card">
        <img src="${p.avatarUrl || "/img/default-avatar.png"}" class="avatar">
        <h3>${p.name || "Unnamed"}</h3>
        <p>${p.email || ""}</p>
        ${p.signatureUrl ? `<img src="${p.signatureUrl}" class="signature">` : ""}
      </div>
      <button onclick="closeProfileCard()">Close</button>
    `;
    modal.style.display = "block";
  } catch (err) {
    console.error("Error loading profile card:", err);
  }
}

function closeProfileCard() {
  document.getElementById("profileCardModal").style.display = "none";
}

// (Part Q – Certificates & Transcripts)
// === SCORES & CREDITS TRACKING ===
// Save user progress (scores, credits) in Firestore under /progress/{uid}/courses/{courseId}
async function saveProgress(courseId, data) {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;

  await setDoc(doc(db, "progress", uid, "courses", courseId), {
    ...data,
    updatedAt: Date.now()
  }, { merge: true });
}

async function getProgress(courseId) {
  if (!auth.currentUser) return {};
  const uid = auth.currentUser.uid;

  const snap = await getDoc(doc(db, "progress", uid, "courses", courseId));
  return snap.exists() ? snap.data() : {};
}

// === CERTIFICATE (Landscape PDF) ===
async function downloadCertificate(courseId) {
  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF({ orientation: "landscape" });

  const user = auth.currentUser;
  const courseSnap = await getDoc(doc(db, "courses", courseId));
  const course = courseSnap.data();

  docPdf.setFontSize(28);
  docPdf.text("Certificate of Completion", 148, 60, { align: "center" });

  docPdf.setFontSize(18);
  docPdf.text(`This certifies that`, 148, 90, { align: "center" });
  docPdf.text(user.displayName || user.email, 148, 110, { align: "center" });

  docPdf.setFontSize(16);
  docPdf.text(`has successfully completed the course:`, 148, 135, { align: "center" });
  docPdf.text(course.title || "Untitled Course", 148, 155, { align: "center" });

  docPdf.setFontSize(12);
  docPdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 190);
  docPdf.text("LearnHub", 260, 190);

  docPdf.save("certificate.pdf");
}

// === TRANSCRIPT (Portrait PDF) ===
async function downloadTranscript() {
  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF();

  const user = auth.currentUser;
  const snap = await getDocs(collection(db, "progress", user.uid, "courses"));

  docPdf.setFontSize(22);
  docPdf.text("Academic Transcript", 105, 30, { align: "center" });

  docPdf.setFontSize(14);
  docPdf.text(`Name: ${user.displayName || user.email}`, 20, 50);

  let y = 70;
  for (let s of snap.docs) {
    const p = s.data();
    docPdf.text(`${p.courseTitle || s.id} - Score: ${p.score || 0} / Credits: ${p.credits || 0}`, 20, y);
    y += 10;
  }

  docPdf.save("transcript.pdf");
}

// (Part R – Progress & Bookmarks)
// === LESSON PROGRESS & BOOKMARKS ===

// Save lesson progress (completed chapters, current position, bookmarks)
async function saveLessonProgress(courseId, lessonId, data) {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;

  await setDoc(doc(db, "progress", uid, "courses", courseId, "lessons", lessonId), {
    ...data,
    updatedAt: Date.now()
  }, { merge: true });
}

// Get lesson progress
async function getLessonProgress(courseId, lessonId) {
  if (!auth.currentUser) return {};
  const uid = auth.currentUser.uid;

  const snap = await getDoc(doc(db, "progress", uid, "courses", courseId, "lessons", lessonId));
  return snap.exists() ? snap.data() : {};
}

// Mark lesson as completed
async function markLessonCompleted(courseId, lessonId, totalLessons) {
  const progress = await getProgress(courseId);
  const completed = (progress.completed || []);
  if (!completed.includes(lessonId)) completed.push(lessonId);

  const percent = Math.round((completed.length / totalLessons) * 100);

  await saveProgress(courseId, {
    courseTitle: progress.courseTitle || "",
    completed,
    percent,
    credits: progress.credits || 0,
    score: progress.score || 0
  });
}

// Bookmark position (e.g., scroll offset or media time)
async function saveBookmark(courseId, lessonId, position) {
  await saveLessonProgress(courseId, lessonId, { bookmark: position });
}

// (Course Player Auto-Progress)
// === AUTO PROGRESS TRACKING ===

let progressSaveTimeout = null;

// Attach listeners to a text lesson
function attachTextLessonTracking(courseId, lessonId, totalLessons) {
  window.addEventListener("scroll", () => {
    if (progressSaveTimeout) clearTimeout(progressSaveTimeout);
    progressSaveTimeout = setTimeout(() => {
      saveBookmark(courseId, lessonId, window.scrollY);
      if (window.scrollY + window.innerHeight >= document.body.scrollHeight - 50) {
        // reached bottom → mark as complete
        markLessonCompleted(courseId, lessonId, totalLessons);
      }
    }, 1000);
  });
}

// Attach listeners to video/audio lessons
function attachMediaLessonTracking(courseId, lessonId, totalLessons, mediaEl) {
  if (!mediaEl) return;

  mediaEl.addEventListener("timeupdate", () => {
    if (progressSaveTimeout) clearTimeout(progressSaveTimeout);
    progressSaveTimeout = setTimeout(() => {
      saveBookmark(courseId, lessonId, mediaEl.currentTime);
      if (mediaEl.currentTime / mediaEl.duration > 0.9) {
        markLessonCompleted(courseId, lessonId, totalLessons);
      }
    }, 2000);
  });
}

// Restore bookmark when lesson opens
async function restoreLessonBookmark(courseId, lessonId, mediaEl) {
  const progress = await getLessonProgress(courseId, lessonId);

  // Scroll for text lessons
  if (progress.bookmark && typeof progress.bookmark === "number" && !mediaEl) {
    window.scrollTo({ top: progress.bookmark, behavior: "smooth" });
  }

  // Resume media
  if (progress.bookmark && mediaEl) {
    mediaEl.currentTime = progress.bookmark;
  }

  // Update progress bar
  if (progress.percent) {
    document.querySelector("#progress-bar").style.width = progress.percent + "%";
  }
}

// (Course Progress Extension)
// === COURSE-WIDE PROGRESS ===

// Calculate overall progress by summing completed lessons
async function updateCourseProgress(courseId, totalLessons) {
  const user = auth.currentUser;
  if (!user) return;

  const userProgressRef = doc(db, "progress", `${user.uid}_${courseId}`);
  const snap = await getDoc(userProgressRef);

  if (!snap.exists()) return;

  const data = snap.data();
  const completed = Object.values(data.lessons || {}).filter(l => l.completed).length;
  const percent = Math.round((completed / totalLessons) * 100);

  // Save course-wide progress
  await setDoc(userProgressRef, { overall: percent }, { merge: true });

  // Update UI
  const overallEl = document.querySelector("#course-progress-bar");
  if (overallEl) {
    overallEl.style.width = percent + "%";
    overallEl.innerText = percent + "% Complete";
  }
}

// Hook into lesson completion
async function markLessonCompleted(courseId, lessonId, totalLessons) {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "progress", `${user.uid}_${courseId}`);
  await setDoc(ref, {
    lessons: {
      [lessonId]: { completed: true, timestamp: Date.now(), percent: 100 }
    }
  }, { merge: true });

  updateCourseProgress(courseId, totalLessons);
}

// (Enhance Dashboard Rendering)
// === MY LEARNING DASHBOARD PROGRESS ===
async function renderMyLearning() {
  const user = auth.currentUser;
  if (!user) return;

  const container = document.getElementById("my-learning-container");
  container.innerHTML = "";

  // Fetch all enrollments for this user
  const q = query(collection(db, "enrollments"), where("uid", "==", user.uid));
  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    const enrollment = docSnap.data();
    const courseId = enrollment.courseId;

    // Get course details
    const courseRef = doc(db, "courses", courseId);
    const courseSnap = await getDoc(courseRef);
    if (!courseSnap.exists()) continue;

    const course = courseSnap.data();

    // Get progress (overall %)
    const progressRef = doc(db, "progress", `${user.uid}_${courseId}`);
    const progressSnap = await getDoc(progressRef);
    const overall = progressSnap.exists() ? progressSnap.data().overall || 0 : 0;

    // Render card with progress bar
    container.innerHTML += `
      <div class="course-card">
        <img src="${course.image || 'https://via.placeholder.com/300x150'}" alt="${course.title}" />
        <h3>${course.title}</h3>
        <p>${course.description || ""}</p>
        <div class="overall-progress-container small">
          <div class="overall-progress-bar" style="width:${overall}%">${overall}% Complete</div>
        </div>
      </div>
    `;
  }
}

// (Add Progress Table)
// === ADMIN PROGRESS DASHBOARD ===
async function renderAdminProgress() {
  const container = document.getElementById("admin-progress-container");
  container.innerHTML = "<h2>Student Progress Overview</h2>";

  try {
    // Get all enrollments
    const enrollmentsSnap = await getDocs(collection(db, "enrollments"));
    let tableHtml = `
      <table class="admin-progress-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Course</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const enrollDoc of enrollmentsSnap.docs) {
      const enrollment = enrollDoc.data();

      // Get student info
      const profileSnap = await getDoc(doc(db, "profiles", enrollment.uid));
      const studentName = profileSnap.exists() ? profileSnap.data().name : enrollment.uid;

      // Get course info
      const courseSnap = await getDoc(doc(db, "courses", enrollment.courseId));
      if (!courseSnap.exists()) continue;
      const course = courseSnap.data();

      // Get progress
      const progressRef = doc(db, "progress", `${enrollment.uid}_${enrollment.courseId}`);
      const progressSnap = await getDoc(progressRef);
      const overall = progressSnap.exists() ? progressSnap.data().overall || 0 : 0;

      tableHtml += `
        <tr>
          <td>${studentName}</td>
          <td>${course.title}</td>
          <td>
            <div class="overall-progress-container small">
              <div class="overall-progress-bar" style="width:${overall}%">${overall}%</div>
            </div>
          </td>
        </tr>
      `;
    }

    tableHtml += "</tbody></table>";
    container.innerHTML += tableHtml;
  } catch (err) {
    console.error("Error rendering admin progress:", err);
    container.innerHTML = "<p class='error'>Failed to load progress data.</p>";
  }
  if (isAdmin) {
  renderAdminProgress();
}
}