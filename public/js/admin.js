let progressDataCache = []; // store data so filters/sorting work without refetching

async function renderAdminProgress() {
  const tbody = document.getElementById("progress-body");
  tbody.innerHTML = "";

  try {
    const snap = await getDocs(collection(db, "progress"));
    progressDataCache = snap.docs.map(doc => doc.data());

    // populate filter dropdowns
    populateFilterOptions();

    // render rows initially
    renderFilteredProgress();
  } catch (err) {
    console.error("Error loading progress:", err);
  }
}

function populateFilterOptions() {
  const courseSel = document.getElementById("filter-course");
  const studentSel = document.getElementById("filter-student");

  // unique values
  const courses = [...new Set(progressDataCache.map(p => p.courseTitle))];
  const students = [...new Set(progressDataCache.map(p => p.studentName))];

  courseSel.innerHTML = `<option value="">All Courses</option>` +
    courses.map(c => `<option value="${c}">${c}</option>`).join("");

  studentSel.innerHTML = `<option value="">All Students</option>` +
    students.map(s => `<option value="${s}">${s}</option>`).join("");
}

function renderFilteredProgress() {
  const tbody = document.getElementById("progress-body");
  tbody.innerHTML = "";

  const courseFilter = document.getElementById("filter-course").value;
  const studentFilter = document.getElementById("filter-student").value;
  const progressFilter = document.getElementById("filter-progress").value;

  let filtered = [...progressDataCache];

  if (courseFilter) {
    filtered = filtered.filter(p => p.courseTitle === courseFilter);
  }
  if (studentFilter) {
    filtered = filtered.filter(p => p.studentName === studentFilter);
  }
  if (progressFilter) {
    filtered = filtered.filter(p => {
      const pct = p.percentage || 0;
      if (progressFilter === "low") return pct <= 33;
      if (progressFilter === "medium") return pct > 33 && pct <= 66;
      if (progressFilter === "high") return pct > 66;
    });
  }

  filtered.forEach(p => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.studentName}</td>
      <td>${p.courseTitle}</td>
      <td>${p.percentage || 0}%</td>
    `;
    tbody.appendChild(row);
  });
}

// Sorting button
document.getElementById("sort-progress").addEventListener("click", () => {
  progressDataCache.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  renderFilteredProgress();
});

// Filter change listeners
["filter-course", "filter-student", "filter-progress"].forEach(id => {
  document.getElementById(id).addEventListener("change", renderFilteredProgress);
});