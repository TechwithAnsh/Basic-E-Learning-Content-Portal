/* E-Learning Portal - School Edition */

"use strict";

const schoolSubjects = ["Hindi", "English", "Mathematics", "Science", "Social Studies (SST)"];
const seniorSubjects = ["Hindi", "English", "Mathematics", "Physics", "Chemistry", "Biology", "Accountancy", "Economics", "Business Studies"];
const coverStyles = ["cover-blue", "cover-purple", "cover-green", "cover-orange", "cover-pink", "cover-cyan"];
const symbols = ["अ", "A", "∑", "⚗", "🌍", "📘"];

const defaultCourses = [
  ...Array.from({ length: 10 }, (_, i) =>
    schoolSubjects.map((subject, j) => ({
      id: i * 5 + j + 1,
      title: `${subject} - Class ${i + 1}`,
      category: subject,
      level: `Class ${i + 1}`,
      lessons: 10,
      duration: "2h 30m",
      description: `Class ${i + 1} ${subject} lessons, revision notes and learning materials.`,
      symbol: symbols[j],
      cover: coverStyles[j % coverStyles.length],
      instructor: "School Faculty",
      video: "",
      progress: 0
    }))
  ).flat(),
  ...Array.from({ length: 2 }, (_, i) =>
    seniorSubjects.map((subject, j) => ({
      id: 51 + i * 9 + j,
      title: `${subject} - Class ${i + 11}`,
      category: subject,
      level: `Class ${i + 11}`,
      lessons: 12,
      duration: "3h 00m",
      description: `Class ${i + 11} ${subject} lessons, revision notes and learning materials.`,
      symbol: symbols[j % symbols.length],
      cover: coverStyles[j % coverStyles.length],
      instructor: "School Faculty",
      video: "",
      progress: 0
    }))
  ).flat()
];

const quizQuestions = [
  { q: "Which part of a plant absorbs water from the soil?", opts: ["Leaf", "Root", "Flower", "Stem"], a: 1, why: "Roots absorb water and minerals from the soil." },
  { q: "What is 12 × 8?", opts: ["86", "92", "96", "108"], a: 2, why: "12 multiplied by 8 equals 96." },
  { q: "Which word is a noun?", opts: ["Quickly", "Beautiful", "School", "Run"], a: 2, why: "School is a naming word, so it is a noun." },
  { q: "Which is the national animal of India?", opts: ["Lion", "Tiger", "Elephant", "Peacock"], a: 1, why: "The Bengal tiger is India's national animal." },
  { q: "Which gas do humans need for breathing?", opts: ["Carbon dioxide", "Nitrogen", "Oxygen", "Hydrogen"], a: 2, why: "Humans need oxygen for respiration." },
  { q: "How many sides does a triangle have?", opts: ["2", "3", "4", "5"], a: 1, why: "A triangle has three sides." },
  { q: "Which planet is known as the Red Planet?", opts: ["Venus", "Jupiter", "Mars", "Saturn"], a: 2, why: "Iron oxide gives Mars its reddish appearance." },
  { q: "Choose the correct plural of 'child'.", opts: ["Childs", "Childes", "Children", "Childrens"], a: 2, why: "The plural form of child is children." },
  { q: "What is the place value of 5 in 352?", opts: ["5", "50", "500", "5000"], a: 1, why: "The digit 5 is in the tens place." },
  { q: "Which organ pumps blood around the body?", opts: ["Lungs", "Brain", "Heart", "Kidney"], a: 2, why: "The heart pumps blood through the circulatory system." }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const readStore = (key, fallback) => {
  try {
    const value = localStorage.getItem(`elearningportal_${key}`);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
};

const writeStore = (key, value) => {
  try {
    localStorage.setItem(`elearningportal_${key}`, JSON.stringify(value));
  } catch (error) {
    console.warn("Could not save portal data:", error);
  }
};

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[char]));

let courses = readStore("courses", defaultCourses);
if (!Array.isArray(courses) || !courses.length) courses = [...defaultCourses];

let user = readStore("user", { name: "Student", role: "Student" });
let progress = readStore("progress", {});
let activities = readStore("activities", []);

let page = "home";
let subjectFilter = "All";
let classFilter = "All";
let searchTerm = "";
let quizIndex = 0;
let quizAnswers = [];
let quizFinished = false;

function saveCourses() {
  writeStore("courses", courses);
}

function saveProgress() {
  writeStore("progress", progress);
}

function addActivity(message) {
  activities.unshift({
    message,
    date: new Date().toLocaleDateString()
  });

  activities = activities.slice(0, 8);
  writeStore("activities", activities);
}

function toast(message) {
  const el = $("#toast");
  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    el.classList.remove("show");
  }, 2600);
}

function updateUser() {
  const name = user?.name || "Student";
  const initial = name.trim().charAt(0).toUpperCase() || "S";

  if ($("#sideName")) $("#sideName").textContent = name;

  if ($("#sideRole")) {
    $("#sideRole").textContent =
      user?.role === "Teacher" ? "Teacher account" : "Learner account";
  }

  if ($("#sideAvatar")) $("#sideAvatar").textContent = initial;
  if ($("#profileBtn")) $("#profileBtn").textContent = initial;

  if ($("#accountBtn")) {
    $("#accountBtn").textContent = user?.email ? "Account" : "Log in";
  }
}

function setPage(nextPage) {
  page = nextPage;

  $$(".nav-link").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  const labels = {
    home: "Overview",
    courses: "Explore courses",
    "my-learning": "My learning",
    quiz: "Practice quiz",
    resources: "Resources",
    certificates: "Certificates",
    teacher: "Teacher studio"
  };

  if ($("#pageCrumb")) {
    $("#pageCrumb").textContent = labels[page] || "Overview";
  }

  if ($("#sidebar")) {
    $("#sidebar").classList.remove("open");
  }

  render();
}

function showModal(html) {
  $("#modalContent").innerHTML = html;
  $("#modalBackdrop").classList.remove("hidden");
}

function closeModal() {
  $("#modalBackdrop").classList.add("hidden");
  $("#modalContent").innerHTML = "";
}

function courseProgress(course) {
  return Math.max(
    0,
    Math.min(100, Number(progress[course.id] ?? course.progress ?? 0))
  );
}

function courseCard(course) {
  const pct = courseProgress(course);

  return `
    <article class="course-card">
      <div class="course-cover ${escapeHtml(course.cover || "cover-blue")}">
        <span class="cover-symbol">${escapeHtml(course.symbol || "📘")}</span>
      </div>

      <div class="course-body">
        <div class="course-meta">
          <span>${escapeHtml(course.level)}</span>
          <span class="pill">${escapeHtml(course.category)}</span>
        </div>

        <h4>${escapeHtml(course.title)}</h4>

        <p>${escapeHtml(course.description || "Lessons, revision notes and learning materials.")}</p>

        <div class="course-bottom">
          <span>${Number(course.lessons) || 0} lessons</span>
          <span>${escapeHtml(course.duration || "Self-paced")}</span>
        </div>

        <div class="progress">
          <span style="width:${pct}%"></span>
        </div>

        <div class="course-bottom">
          <span>${pct}% completed</span>
          <span>${escapeHtml(course.instructor || "School Faculty")}</span>
        </div>

        <div class="course-actions">
          <button class="primary-btn" data-action="open-course" data-id="${course.id}">
            Open course
          </button>

          <button class="secondary-btn" data-action="mark-progress" data-id="${course.id}">
            ${pct >= 100 ? "Completed" : "Continue"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function filteredCourses() {
  return courses.filter(course => {
    const matchesSubject =
      subjectFilter === "All" || course.category === subjectFilter;

    const matchesClass =
      classFilter === "All" || course.level === classFilter;

    const haystack =
      `${course.title} ${course.category} ${course.level}`.toLowerCase();

    return matchesSubject &&
      matchesClass &&
      haystack.includes(searchTerm.toLowerCase());
  });
}

function filtersMarkup() {
  const subjects = ["All", ...new Set(courses.map(course => course.category))];

  const classes = [
    "All",
    ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)
  ];

  return `
    <div class="filter-row">

      <select class="filter-chip" id="classFilter" aria-label="Filter by class">
        ${classes.map(item => `
          <option value="${escapeHtml(item)}" ${classFilter === item ? "selected" : ""}>
            ${escapeHtml(item === "All" ? "All classes" : item)}
          </option>
        `).join("")}
      </select>

      ${subjects.map(item => `
        <button
          class="filter-chip ${subjectFilter === item ? "active" : ""}"
          data-action="subject-filter"
          data-value="${escapeHtml(item)}">
          ${escapeHtml(item)}
        </button>
      `).join("")}

    </div>
  `;
}
function renderHome() {
  const completed = courses.filter(course => courseProgress(course) >= 100).length;
  const started = courses.filter(course => courseProgress(course) > 0).length;

  const average = courses.length
    ? Math.round(courses.reduce((sum, course) => sum + courseProgress(course), 0) / courses.length)
    : 0;

  const featured = courses.filter(course => course.level === "Class 10").slice(0, 3);

  return `
    <div class="welcome-row">
      <div>
        <div class="eyebrow">YOUR LEARNING SPACE</div>
        <h1 class="page-title">Welcome back, ${escapeHtml(user.name || "Student")}!</h1>
        <p class="subtext">Learn at your own pace. Explore subjects, practise and track your progress.</p>
      </div>
      <button class="primary-btn" data-action="go-courses">Explore courses ↗</button>
    </div>

    <section class="hero-banner">
      <div>
        <div class="eyebrow">LEARN · PRACTISE · GROW</div>
        <h2>Every class. Every subject. One place.</h2>
        <p>Find school lessons, strengthen your basics and build confidence with regular practice.</p>
        <button class="primary-btn" data-action="go-courses">Start learning</button>
      </div>
      <div class="hero-art">🎓</div>
    </section>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-top">Available courses <span class="stat-icon">▤</span></div>
        <div class="stat-number">${courses.length}</div>
        <div class="stat-foot">Classes 1–12</div>
      </div>

      <div class="stat-card">
        <div class="stat-top">Courses started <span class="stat-icon">◷</span></div>
        <div class="stat-number">${started}</div>
        <div class="stat-foot">Keep learning</div>
      </div>

      <div class="stat-card">
        <div class="stat-top">Completed <span class="stat-icon">✓</span></div>
        <div class="stat-number">${completed}</div>
        <div class="stat-foot">Great progress</div>
      </div>

      <div class="stat-card">
        <div class="stat-top">Overall progress <span class="stat-icon">↗</span></div>
        <div class="stat-number">${average}%</div>
        <div class="stat-foot">Across all courses</div>
      </div>
    </div>

    <div class="section-heading">
      <h3>Explore by class</h3>
      <button class="text-btn" data-action="go-courses">View all courses →</button>
    </div>

    <div class="filter-row">
      ${[1,2,3,4,5,6,7,8,9,10,11,12].map(n =>
        `<button class="filter-chip" data-action="choose-class" data-value="Class ${n}">Class ${n}</button>`
      ).join("")}
    </div>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-head">
          <h3>Popular courses</h3>
          <small>Class 10</small>
        </div>
        <div class="course-grid">
          ${featured.map(courseCard).join("")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h3>Recent activity</h3>
          <small>Your learning history</small>
        </div>

        <div class="activity-list">
          ${activities.length
            ? activities.slice(0, 6).map(item => `
              <div class="activity-item">
                <span class="activity-dot">✓</span>
                <div>
                  <b>${escapeHtml(item.message)}</b>
                  <small>${escapeHtml(item.date)}</small>
                </div>
              </div>
            `).join("")
            : `
              <div class="empty-state">
                <div class="big">📚</div>
                No activity yet. Open a course to get started.
              </div>
            `
          }
        </div>
      </section>
    </div>
  `;
}

function renderCourses() {
  const list = filteredCourses();

  return `
    <div class="eyebrow">COURSE LIBRARY</div>
    <h1 class="page-title">Explore courses</h1>
    <p class="subtext">Choose your class and subject to find learning material.</p>

    ${filtersMarkup()}

    <p class="subtext">${list.length} courses found</p>

    <div class="course-grid">
      ${list.length
        ? list.map(courseCard).join("")
        : `
          <div class="panel empty-state" style="grid-column:1/-1">
            <div class="big">🔎</div>
            No courses match your search. Try another class or subject.
          </div>
        `
      }
    </div>
  `;
}

function renderMyLearning() {
  const list = courses.filter(course => courseProgress(course) > 0);

  return `
    <div class="eyebrow">YOUR PROGRESS</div>
    <h1 class="page-title">My learning</h1>
    <p class="subtext">Courses you have started and your completion progress.</p>

    <section class="panel" style="margin-top:22px">
      ${list.length
        ? list.map(course => {
            const pct = courseProgress(course);

            return `
              <div class="learning-row">
                <div class="learning-info">
                  <div class="mini-cover ${escapeHtml(course.cover)}">
                    ${escapeHtml(course.symbol)}
                  </div>

                  <div>
                    <b>${escapeHtml(course.title)}</b>
                    <small>${escapeHtml(course.level)} · ${escapeHtml(course.category)}</small>

                    <div class="progress" style="width:min(360px,55vw)">
                      <span style="width:${pct}%"></span>
                    </div>
                  </div>
                </div>

                <button class="secondary-btn" data-action="open-course" data-id="${course.id}">
                  ${pct >= 100 ? "Review" : "Continue"}
                </button>
              </div>
            `;
          }).join("")
        : `
          <div class="empty-state">
            <div class="big">📖</div>
            You haven't started a course yet.
            <br>
            <button class="primary-btn" data-action="go-courses" style="margin-top:15px">
              Explore courses
            </button>
          </div>
        `
      }
    </section>
  `;
}

function renderQuiz() {
  if (quizFinished) {
    const score = quizQuestions.reduce(
      (sum, question, i) => sum + (quizAnswers[i] === question.a ? 1 : 0),
      0
    );

    return `
      <div class="eyebrow">PRACTICE TIME</div>
      <h1 class="page-title">Quiz result</h1>

      <section class="panel quiz-result">
        <div class="score-ring">${score}/${quizQuestions.length}</div>
        <h2>${score >= 7 ? "Excellent work!" : score >= 5 ? "Good effort!" : "Keep practising!"}</h2>
        <p class="subtext">
          You answered ${score} out of ${quizQuestions.length} questions correctly.
        </p>
        <button class="primary-btn" data-action="restart-quiz">Try again</button>
      </section>
    `;
  }

  const question = quizQuestions[quizIndex];

  return `
    <div class="eyebrow">TEST YOUR KNOWLEDGE</div>
    <h1 class="page-title">Practice quiz</h1>
    <p class="subtext">A short general school-level quiz.</p>

    <div class="quiz-layout" style="margin-top:22px">
      <section class="panel">
        <div class="panel-head">
          <span class="question-number">
            QUESTION ${quizIndex + 1} OF ${quizQuestions.length}
          </span>
          <small>${Math.round((quizIndex / quizQuestions.length) * 100)}% complete</small>
        </div>

        <h2 class="question-title">${escapeHtml(question.q)}</h2>

        ${question.opts.map((option, i) => `
          <button
            class="option ${quizAnswers[quizIndex] === i ? "selected" : ""}"
            data-action="quiz-answer"
            data-value="${i}">
            ${String.fromCharCode(65 + i)}. ${escapeHtml(option)}
          </button>
        `).join("")}

        <div class="modal-actions">
          <button class="ghost-btn" data-action="quiz-prev" ${quizIndex === 0 ? "disabled" : ""}>
            Previous
          </button>

          <button class="primary-btn" data-action="quiz-next">
            ${quizIndex === quizQuestions.length - 1 ? "Finish quiz" : "Next question"}
          </button>
        </div>
      </section>

      <aside class="panel">
        <h3>Quiz guide</h3>
        <p class="subtext">Select one answer for each question. You can move back before submitting.</p>

        <div class="filter-row">
          ${quizQuestions.map((_, i) => `
            <span class="filter-chip ${quizAnswers[i] !== undefined ? "active" : ""}">
              ${i + 1}
            </span>
          `).join("")}
        </div>
      </aside>
    </div>
  `;
}
function renderResources() {
  const resources = [
    ["📒", "Revision notes", "Use your class notes to revise important topics."],
    ["🧮", "Mathematics practice", "Practise calculations, formulas and problem solving."],
    ["🔬", "Science learning", "Review concepts, diagrams and scientific terms."],
    ["🌍", "Social Studies", "Explore history, geography and civics topics."],
    ["✍️", "Language practice", "Improve reading, grammar, writing and vocabulary."]
  ];

  return `
    <div class="eyebrow">STUDY MATERIAL</div>
    <h1 class="page-title">Learning resources</h1>
    <p class="subtext">Helpful study sections for your school subjects.</p>

    <section class="panel" style="margin-top:22px">
      ${resources.map(([icon, title, desc]) => `
        <div class="resource-row">
          <span class="resource-icon">${icon}</span>
          <div>
            <b>${title}</b>
            <small>${desc}</small>
          </div>
          <button class="secondary-btn" data-action="resource-info" data-value="${escapeHtml(title)}">
            Explore
          </button>
        </div>
      `).join("")}
    </section>

    <p class="subtext" style="margin-top:14px">
      Note: These are resource categories. Add your own notes and links through the teacher workspace.
    </p>
  `;
}

function renderCertificates() {
  const completed = courses.filter(course => courseProgress(course) >= 100);

  return `
    <div class="eyebrow">ACHIEVEMENTS</div>
    <h1 class="page-title">Certificates</h1>
    <p class="subtext">Complete a course to unlock its certificate.</p>

    <section class="panel" style="margin-top:22px">
      ${completed.length
        ? completed.map(course => `
          <div class="certificate" style="margin-bottom:15px">
            <div class="eyebrow">CERTIFICATE OF COMPLETION</div>
            <h2>E-Learning Portal</h2>
            <p>This certificate is presented to</p>
            <div class="cert-name">${escapeHtml(user.name || "Student")}</div>
            <p>for completing ${escapeHtml(course.title)}</p>
            <small>${new Date().toLocaleDateString()}</small>

            <div style="margin-top:15px">
              <button class="secondary-btn" data-action="print-certificate">
                Print certificate
              </button>
            </div>
          </div>
        `).join("")
        : `
          <div class="empty-state">
            <div class="big">🏅</div>
            No certificates yet. Finish a course to earn your first certificate.
          </div>
        `
      }
    </section>
  `;
}

function renderTeacher() {
  if (user.role !== "Teacher") {
    return `
      <div class="eyebrow">TEACHER WORKSPACE</div>
      <h1 class="page-title">Teacher studio</h1>

      <section class="panel" style="margin-top:22px">
        <h3>Teacher access</h3>
        <p class="subtext">
          Sign in with the Teacher role to add and manage courses on this browser.
        </p>

        <button class="primary-btn" data-action="open-auth" style="margin-top:15px">
          Log in / change role
        </button>
      </section>
    `;
  }

  return `
    <div class="eyebrow">TEACHER WORKSPACE</div>
    <h1 class="page-title">Teacher studio</h1>
    <p class="subtext">
      Create a course for students. Changes are saved in this browser.
    </p>

    <section class="panel" style="margin-top:22px">
      <div class="panel-head">
        <h3>Add a course</h3>
        <small>Course details</small>
      </div>

      <form id="teacherCourseForm" class="teacher-form">

        <div class="field">
          <label for="newTitle">Course title</label>
          <input id="newTitle" required placeholder="e.g. Fractions and Decimals">
        </div>

        <div class="field">
          <label for="newClass">Class</label>
          <select id="newClass">
            ${Array.from({ length: 12 }, (_, i) =>
              `<option>Class ${i + 1}</option>`
            ).join("")}
          </select>
        </div>

        <div class="field">
          <label for="newSubject">Subject</label>
          <select id="newSubject">
            ${[...new Set([...schoolSubjects, ...seniorSubjects])].map(subject =>
              `<option>${escapeHtml(subject)}</option>`
            ).join("")}
          </select>
        </div>

        <div class="field">
          <label for="newLessons">Number of lessons</label>
          <input id="newLessons" type="number" min="1" max="100" value="10" required>
        </div>

        <div class="field full">
          <label for="newDescription">Description</label>
          <input id="newDescription" placeholder="What will students learn?">
        </div>

        <div class="field full">
          <label for="newVideo">Video link (optional)</label>
          <input id="newVideo" type="url" placeholder="https://...">
        </div>

        <div class="field full">
          <button class="primary-btn" type="submit">Add course</button>
        </div>

      </form>
    </section>

    <section class="panel" style="margin-top:18px">
      <div class="panel-head">
        <h3>Recently added courses</h3>
        <small>${courses.length} total</small>
      </div>

      ${courses.filter(course => course.custom).slice(-8).reverse().map(course => `
        <div class="resource-row">
          <div>
            <b>${escapeHtml(course.title)}</b>
            <small>${escapeHtml(course.level)} · ${escapeHtml(course.category)}</small>
          </div>
          <button class="ghost-btn" data-action="delete-course" data-id="${course.id}">
            Remove
          </button>
        </div>
      `).join("") || `<p class="subtext">No custom courses added yet.</p>`}
    </section>
  `;
}

function render() {
  const content = $("#content");
  if (!content) return;

  const views = {
    home: renderHome,
    courses: renderCourses,
    "my-learning": renderMyLearning,
    quiz: renderQuiz,
    resources: renderResources,
    certificates: renderCertificates,
    teacher: renderTeacher
  };

  content.innerHTML = (views[page] || renderHome)();
  updateUser();
}

function openCourse(id) {
  const course = courses.find(item => String(item.id) === String(id));
  if (!course) return;

  const pct = courseProgress(course);

  showModal(`
    <div class="eyebrow">${escapeHtml(course.level)} · ${escapeHtml(course.category)}</div>

    <h2 id="modalTitle">${escapeHtml(course.title)}</h2>

    <p>${escapeHtml(course.description || "Learn this subject with lessons and revision materials.")}</p>

    <div class="notice">
      <b>${Number(course.lessons) || 0} lessons</b>
      · ${escapeHtml(course.duration || "Self-paced")}
      · ${pct}% completed
    </div>

    ${course.video
      ? `<a class="primary-btn" href="${escapeHtml(course.video)}" target="_blank" rel="noopener">Open learning video ↗</a>`
      : `<p class="subtext" style="margin-top:15px">Learning materials for this course can be added by your teacher.</p>`
    }

    <div class="progress">
      <span style="width:${pct}%"></span>
    </div>

    <div class="modal-actions">
      <button class="primary-btn" data-action="advance-progress" data-id="${course.id}">
        ${pct >= 100 ? "Mark as in progress" : "Mark lesson complete"}
      </button>

      <button class="ghost-btn" data-action="close-modal">Close</button>
    </div>
  `);
}

function advanceProgress(id) {
  const course = courses.find(item => String(item.id) === String(id));
  if (!course) return;

  const current = courseProgress(course);

  progress[course.id] = current >= 100
    ? 10
    : Math.min(100, current + 10);

  saveProgress();

  addActivity(`${course.title}: ${progress[course.id]}% completed`);

  closeModal();
  render();

  toast("Learning progress updated.");
}

function authModal() {
  showModal(`
    <div class="eyebrow">EDULEARN ACCOUNT</div>
    <h2 id="modalTitle">Welcome to E-Learning Portal</h2>

    <p>Enter your name and choose how you will use the portal on this device.</p>

    <form id="authForm" class="teacher-form">

      <div class="field full">
        <label for="accountName">Your name</label>
        <input id="accountName" required value="${escapeHtml(user.name || "")}" placeholder="Enter your name">
      </div>

      <div class="field full">
        <label for="accountEmail">Email (optional)</label>
        <input id="accountEmail" type="email" value="${escapeHtml(user.email || "")}" placeholder="you@example.com">
      </div>

      <div class="field full">
        <label for="accountRole">Account type</label>
        <select id="accountRole">
          <option ${user.role === "Student" ? "selected" : ""}>Student</option>
          <option ${user.role === "Teacher" ? "selected" : ""}>Teacher</option>
        </select>
      </div>

      <div class="field full">
        <button class="primary-btn" type="submit">Save account</button>
      </div>

    </form>

    <p class="subtext">
      This demo stores the profile only in this browser. It does not create a secure online account.
    </p>
  `);
}

function handleAction(button) {
  const action = button.dataset.action;
  const id = button.dataset.id;
  const value = button.dataset.value;

  if (action === "go-courses") {
    subjectFilter = "All";
    classFilter = "All";
    setPage("courses");
  }

  else if (action === "open-course") {
    openCourse(id);
  }

  else if (action === "mark-progress" || action === "advance-progress") {
    advanceProgress(id);
  }

  else if (action === "close-modal") {
    closeModal();
  }

  else if (action === "open-auth") {
    authModal();
  }

  else if (action === "subject-filter") {
    subjectFilter = value;
    render();
  }

  else if (action === "choose-class") {
    classFilter = value;
    subjectFilter = "All";
    setPage("courses");
  }

  else if (action === "quiz-answer") {
    quizAnswers[quizIndex] = Number(value);
    render();
  }

  else if (action === "quiz-prev") {
    quizIndex = Math.max(0, quizIndex - 1);
    render();
  }

  else if (action === "quiz-next") {
    if (quizAnswers[quizIndex] === undefined) {
      toast("Please select an answer first.");
      return;
    }

    if (quizIndex < quizQuestions.length - 1) {
      quizIndex++;
    } else {
      quizFinished = true;
      addActivity("Completed the practice quiz");
    }

    render();
  }

  else if (action === "restart-quiz") {
    quizIndex = 0;
    quizAnswers = [];
    quizFinished = false;
    render();
  }

  else if (action === "resource-info") {
    toast(`${value}: Study materials can be added by your teacher.`);
  }

  else if (action === "print-certificate") {
    window.print();
  }

  else if (action === "delete-course") {
    courses = courses.filter(course => String(course.id) !== String(id));
    saveCourses();
    render();
    toast("Course removed.");
  }
}

/* Navigation and button events */

document.addEventListener("click", event => {
  const actionButton = event.target.closest("[data-action]");

  if (actionButton) {
    handleAction(actionButton);
    return;
  }

  const navButton = event.target.closest("[data-page]");

  if (navButton) {
    event.preventDefault();
    setPage(navButton.dataset.page);
  }
});

document.addEventListener("change", event => {
  if (event.target.id === "classFilter") {
    classFilter = event.target.value;
    render();
  }
});

document.addEventListener("input", event => {
  if (event.target.id === "globalSearch") {
    searchTerm = event.target.value;

    if (page !== "courses") {
      setPage("courses");
    } else {
      render();
    }

    const search = $("#globalSearch");

    if (search) {
      search.focus();
      search.setSelectionRange(search.value.length, search.value.length);
    }
  }
});

/* Login form and teacher course form */

document.addEventListener("submit", event => {
  if (event.target.id === "authForm") {
    event.preventDefault();

    user = {
      name: $("#accountName").value.trim() || "Student",
      email: $("#accountEmail").value.trim(),
      role: $("#accountRole").value
    };

    writeStore("user", user);

    closeModal();
    updateUser();
    render();

    toast(`Welcome, ${user.name}!`);
    return;
  }

  if (event.target.id === "teacherCourseForm") {
    event.preventDefault();

    const title = $("#newTitle").value.trim();
    const level = $("#newClass").value;
    const category = $("#newSubject").value;
    const lessons = Number($("#newLessons").value);

    if (!title || !lessons || lessons < 1) {
      toast("Please enter valid course details.");
      return;
    }

    const course = {
      id: `custom-${Date.now()}`,
      title: `${title} - ${level}`,
      category,
      level,
      lessons,
      duration: "Self-paced",
      description: $("#newDescription").value.trim() || `${title} learning material.`,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      cover: coverStyles[courses.length % coverStyles.length],
      instructor: user.name || "School Faculty",
      video: $("#newVideo").value.trim(),
      progress: 0,
      custom: true
    };

    courses.push(course);

    saveCourses();
    addActivity(`Added course: ${course.title}`);

    render();
    toast("Course added successfully.");
  }
});

/* Header controls */

$("#accountBtn")?.addEventListener("click", authModal);
$("#profileBtn")?.addEventListener("click", authModal);

$("#logoutBtn")?.addEventListener("click", () => {
  user = { name: "Student", role: "Student" };

  writeStore("user", user);
  updateUser();
  render();

  toast("You are now using the student profile.");
});

$("#mobileMenu")?.addEventListener("click", () => {
  $("#sidebar")?.classList.toggle("open");
});

$("#modalClose")?.addEventListener("click", closeModal);

$("#modalBackdrop")?.addEventListener("click", event => {
  if (event.target.id === "modalBackdrop") {
    closeModal();
  }
});

$("#helpBtn")?.addEventListener("click", () => {
  toast("Please contact your school teacher for support.");
});

$("#notifBtn")?.addEventListener("click", () => {
  toast("You're all caught up!");
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeModal();
  }
});

/* Start application */

updateUser();
render();
