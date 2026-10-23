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
    idea: "Hydro-Tracker is a mobile app that helps users build a healthy drinking habit. Users log each drink, follow their progress toward a personal daily goal, and review their history through daily, weekly, and monthly statistics.",
    contribution:
      "I developed this app on my own, from the interface to the backend connection. I designed and built the Flutter screens and the logic that calculates daily intake, progress, and reminders. I also set up user accounts and cloud storage with Supabase, added local caching, made past entries editable, and integrated a weather service and an AI hydration coach.",
    stack:
      "Flutter and Dart for the app, Supabase for accounts and cloud storage, and external APIs for weather information and the AI coach.",
    learning:
      "Each logged drink immediately updates the daily total and the progress ring. Users can correct earlier entries from their history and change their daily goal and reminder schedule in settings. Weather information can be used to adjust the goal, and the AI coach sends its requests through a backend function instead of directly from the app.",
    footer:
      "About the video: it animates real screens captured from the app with a demo account, covering registration, logging, statistics, settings, and history.",
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
    idea: "Bulk Buying Companion helps students in the same campus or dorm community share the cost of bulk purchases. Students join a nearby hub, browse shared deals on its Split Board, and reserve a portion of an item, such as one share of a 25 kg rice sack. Each deal shows how much a student pays, what quantity they receive, and where to pick it up.",
    contribution:
      "I co-developed this app with my group and handled much of its core logic. I implemented the cost-splitting calculation, which divides prices in whole centavos and shows any rounding difference openly, along with the reservation and cancellation logic. I wrote the database rules that limit each deal to members of its hub, added deal statuses based on payment, purchase, and pickup records, built on-device receipt scanning, and created a rules-based recommendation feature. I also improved form validation, loading and error messages, and the speed of profile-history queries.",
    stack:
      "Flutter and Dart for the app, Provider for state management, and Supabase (PostgreSQL database, authentication, and realtime updates) for the backend.",
    learning:
      "Reservations and access rules are enforced in the database, so the number of open slots stays accurate for every member. The receipt scanner reads a photo of a receipt, keeps each item paired with its price, ignores cash and change amounts, and fills in a new deal that the organiser can still edit. Recommendations are based on a student’s preferred categories and past activity, and each one explains why it was suggested.",
    footer:
      "About the video: it is a screen recording of the real app, built for the web and running on its built-in sample hubs, deals, and student account. Receipt scanning and live database operations are not shown.",
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
    idea: "mAIstra is our group thesis: a system that helps teachers check C programming answers written by hand on paper. It uses optical character recognition (OCR) to turn a photo of a student’s handwritten code into editable text. The teacher compares the result with the paper, corrects any errors, and then runs the verified program against the question’s test cases for grading.",
    contribution:
      "I was responsible for the OCR part of the system. I developed the Python and FastAPI service that reads handwritten code, fine-tuned an existing text-recognition model with handwritten C samples, and added image preprocessing and code clean-up to improve accuracy. I also wrote reading-order rules so code continued in the page margin or a second column is placed correctly. In the Angular web app, I added tabs for papers with more than one program, status messages during extraction, and safeguards against losing unsaved edits. My teammates developed the mobile capture app and the Judge0 grading.",
    stack:
      "Our team used Angular and TypeScript for the web app, Flutter and Dart for the mobile app, Python, FastAPI, and OpenCV for the OCR service, Supabase for data and storage, and Judge0 for running and grading code.",
    learning:
      "The OCR service first prepares the photo, then extracts the text and arranges the detected lines into code. When the page layout is clear, code written on the side is joined to the main program; when it is not, the original order is kept so the teacher can decide. The original extraction and the teacher’s corrections are stored separately, so every change can be traced.",
    footer:
      "About the video: it is a screen recording of our real web app, using my own handwritten test page from our end-to-end testing and the text our OCR produced for it. The grading is a live run on our team’s Judge0 server; the questions are demo data.",
    video: {
      src: "assets/videos/maistra.mp4",
      hevc: "assets/videos/maistra.hevc.mp4",
      hevcCodecs: "hvc1.1.6.L120.90",
      poster: "assets/videos/maistra.jpg",
      duration: 78.5,
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
          time: 9.6,
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
          time: 39.4,
          title: "Save both programs",
          caption:
            "One save stores every program on the paper, each with its own question.",
          screen: "assets/projects/maistra-real-program2-saved.png",
        },
        {
          time: 44,
          title: "Run a sample",
          caption:
            "Run Sample compiles the saved code on our Judge0 server over Tailscale. It prints 16, as expected.",
          screen: "assets/projects/maistra-real-grading.png",
        },
        {
          time: 52.3,
          title: "Grade against test cases",
          caption:
            "Submit Code runs every Q1 test case on Judge0: square(4) gives 16 and square(-3) gives 9. Score: 100%.",
        },
        {
          time: 61.9,
          title: "Grade Program 2",
          caption:
            "The cube program runs against Q2's own test cases: 8 and -27, both accepted.",
        },
        {
          time: 73.6,
          title: "Paper graded",
          caption: "Both programs on the handwritten page show 2/2 passed.",
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
    idea: "MeshUnwarp is a desktop application that prepares photos of documents for text extraction. It straightens curved or creased pages, corrects lighting and background, and then reads the text so it can be saved.",
    contribution:
      "I built the Python and Tkinter desktop interface and connected the processing stages into one complete workflow: OpenCV preprocessing, existing document-correction models for flattening pages, and the OCR engines. My focus was the application workflow and making these separate components work together reliably.",
    stack:
      "Python and Tkinter for the desktop app, OpenCV for image processing, DocTr for page flattening, and Apple Vision with a fallback engine for OCR.",
    learning:
      "The user selects a photo and an output mode. The app preprocesses the image and checks its quality, then corrects page distortion and lighting, cleans up the result, and extracts the text. If the main OCR engine is unavailable or returns too little text, a fallback engine is used. Processing runs in a separate worker so the interface stays responsive.",
    footer:
      "About the video: it shows the real app processing my own test papers through the full pipeline. The papers were cropped from my documentation figures, so the photos are low resolution.",
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
    idea: "OpenEar is a study app designed for visually impaired learners. It reads study notes aloud, lets users answer quizzes by voice or touch, and tracks their progress, so they can study without depending on the screen.",
    contribution:
      "I co-developed OpenEar in a team of three. I built the welcome and login screens, improved the app’s spoken feedback and speech recognition, and added navigation that works with both voice commands and taps. I also implemented the basic quiz flow and a feature that looks up answers to questions within the user’s saved notes.",
    stack:
      "Flutter and Dart for the app, Firebase Authentication and Firestore for accounts and data, and text-to-speech and speech recognition for voice interaction.",
    learning:
      "Users upload or select study material, then choose to listen to their notes or take a quiz. The app speaks feedback for each action, and users can navigate by voice or touch. When a user asks a question about their notes, the app searches the saved material using keyword and approximate text matching.",
    footer:
      "About the video: it animates the app’s screens with sample notes and quiz content. It does not show a live voice or sign-in session.",
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
    idea: "This coursework study tested whether a student’s background information alone, such as gender, lunch type, parental education, and test preparation, can predict whether they pass math. It compares three machine-learning models on a dataset of 1,000 student records.",
    contribution:
      "I built the data preprocessing and model evaluation pipeline. I removed the three score columns because they would give away the answer and make the results misleading. I then trained and compared Naive Bayes, a neural network (multilayer perceptron), and Random Forest, and documented the limits of the findings.",
    stack:
      "Python with pandas for data handling, scikit-learn and imbalanced-learn for modelling, and Matplotlib and Seaborn for charts.",
    learning:
      "The models were compared using accuracy, precision, recall, and confusion matrices. The neural network reached 87.5% accuracy, only slightly better than the 86.5% from always predicting “pass”, and it identified very few failing students. The study shows why accuracy alone can be misleading when one outcome is much more common than the other.",
    footer:
      "About the video: it walks through the charts from the evaluated notebook, completed June–July 2026, and the limits they reveal.",
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
    idea: "FitSync is a mobile app design that brings workout tracking and meal planning together in one place. It covers exercise categories, progress charts, meal details, and account and profile screens.",
    contribution:
      "I designed the FitSync interface in Figma, including the screen layouts and the navigation between them. The design covers workout statistics, meal planning, profile settings, and the sign-in and account screens, connected into an interactive prototype.",
    stack:
      "Figma, using reusable components and prototype links between screens.",
    learning:
      "In the prototype, the meal overview links to the breakfast, lunch, and dinner details. Workout screens present exercise categories and progress, while the account screens cover sign-in and profile settings.",
    footer:
      "About the video: it moves through selected screens and the meal-planning connections. It does not yet cover the complete prototype.",
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
