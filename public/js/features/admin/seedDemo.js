import { auth, db } from "./main.js";
import { collection, setDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.getElementById("seedDemoBtn").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("You must be signed in to seed demo data");
    return;
  }

  // ⚡ Check admin claim
  const token = await user.getIdTokenResult();
  if (!token.claims.admin) {
    alert("Only admins can run seeding");
    return;
  }

  try {
    // Demo course
    await setDoc(doc(db, "courses", "demo-course"), {
      title: "Intro to Sushi Making",
      type: "free",
      content: "Learn basics of rolling sushi",
      createdAt: new Date(),
    });

    // Demo task
    await setDoc(doc(db, "tasks", "demo-task"), {
      title: "Prep Ingredients",
      status: "todo",
      createdAt: new Date(),
    });

    // Demo announcement
    await setDoc(doc(db, "announcements", "welcome"), {
      message: "🎉 Welcome to LearnHub Demo!",
      createdAt: new Date(),
    });

    alert("✅ Demo data seeded!");
  } catch (err) {
    console.error("Seeding failed", err);
    alert("❌ Failed to seed demo: " + err.message);
  }
});