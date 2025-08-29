import { notify } from "../core/util.js";
export async function seedDemoAll({auth, db}){
  const uid = auth.currentUser?.uid;
  const email = auth.currentUser?.email || "demo@example.com";
  if(!uid){ notify("Sign in first", "warn"); return; }

  const now = firebase.firestore.FieldValue.serverTimestamp();
  // Announcements
  const anns = [
    {title:"Welcome to LearnHub!", body:"Explore courses, take finals, and chat with peers.", createdAt: now},
    {title:"New Features", body:"Short-answer finals, landscape certificates, rich guide page.", createdAt: now},
  ];
  for(const a of anns){ await db.collection("announcements").add({...a, uid}); }

  // Courses
  const courses = [
    {
      title:"Web Dev 101 (Free)",
      category:"Web",
      credits:3, price:0,
      short:"HTML/CSS/JS fundamentals, audio & video embeds, outline + lesson quizzes.",
      goals:["HTML tags","CSS basics","JavaScript essentials"],
      coverImage:"/icons/learnhub-cap.svg",
      outlineUrl:"/data/outlines/web-101.json",
      quizzesUrl:"/data/lesson-quizzes/web-101.json"
    },
    {
      title:"Data Analysis with JS (Paid)",
      category:"Data",
      credits:4, price:49,
      short:"Load CSV/JSON, compute stats, visualize charts — and pass the final.",
      goals:["Parsing data","Basic stats","Charts"],
      coverImage:"/icons/learnhub-cap.svg",
      outlineUrl:"/data/outlines/data-101.json",
      quizzesUrl:"/data/lesson-quizzes/data-101.json"
    }
  ];
  const courseIds = [];
  for(const c of courses){
    const ref = await db.collection("courses").add({ ...c, ownerUid: uid, ownerEmail: email, participants:[uid], createdAt: now });
    courseIds.push({id: ref.id, title: c.title});
  }

  // Finals
  const finals = [
    {
      title:"Web 101 Final",
      isFinal:true,
      courseId: courseIds[0]?.id || "",
      courseTitle: courseIds[0]?.title || "Web Dev 101",
      passScore: 70,
      items: [
        {type:"mcq", q:"Which tag makes a hyperlink?", choices:["<div>","<a>","<span>"], answer:1, feedbackOk:"Correct", feedbackNo:"<a> is the anchor tag."},
        {type:"short", q:"Which CSS property sets text color?", answers:["color"], feedbackOk:"Yep", feedbackNo:"Try: color"}
      ]
    },
    {
      title:"Data 101 Final",
      isFinal:true,
      courseId: courseIds[1]?.id || "",
      courseTitle: courseIds[1]?.title || "Data Analysis with JS",
      passScore: 70,
      items: [
        {type:"mcq", q:"Mean of [2,4,6]?", choices:["3","4","5"], answer:1, feedbackOk:"Right", feedbackNo:"(2+4+6)/3=4"},
        {type:"short", q:"A common chart library for JS (starts with 'C')", answers:["chartjs","chart.js"], feedbackOk:"Nice", feedbackNo:"Hint: Chart.js"}
      ]
    }
  ];
  for(const q of finals){ await db.collection("quizzes").add({ ...q, ownerUid: uid, createdAt: now }); }

  // Demo chat
  for(const ch of ["course_demo","group_2025"]){
    await db.collection("messages").add({channel: ch, type: ch.startsWith("course")?"course":"group", uid, email, name:"Admin", text:"Welcome to the demo channel!", createdAt: now});
  }

  // Demo task
  await db.collection("tasks").add({uid, title:"Try the demo app", status:"todo", createdAt: now});

  // Profile
  await db.collection("profiles").doc(uid).set({uid, email, name:"Demo Admin", bio:"I build awesome courses.", portfolio:"https://example.com", role:"admin", updatedAt: now}, {merge:true});

  // Add a passing attempt for transcript demo if finals exist
  const qSnap = await db.collection("quizzes").where("isFinal","==",true).limit(1).get();
  const quiz = qSnap.docs[0]?.data(); const quizId = qSnap.docs[0]?.id;
  if(quizId){ await db.collection("attempts").add({uid, email, quizId, quizTitle: quiz.title||"Final", courseId: quiz.courseId||"", score: Math.max(quiz.passScore||70, 80), createdAt: now}); }

  notify("Demo data seeded. Refresh or navigate.", "ok");
}
