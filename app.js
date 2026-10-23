// Portfolio interactions: theme, navigation, project previews, and mascot entrance.
// Edit visible page text in index.html; project preview content is defined below.
const root = document.documentElement;
const themeButton = document.querySelector(".theme-toggle");
const themeMeta = document.querySelector('meta[name="theme-color"]');
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".navigation");
const header = document.querySelector(".site-header");
const navLinks = [...navigation.querySelectorAll("a")];
const sections = [...document.querySelectorAll("main section[id]")];
const dialog = document.querySelector("#project-dialog");
let lastProjectTrigger = null;

function syncTheme() {
  const light = root.dataset.theme === "light";
  const label = `Switch to ${light ? "dark" : "light"} theme`;
  themeButton.setAttribute("aria-label", label);
  themeButton.title = label;
  themeMeta.content = getComputedStyle(root).getPropertyValue("--bg").trim();
}

themeButton.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
  try {
    localStorage.setItem("jcn-theme", root.dataset.theme);
  } catch {
    /* Storage can be unavailable in private browsing; keep the current theme. */
  }
  syncTheme();
});
syncTheme();

function closeMenu() {
  navigation.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
}

menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  navigation.classList.toggle("is-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute(
    "aria-label",
    `${open ? "Close" : "Open"} navigation`,
  );
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => {
    const target = document.querySelector(link.getAttribute("href"));
    const menuWasOpen = menuButton.getAttribute("aria-expanded") === "true";
    closeMenu();
    if (menuWasOpen && target) {
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      target.addEventListener(
        "blur",
        () => target.removeAttribute("tabindex"),
        { once: true },
      );
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    menuButton.getAttribute("aria-expanded") === "true"
  ) {
    closeMenu();
    menuButton.focus();
  }
});

document.addEventListener("pointerdown", (event) => {
  if (!header.contains(event.target)) closeMenu();
});

window.matchMedia("(min-width: 901px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});

let scrollQueued = false;
function updateScrollState() {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
  let active = "home";
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= 180) active = section.id;
  }
  if (
    window.scrollY + window.innerHeight >=
    document.documentElement.scrollHeight - 5
  )
    active = "contact";
  if (["skills", "coursework", "certificates"].includes(active))
    active = "about";
  navLinks.forEach((link) => {
    if (link.hash === `#${active}`)
      link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  scrollQueued = false;
}
window.addEventListener(
  "scroll",
  () => {
    if (!scrollQueued) {
      window.requestAnimationFrame(updateScrollState);
      scrollQueued = true;
    }
  },
  { passive: true },
);
window.addEventListener("resize", updateScrollState);
updateScrollState();

const projectTemplates = {
  featured: {
    title: "Hydro-Tracker",
    number: "01",
    label: "Solo project / Mobile development",
    description:
      "A Flutter hydration app with daily logging, progress tracking, reminders, and an AI coach.",
    idea: "Hydro-Tracker helps users keep track of their daily fluid intake. Users record a drink and its amount, compare their total with a daily goal, and review previous entries through history and weekly or monthly statistics.",
    contribution:
      "I built the Flutter screens and connected them to the hydration calculations, reminders, and saved records. I implemented account access and cloud storage with Supabase, local caching, editable entries, and integrations for weather information and an AI coach.",
    stack: "Flutter, Dart, Supabase, and external API integration.",
    learning:
      "Logging a drink updates the daily total and progress display. Users can correct an earlier entry from their history and adjust their goal and reminder times in settings. Weather information can inform goal adjustments, while the coach sends requests through a backend function.",
    footer:
      "The video animates captured app screens from a demo account through registration, logging, statistics, settings, and history.",
    video: {
      src: "assets/videos/hydro-tracker.mp4",
      hevc: "assets/videos/hydro-tracker.hevc.mp4",
      hevcCodecs: "hvc1.1.6.L120.90",
      poster: "assets/videos/hydro-tracker.jpg",
      duration: 53.6,
      chapters: [
        {
          time: 0,
          title: "Open the app",
          caption:
            "The splash screen restores a saved session before the first screen.",
          screen: "assets/projects/hydro-splash.png",
        },
        {
          time: 2.8,
          title: "Create an account",
          caption:
            "New users register with a name, email, and confirmed password.",
          screen: "assets/projects/hydro-sign_up.png",
        },
        {
          time: 6.5,
          title: "Sign in",
          caption: "Returning users sign in with their email and password.",
          screen: "assets/projects/hydro-sign_in.png",
        },
        {
          time: 10.3,
          title: "Start the day",
          caption:
            "The dashboard compares today's intake with a personalised daily goal.",
          screen: "assets/projects/hydro-home_empty.png",
        },
        {
          time: 13.8,
          title: "Log a drink",
          caption: "Pick a drink type and an amount, then add it to the day.",
          screen: "assets/projects/hydro-log_sheet.png",
        },
        {
          time: 17.5,
          title: "Unlock an achievement",
          caption: "The first logged drink earns the First Sip badge.",
          screen: "assets/projects/hydro-achievement.png",
        },
        {
          time: 20.7,
          title: "Watch the ring fill",
          caption:
            "Drinks count by how hydrating they are: 750 ml of water, juice, and coffee adds 613 ml.",
          screen: "assets/projects/hydro-dash.png",
        },
        {
          time: 25.3,
          title: "See today's mix",
          caption: "Scrolling down shows each drink's share of the day.",
          screen: "assets/projects/hydro-home_mix.png",
        },
        {
          time: 28.9,
          title: "Today by hour",
          caption:
            "Statistics show when each drink was logged through the day.",
          screen: "assets/projects/hydro-stats_today.png",
        },
        {
          time: 32.5,
          title: "Weekly statistics",
          caption: "Compare the last seven days with the daily goal.",
          screen: "assets/projects/hydro-stats_week.png",
        },
        {
          time: 35.6,
          title: "Monthly statistics",
          caption: "Switch to 30 days to review a longer range.",
          screen: "assets/projects/hydro-stats_month.png",
        },
        {
          time: 38.7,
          title: "Profile and goals",
          caption: "Adjust the daily goal, body weight, and activity level.",
          screen: "assets/projects/hydro-settings.png",
        },
        {
          time: 42.4,
          title: "Reminders and theme",
          caption: "Set reminder hours, quiet hours, and an environment theme.",
          screen: "assets/projects/hydro-settings_reminders.png",
        },
        {
          time: 46.2,
          title: "Browse the history",
          caption: "Each day lists its drinks, ready to edit or delete.",
          screen: "assets/projects/hydro-history.png",
        },
        {
          time: 50,
          title: "Edit an entry",
          caption: "Correct a saved drink's amount, type, or time.",
          screen: "assets/projects/hydro-edit_entry.png",
        },
      ],
    },
  },
  bulk: {
    title: "Bulk Buying Companion",
    number: "02",
    label: "Group project / Mobile development",
    description:
      "A Flutter app for sharing bulk purchases within a campus or dorm community.",
    idea: "Students join a local hub, browse shared purchases on its Split Board, and reserve a portion of a bulk item. Each deal shows what one student pays, what quantity they receive, and where to collect it. The organiser records payment and pickup progress for the group.",
    contribution:
      "I co-developed the app and implemented whole-centavo cost splitting, reservation and cancellation logic, and database rules that restrict deal access to hub members. I added deal statuses derived from payment, purchase, and pickup records, on-device receipt scanning, and rules-based recommendations. I also improved form validation, loading and error feedback, screen lifecycle guards, and the efficiency of profile-history queries.",
    stack:
      "Flutter, Dart, Provider, and Supabase (PostgreSQL, Authentication, and Realtime).",
    learning:
      "Costs are split in whole centavos, with any rounding surplus shown explicitly. Reservation operations and access rules are enforced in the database. The receipt parser reassembles visual rows so a total stays paired with its price, excludes cash and change from price selection, and leaves extracted fields editable. Deal recommendations use category preferences and past activity, with a reason shown for each suggestion.",
    footer:
      "The video is a screen recording of the real app, compiled for the web and running on its built-in sample hubs, deals, and student account. Receipt recognition and live Supabase operations are described from the implementation.",
    video: {
      src: "assets/videos/bulk-buying.mp4",
      hevc: "assets/videos/bulk-buying.hevc.mp4",
      hevcCodecs: "hvc1.1.6.L120.90",
      poster: "assets/videos/bulk-buying.jpg",
      duration: 42.3,
      chapters: [
        {
          time: 0,
          title: "Find a hub",
          caption:
            "Browse nearby campus and dorm communities, sorted by distance.",
          screen: "assets/projects/bulk-live-01.jpg",
        },
        {
          time: 5.2,
          title: "Join the hub",
          caption:
            "Colon Street Hub becomes my current hub, and its count goes from 31 to 32 members.",
          screen: "assets/projects/bulk-live-02.jpg",
        },
        {
          time: 8.5,
          title: "Browse the Split Board",
          caption:
            "Compare per-share prices, quantities, open slots, and deadlines.",
          screen: "assets/projects/bulk-live-03.jpg",
        },
        {
          time: 16.6,
          title: "Review a deal",
          caption:
            "Check my share, the organiser, who has joined, and where to pick it up.",
          screen: "assets/projects/bulk-live-04.jpg",
        },
        {
          time: 24.3,
          title: "Reserve a share",
          caption:
            "The slot is mine: open slots drop to 2 of 5, and the amount I owe appears.",
          screen: "assets/projects/bulk-live-05.jpg",
        },
        {
          time: 28.5,
          title: "Back on the board",
          caption:
            "The rice sack now shows 2 of 5 slots open for everyone in the hub.",
          screen: "assets/projects/bulk-live-06.jpg",
        },
        {
          time: 32.6,
          title: "Post a deal",
          caption:
            "Describe a new bulk buy, or scan a receipt to fill the form in.",
          screen: "assets/projects/bulk-live-07.jpg",
        },
      ],
    },
  },
  maistra: {
    title: "mAIstra",
    number: "03",
    label: "Group / Thesis project",
    description:
      "A group thesis project for reviewing handwritten C programming assignments.",
    idea: "mAIstra helps teachers work with programming answers submitted on paper. Optical character recognition (OCR) converts a photograph of handwritten C code into editable text. The teacher compares the result with the paper, corrects it, and saves the verified program before running it against the assigned question’s test cases.",
    contribution:
      "I developed the Python/FastAPI OCR service, fine-tuned an existing recognizer using handwritten C samples, and added image preprocessing and code cleanup. I also implemented reading-order rules for code that continues in a page’s right margin or a second column. My Angular contributions included multiple-program tabs, extraction-status feedback, and safeguards for unsaved edits.",
    stack:
      "Team system: Angular and TypeScript, Flutter and Dart, Python and FastAPI, OpenCV, Supabase, and Judge0.",
    learning:
      "The service prepares the document image, extracts text, and arranges the detected lines into code. Continuation rules associate side-written code with the main text when the layout is clear; uncertain cases retain their order for teacher review. Original extraction and teacher corrections are kept separate. Mobile capture and Judge0 grading were developed by my teammates.",
    footer:
      "The video is a screen recording of the team’s real web interface, run through its own test harness with my handwritten test page from our end-to-end run and the text our OCR pipeline produced for it. The questions are demo data, and no Judge0 grading run is shown.",
    video: {
      src: "assets/videos/maistra.mp4",
      hevc: "assets/videos/maistra.hevc.mp4",
      hevcCodecs: "hvc1.1.6.L120.90",
      poster: "assets/videos/maistra.jpg",
      duration: 53.0,
      chapters: [
        {
          time: 0,
          title: "Prepare questions",
          caption:
            "Each question in the bank carries its own test cases, such as square(4) → 16.",
          screen: "assets/projects/maistra-real-question-bank.png",
        },
        {
          time: 5.1,
          title: "Find the paper",
          caption:
            "My 11 handwritten test pages from our end-to-end run, already read by OCR.",
          screen: "assets/projects/maistra-real-submissions.png",
        },
        {
          time: 9.7,
          title: "Check the question",
          caption:
            "The page was submitted to Q1, which supplies its grading test cases.",
          screen: "assets/projects/maistra-real-details.png",
        },
        {
          time: 13.9,
          title: "Read the OCR text",
          caption:
            "OCR read square as sgvare and * as #, and put both questions in one program.",
          screen: "assets/projects/maistra-real-review-ocr.png",
        },
        {
          time: 19.3,
          title: "Fix the misreads",
          caption:
            "Correct each misread character, then keep only Question 1 in this tab.",
          screen: "assets/projects/maistra-real-program1-corrected.png",
        },
        {
          time: 31.5,
          title: "Split out Question 2",
          caption:
            "Add a tab for the second program, paste its code, and link it to Q2.",
          screen: "assets/projects/maistra-real-program2-picker.png",
        },
        {
          time: 39.5,
          title: "Save both programs",
          caption:
            "One save stores every program on the paper, each with its own question.",
          screen: "assets/projects/maistra-real-program2-saved.png",
        },
        {
          time: 44,
          title: "Ready to grade",
          caption:
            "Each program is graded on Judge0 against its own question's test cases.",
          screen: "assets/projects/maistra-real-grading.png",
        },
      ],
    },
  },
  mesh: {
    title: "MeshUnwarp",
    number: "05",
    label: "Graphics and visual computing",
    description:
      "A desktop workflow for document image correction, cleanup, and text extraction, with primary and fallback OCR engines.",
    idea: "MeshUnwarp brings document-photo correction and text extraction into a desktop interface. It is intended for images that need straightening or cleanup before their text can be read and saved.",
    contribution:
      "I built the Python/Tkinter interface and connected the image-processing stages with OpenCV, existing document-correction models, and OCR engines. My work focused on the application workflow and integration of these components.",
    stack: "Python, Tkinter, and OpenCV.",
    learning:
      "After the user selects an image and an output mode, the application preprocesses the image and checks its quality. Document-correction models address page distortion and lighting, followed by cleanup and text extraction. A fallback OCR engine is available when the primary engine is unavailable or returns too little text. Processing runs in a separate worker to keep the interface responsive.",
    footer:
      "The video shows the real desktop app running my test papers through the full pipeline: quality gate, DocTr dewarping, cleanup, and Apple Vision OCR. The papers were cropped from my documentation figures, so the photos are low resolution.",
    video: {
      src: "assets/videos/meshunwarp.mp4",
      hevc: "assets/videos/meshunwarp.hevc.mp4",
      hevcCodecs: "hvc1.1.6.L120.90",
      poster: "assets/videos/meshunwarp.jpg",
      duration: 37.4,
      chapters: [
        {
          time: 0,
          title: "Open the desktop app",
          caption:
            "My test papers are listed by problem type: crumpled, low ink, warped, wet, and more.",
          screen: "assets/projects/meshunwarp-run-startup.jpg",
        },
        {
          time: 4.5,
          title: "Choose a paper",
          caption:
            "A curved journal page loads into the input pane, with Clean Scan as the output mode.",
          screen: "assets/projects/meshunwarp-run-selected.jpg",
        },
        {
          time: 8.5,
          title: "Run the pipeline",
          caption:
            "Preprocessing comes first, then a quality gate that scores the photo before the heavy work.",
          screen: "assets/projects/meshunwarp-run-running.jpg",
        },
        {
          time: 12.9,
          title: "Get a clean scan",
          caption:
            "DocTr's GeoTr flattens the page, and cleanup turns it into crisp black and white.",
          screen: "assets/projects/meshunwarp-run-clean-scan.jpg",
        },
        {
          time: 18.3,
          title: "Recover faint ink",
          caption:
            "Ink Recovery keeps lighter strokes, for pages with faded or thin writing.",
          screen: "assets/projects/meshunwarp-run-ink-recovery.jpg",
        },
        {
          time: 23,
          title: "Try a harder page",
          caption:
            "A creased, glossy flyer scores MEDIUM (67%) at the gate and moves on to dewarping.",
          screen: "assets/projects/meshunwarp-run-flyer-running.jpg",
        },
        {
          time: 27.3,
          title: "Clean the flyer",
          caption:
            "The output is a high-contrast scan, ready for text recognition.",
          screen: "assets/projects/meshunwarp-run-flyer-clean.jpg",
        },
        {
          time: 32.4,
          title: "Read the text",
          caption:
            "Apple Vision reads the cleaned page back as editable text, ready to save.",
          screen: "assets/projects/meshunwarp-run-flyer-text.jpg",
        },
      ],
    },
    workflow: [
      [
        "Choose a paper",
        "Select a document image from the categorized sidebar and choose Clean Scan or Ink Recovery.",
      ],
      [
        "Prepare and inspect",
        "Preprocessing and a quality gate assess the input before the dewarping stage.",
      ],
      [
        "Dewarp and clean",
        "Pretrained document-correction models handle geometry and illumination; postprocessing cleans the output.",
      ],
      [
        "Read and export",
        "Text extraction uses a primary OCR engine with a fallback when necessary. The UI exposes output, text, and save controls.",
      ],
    ],
  },
  openear: {
    title: "OpenEar",
    number: "04",
    label: "Software Engineering 1 / Team of three",
    description:
      "A Flutter study application with speech input, spoken feedback, notes, quizzes, and progress tracking.",
    idea: "OpenEar is a study app designed to help visually impaired learners access notes through spoken feedback and voice input. Users can upload study material, listen to saved notes, answer quizzes, and review their progress.",
    contribution:
      "I co-developed OpenEar in a team of three. My work included the welcome and login screens, speech feedback and recognition improvements, voice and tap navigation, the basic quiz flow, and question lookup within saved notes.",
    stack:
      "Flutter, Dart, Firebase Authentication, Firestore, text-to-speech, and speech recognition.",
    learning:
      "Users select or upload study material, then choose to listen to notes or take a quiz. Speech output provides feedback while voice and touch controls support navigation. Note-based question lookup uses keyword and approximate-text matching against saved material.",
    footer:
      "The video animates the app’s interfaces with sample notes and quiz content. It does not demonstrate a live voice or authentication session.",
    video: {
      src: "assets/videos/openear.mp4",
      hevc: "assets/videos/openear.hevc.mp4",
      hevcCodecs: "hvc1.1.6.L120.90",
      poster: "assets/videos/openear.jpg",
      duration: 22.3,
      chapters: [
        {
          time: 0,
          title: "Sign in",
          caption:
            "The welcome screen keeps controls large and works with screen readers.",
          screen: "assets/projects/openear-login.png",
        },
        {
          time: 3.8,
          title: "Choose an activity",
          caption:
            "Large buttons lead to notes, quizzes, progress, and uploads.",
          screen: "assets/projects/openear-home.png",
        },
        {
          time: 7.5,
          title: "Listen to notes",
          caption: "Pick a saved note and play it aloud with text-to-speech.",
          screen: "assets/projects/openear-notes.png",
        },
        {
          time: 11.4,
          title: "Start a quiz",
          caption: "Quizzes are built from the same saved notes.",
          screen: "assets/projects/openear-home.png",
        },
        {
          time: 14.1,
          title: "Select quiz material",
          caption: "The app checks which notes have enough content to quiz on.",
          screen: "assets/projects/openear-quiz-select.png",
        },
        {
          time: 17.9,
          title: "Answer a question",
          caption: "Tap an answer, or say it with the voice-input button.",
          screen: "assets/projects/openear-quiz.png",
        },
      ],
    },
  },
  ml: {
    title: "Student Grade Prediction",
    number: "06",
    label: "Academic machine learning study",
    description:
      "A study of how machine-learning models classify student pass/fail outcomes.",
    idea: "This coursework study compares Naive Bayes, a neural network, and Random Forest using 1,000 student records. It examines how available student information, data splits, and an uneven balance of passing and failing examples affect the predictions.",
    contribution:
      "Built the preprocessing and evaluation pipeline, removed score columns that would leak the target, compared Naive Bayes, a multilayer perceptron, and Random Forest, and documented the limits of the results.",
    stack:
      "Python, pandas, scikit-learn, imbalanced-learn, Matplotlib, and Seaborn.",
    learning:
      "Score columns that reveal the answer were removed before model training. The models were compared using accuracy, precision, recall, and confusion matrices. The neural network achieved 87.5% accuracy against an 86.5% majority-class baseline, but identified few failing students. This made the limitations visible despite the high overall accuracy.",
    footer:
      "Academic model comparison completed June–July 2026. The video walks through the evaluated charts and their limitations.",
    video: {
      src: "assets/videos/student-grade.mp4",
      hevc: "assets/videos/student-grade.hevc.mp4",
      hevcCodecs: "hvc1.1.6.L120.90",
      poster: "assets/videos/student-grade.jpg",
      duration: 28.1,
      chapters: [
        {
          time: 0,
          title: "Ask the question",
          caption:
            "Can background information alone predict whether a student passes math?",
        },
        {
          time: 3.9,
          title: "Remove the leaks",
          caption:
            "Pass means a math score of 50 or more, so all three score columns were dropped.",
        },
        {
          time: 8.5,
          title: "Check the features",
          caption:
            "The five remaining features relate only weakly to passing; lunch is strongest, at 0.29.",
          screen: "assets/projects/student-grade-feature-ranking.png",
        },
        {
          time: 12.8,
          title: "Compare three models",
          caption:
            "Naive Bayes, a neural network, and Random Forest, tested on a 20% hold-out split.",
          screen: "assets/projects/student-grade-model-comparison.png",
        },
        {
          time: 18.3,
          title: "Look past accuracy",
          caption:
            "Every model predicts Pass for almost everyone: at most 3 of 27 failing students are found.",
          screen: "assets/projects/student-grade-confusion-matrices.png",
        },
        {
          time: 23.1,
          title: "Document the limits",
          caption:
            "High accuracy hid a weak model, so the report states what the results cannot show.",
        },
      ],
    },
  },
  fitsync: {
    title: "FitSync",
    number: "D1",
    label: "Mobile interface design / Figma",
    description:
      "A Figma design for a mobile fitness experience, covering workouts, meals, and account screens.",
    idea: "FitSync organizes workout progress and meal planning into a mobile interface. The design includes exercise categories, progress charts, meal details, and account and profile screens.",
    contribution:
      "Designed the FitSync screens and navigation flows, including workout statistics, meal planning, profile settings, and account screens.",
    stack: "Figma, reusable interface components, and connected screen flows.",
    learning:
      "The meal-planning flow connects the meal overview to breakfast, lunch, and dinner details. Workout screens present exercise categories and progress, while account screens cover sign-in and profile settings. The Figma file contains the screen connections and interactive design.",
    footer:
      "Figma interface design. The video moves through selected screens and the meal-planning connections; it does not yet cover the complete prototype.",
    designUrl:
      "https://www.figma.com/design/jcp04A19r5D7r49CBZZpa7/FitSync-by-Nombrado?node-id=0-1",
    linkLabel: "View Figma design",
    video: {
      src: "assets/videos/fitsync.mp4",
      hevc: "assets/videos/fitsync.hevc.mp4",
      hevcCodecs: "hvc1.1.6.L120.90",
      poster: "assets/videos/fitsync.jpg",
      duration: 16.6,
      chapters: [
        {
          time: 0,
          title: "Map the prototype",
          caption:
            "Figma links connect the meal plan to its breakfast, lunch, and dinner screens.",
          screen: "assets/projects/fitsync-connections.png",
        },
        {
          time: 4.7,
          title: "Plan meals",
          caption:
            "Meal cards sit beside a water reminder and protein tracking.",
          screen: "assets/projects/fitsync-meal-plan.png",
        },
        {
          time: 8.6,
          title: "Open a meal",
          caption:
            "Each meal expands into ingredients, prep time, servings, and calories.",
          screen: "assets/projects/fitsync-breakfast.png",
        },
        {
          time: 12.6,
          title: "Track workouts",
          caption:
            "The cardio screen pairs a progress ring with a performance chart.",
          screen: "assets/projects/fitsync-cardio.png",
        },
      ],
    },
  },
};

document.querySelectorAll("[data-project]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const project = projectTemplates[trigger.dataset.project];
    if (!project) return;
    lastProjectTrigger = trigger;
    dialog.querySelector("#dialog-title").textContent = project.title;
    dialog.querySelector(".dialog-number").textContent = project.number;
    dialog.querySelector(".dialog-top .eyebrow").textContent =
      project.label ?? "Project details";
    dialog.querySelector("#dialog-description").textContent =
      project.description ?? "Project overview.";
    dialog.querySelector("#dialog-idea").textContent = project.idea;
    dialog.querySelector("#dialog-contribution").textContent =
      project.contribution ?? "";
    dialog.querySelector("#dialog-stack").textContent = project.stack ?? "";
    dialog.querySelector("#dialog-learning").textContent =
      project.learning ?? "";
    dialog.querySelector(".dialog-footer").textContent = project.footer ?? "";
    renderProjectVideo(project);
    renderProjectWorkflow(project);
    const designLink = dialog.querySelector("#dialog-design-link");
    designLink.hidden = !project.designUrl;
    if (project.designUrl) designLink.href = project.designUrl;
    else designLink.removeAttribute("href");

    dialog.showModal();
    dialog.querySelector(".dialog-close").focus({ preventScroll: true });
  });
});

dialog
  .querySelector(".dialog-close")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    dialog.close();
});
dialog.addEventListener("close", () => {
  if (lastProjectTrigger?.isConnected)
    lastProjectTrigger.focus({ preventScroll: true });
});

const certificateDialog = document.querySelector("#certificate-dialog");
let lastCertificateTrigger = null;
document.querySelectorAll("[data-certificate]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    lastCertificateTrigger = trigger;
    certificateDialog.showModal();
    certificateDialog
      .querySelector(".certificate-close")
      .focus({ preventScroll: true });
  });
});
certificateDialog
  .querySelector(".certificate-close")
  .addEventListener("click", () => certificateDialog.close());
certificateDialog.addEventListener("click", (event) => {
  if (event.target !== certificateDialog) return;
  const bounds = certificateDialog.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    certificateDialog.close();
});
certificateDialog.addEventListener("close", () => {
  if (lastCertificateTrigger?.isConnected)
    lastCertificateTrigger.focus({ preventScroll: true });
});

const videoIcons = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.6v12.8a.8.8 0 0 0 1.2.7l10-6.4a.8.8 0 0 0 0-1.4l-10-6.4A.8.8 0 0 0 8 5.6z"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>',
  fullscreen:
    '<svg class="outline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
};

function formatVideoTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

let disposeProjectVideo = () => {};
// A close event can arrive after the dialog was already reopened for another
// project; only stop the video when the dialog is really closed.
dialog.addEventListener("close", () => {
  if (!dialog.open) disposeProjectVideo();
});
function renderProjectWorkflow(project) {
  const container = dialog.querySelector("#dialog-workflow");
  container.replaceChildren();
  container.hidden = !project.workflow?.length;
  if (!project.workflow?.length) return;
  const heading = document.createElement("h3");
  heading.textContent = "How it works";
  const list = document.createElement("ol");
  for (const [title, explanation] of project.workflow) {
    const item = document.createElement("li");
    const label = document.createElement("strong");
    label.textContent = title;
    const text = document.createElement("p");
    text.textContent = explanation;
    item.append(label, text);
    list.append(item);
  }
  container.append(heading, list);
}
function renderProjectVideo(project) {
  disposeProjectVideo();
  const gallery = dialog.querySelector("#dialog-gallery");
  gallery.replaceChildren();
  gallery.hidden = !project.video;
  if (!project.video) return;
  const { src, hevc, hevcCodecs, poster, duration, chapters } = project.video;
  const events = new AbortController();
  const on = (target, type, handler) =>
    target.addEventListener(type, handler, { signal: events.signal });
  gallery.setAttribute("aria-label", `${project.title} video walkthrough`);

  const heading = document.createElement("div");
  heading.className = "video-heading";
  const title = document.createElement("h3");
  title.textContent = "Video walkthrough";
  const length = document.createElement("span");
  length.className = "video-length";
  length.textContent = `${chapters.length} steps · ${formatVideoTime(duration)}`;
  heading.append(title, length);

  const stage = document.createElement("div");
  stage.className = "video-stage";
  const video = document.createElement("video");
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.poster = poster;
  // Safari 27 played the H.264 files without drawing a picture, so HEVC comes
  // first; browsers that can't play HEVC skip it and use the H.264 file.
  const sources = hevc
    ? [
        [hevc, `video/mp4; codecs="${hevcCodecs}"`],
        [src, "video/mp4"],
      ]
    : [[src, "video/mp4"]];
  for (const [url, type] of sources) {
    const source = document.createElement("source");
    source.src = url;
    source.type = type;
    video.append(source);
  }
  video.tabIndex = 0;
  video.setAttribute(
    "aria-label",
    `${project.title} walkthrough video without sound. The current step is described below the video.`,
  );
  const overlay = document.createElement("button");
  overlay.type = "button";
  overlay.className = "video-overlay";
  overlay.innerHTML = videoIcons.play;
  overlay.setAttribute("aria-label", "Play video");
  stage.append(video, overlay);

  const controls = document.createElement("div");
  controls.className = "video-controls";
  const play = document.createElement("button");
  play.type = "button";
  play.className = "video-button";
  const rail = document.createElement("div");
  rail.className = "video-chapters";
  rail.setAttribute("role", "group");
  rail.setAttribute("aria-label", "Video steps");
  const segments = chapters.map((chapter, index) => {
    const start = index ? chapter.time : 0;
    const end = chapters[index + 1]?.time ?? duration;
    const button = document.createElement("button");
    button.type = "button";
    button.style.flex = `${end - start} 1 0`;
    button.title = chapter.title;
    button.setAttribute("aria-label", `Step ${index + 1}: ${chapter.title}`);
    const bar = document.createElement("span");
    bar.className = "video-chapter-bar";
    const fill = document.createElement("span");
    fill.className = "video-chapter-fill";
    bar.append(fill);
    button.append(bar);
    rail.append(button);
    return { start, end, button, fill };
  });
  const time = document.createElement("span");
  time.className = "video-time";
  const fullscreen = document.createElement("button");
  fullscreen.type = "button";
  fullscreen.className = "video-button";
  fullscreen.innerHTML = videoIcons.fullscreen;
  fullscreen.setAttribute("aria-label", "Watch full screen");
  controls.append(play, rail, time, fullscreen);

  const caption = document.createElement("p");
  caption.className = "video-caption";
  caption.setAttribute("aria-atomic", "true");
  const stepTitle = document.createElement("strong");
  const stepText = document.createElement("span");
  caption.append(stepTitle, " ", stepText);
  const footer = document.createElement("div");
  footer.className = "video-footer";
  const status = document.createElement("p");
  status.className = "video-status";
  const screenLink = document.createElement("a");
  screenLink.className = "text-link";
  screenLink.textContent = "View this screen full size";
  screenLink.target = "_blank";
  screenLink.rel = "noopener noreferrer";
  footer.append(status, screenLink);
  const hint = document.createElement("p");
  hint.className = "video-hint";
  hint.textContent =
    "Select a step to jump to it. With the video focused, Space plays or pauses and the arrow keys move between steps.";
  gallery.append(heading, stage, controls, caption, footer, hint);

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let current = -1;
  let frame = 0;
  function chapterAt(seconds) {
    let index = 0;
    segments.forEach((segment, i) => {
      if (seconds + 0.35 >= segment.start) index = i;
    });
    return index;
  }
  function showChapter(index) {
    if (index === current) return;
    current = index;
    const chapter = chapters[index];
    stepTitle.textContent = `${String(index + 1).padStart(2, "0")} · ${chapter.title}`;
    stepText.textContent = chapter.caption;
    status.textContent = `Step ${index + 1} of ${chapters.length}`;
    segments.forEach((segment, i) =>
      segment.button.setAttribute(
        "aria-current",
        i === index ? "step" : "false",
      ),
    );
    screenLink.hidden = !chapter.screen;
    if (chapter.screen) {
      screenLink.href = chapter.screen;
      screenLink.setAttribute(
        "aria-label",
        `View ${project.title} step ${index + 1} screen full size in a new tab`,
      );
    } else screenLink.removeAttribute("href");
  }
  function paint() {
    const seconds = video.currentTime;
    segments.forEach((segment) => {
      const progress =
        (seconds - segment.start) / (segment.end - segment.start);
      segment.fill.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
    });
    const label = `${formatVideoTime(seconds)} / ${formatVideoTime(video.duration || duration)}`;
    if (time.textContent !== label) time.textContent = label;
    showChapter(chapterAt(seconds));
  }
  function tick() {
    paint();
    frame = video.paused ? 0 : window.requestAnimationFrame(tick);
  }
  function syncButtons() {
    const paused = video.paused;
    play.innerHTML = paused ? videoIcons.play : videoIcons.pause;
    play.setAttribute("aria-label", paused ? "Play video" : "Pause video");
    overlay.hidden = !paused;
    caption.setAttribute("aria-live", paused ? "polite" : "off");
  }
  function start() {
    video.play().catch(syncButtons);
  }
  function toggle() {
    if (video.paused) start();
    else video.pause();
  }
  function seek(index) {
    const target = (index + segments.length) % segments.length;
    video.currentTime = target ? chapters[target].time : 0;
    paint();
  }

  on(video, "play", () => {
    syncButtons();
    window.cancelAnimationFrame(frame);
    tick();
  });
  on(video, "pause", () => {
    syncButtons();
    paint();
  });
  on(video, "seeked", paint);
  on(video, "loadedmetadata", paint);
  on(video, "click", toggle);
  on(overlay, "click", () => {
    start();
    video.focus({ preventScroll: true });
  });
  on(play, "click", toggle);
  segments.forEach((segment, index) =>
    on(segment.button, "click", () => seek(index)),
  );
  on(fullscreen, "click", () => {
    if (video.requestFullscreen) video.requestFullscreen().catch(() => {});
    else video.webkitEnterFullscreen?.();
  });
  function showLoadError() {
    stepTitle.textContent = "The video could not be loaded.";
    stepText.textContent = "";
    const link = document.createElement("a");
    link.className = "text-link";
    link.href = src;
    link.textContent = "Open the video file";
    stepText.append(link);
  }
  on(video, "error", () => {
    // A device can report HEVC support and still fail to decode it: drop the
    // HEVC source and continue with the H.264 file from the same point.
    if (hevc && video.currentSrc.endsWith(hevc) && video.children.length > 1) {
      const resumeAt = video.currentTime;
      video.firstElementChild.remove();
      video.addEventListener(
        "loadedmetadata",
        () => {
          video.currentTime = resumeAt;
          if (!motion.matches) start();
        },
        { once: true, signal: events.signal },
      );
      video.load();
      return;
    }
    showLoadError();
  });
  // With <source> elements, a failed download is reported on the last one.
  on(video.lastElementChild, "error", showLoadError);
  on(gallery, "keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === " " && event.target === video) {
      event.preventDefault();
      toggle();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      seek(current + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      seek(current - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      seek(0);
    } else if (event.key === "End") {
      event.preventDefault();
      seek(segments.length - 1);
    }
  });
  disposeProjectVideo = () => {
    events.abort();
    window.cancelAnimationFrame(frame);
    video.pause();
    video.replaceChildren();
    video.removeAttribute("src");
    video.load();
  };
  syncButtons();
  paint();
  // Respect reduced motion: show the first frame and let the viewer press play.
  if (!motion.matches) {
    // Start once the dialog has painted and enough video is buffered, so the
    // opening frames don't stutter while the dialog appears.
    const begin = () =>
      window.requestAnimationFrame(() => window.requestAnimationFrame(start));
    if (video.readyState >= 3) begin();
    else
      video.addEventListener("canplay", begin, {
        once: true,
        signal: events.signal,
      });
  }
}

// The same short entrance can be replayed without reloading the portfolio.
const nameScene = document.querySelector(".hero-name-scene");
const mascotReplay = nameScene?.querySelector(".mascot-track");
mascotReplay?.addEventListener("click", () => {
  nameScene.classList.add("restarting");
  void nameScene.offsetWidth;
  nameScene.classList.remove("restarting");
});
