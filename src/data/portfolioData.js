// Everything about Keenan lives here. Edit this file to change the site's text,
// links and projects; the 3D scene and its panels read from it.

export const person = {
  name: "Keenan Jajeh",
  role: "Full-stack software engineer",
  city: "Chicago",
  photo: "./keenan-hat.jpg",
  photoAlt: "Keenan Jajeh smiling in a black cowboy hat against a blue backdrop",
  pitch:
    "I build web apps end to end, from React front ends to Node, Go and Python services on PostgreSQL. I also build AI into products: LLM scoring, embeddings, and agents that fill out real forms. Give me a problem and I’ll find a way to build it.",
  about: [
    "I’m a software developer from Chicago. Most of what I build sits across the whole stack: a database schema I’ve thought hard about, an API that does what it says, and an interface that feels natural to use. I care about clear code that someone else can maintain.",
    "I use AI tools every day, and the job agent in my group portal is where I’ve pushed LLMs and embeddings furthest.",
    "Outside of work I do photography and videography, build PCs, and look for anything in sports that can be counted. That last one keeps turning into projects.",
  ],
  openTo: "Open to full-stack and software engineering roles, in Chicago or remote.",
};

export const links = {
  resume: "./Keenan-Jajeh-Resume.pdf",
  github: "https://github.com/keenan34",
  linkedin: "https://www.linkedin.com/in/keenan-jajeh",
  email: "Kjajeh@depaul.edu",
};

export const projects = [
  {
    name: "Ripple",
    pitch: "Alternate sports history: change one moment and see how the seasons after it play out.",
    links: [{ label: "playripple.app", href: "https://playripple.app" }],
    points: [
      "A deterministic simulation engine with a structured world-state model. A seed always gives the same result, so every result has a link you can share.",
      "Creator Studio, where people build scenarios on a visual decision graph and publish them as immutable versions.",
    ],
    stack: ["Next.js", "React", "TypeScript", "Supabase", "PostgreSQL"],
  },
  {
    name: "IFNBL league platform",
    pitch: "The site for a rec basketball league: standings, schedules and player stats across three seasons.",
    links: [
      { label: "ifnbl.com", href: "https://ifnbl.com" },
      { label: "Source", href: "https://github.com/keenan34/ifn-league-platform" },
    ],
    points: [
      "A Node ETL pipeline loads per-game box-score JSON into a normalized PostgreSQL schema. It reconciles mismatched keys, fixes malformed values and logs every correction.",
      "Live updates over Socket.IO, with JWT-protected admin endpoints and CORS scoped to each environment.",
    ],
    stack: ["React", "Node.js", "Express", "PostgreSQL", "Socket.IO"],
  },
  {
    name: "BlitzWatch",
    pitch: "Predicts whether an NFL defense will blitz, using only what's known before the snap.",
    links: [{ label: "Source", href: "https://github.com/keenan34/BlitzWatch" }],
    points: [
      "A LightGBM model trained on 121,340 pass plays (2018–2023) from nflverse, graded on a held-out 2023 season: 0.685 ROC-AUC against a 0.659 baseline.",
      "Rebuilt after finding the first version leaked post-snap data into its features. The honest model scores lower and actually predicts.",
      "A Flask API serves predictions to a React and Tailwind front end, with 19 tests covering the label logic, a leakage guard and the API.",
    ],
    stack: ["Python", "LightGBM", "Pandas", "Flask", "React", "Docker"],
  },
  {
    name: "Private group portal",
    pitch:
      "A members-only site for my friend group that I designed, built and run myself. One login, one Go server and one PostgreSQL database sit behind seven apps.",
    links: [],
    points: [
      "Each app is its own React bundle. The Go binary embeds them all and sends each link to the app that owns it.",
      "Shared pieces across apps: sessions, roles and admin approval, profile photos, notifications, comment threads.",
      "CI runs the tests, builds a Docker image and deploys to Cloud Run. Migrations run against Cloud SQL.",
    ],
    apps: [
      { name: "Jobs", text: "An AI job agent. It pulls listings from 360+ Greenhouse, Lever and Ashby boards every 15 minutes, ranks them for each member with Voyage embeddings and Claude scoring, drafts answers to application questions, and fills out the forms from a Chrome/Firefox extension. Nothing is submitted without the member’s say-so." },
      { name: "Fantasy", text: "The league hub: power rankings, weekly matchups, team pages, NFL and NBA player pages, surveys, and a live draft room. A deal-or-no-deal game sets the draft order." },
      { name: "Game analyzer", text: "Pregame NFL breakdowns built from nflverse play-by-play (EPA, success rate, explosive plays), depth charts, injuries and National Weather Service forecasts, with every source tracked." },
      { name: "Movie Club", text: "Members take turns picking the movie: OMDb search, a nomination pool, 0–10 ratings and reviews, watch tracking, admin controls, and a self-hosted Stremio client." },
      { name: "Workouts", text: "Plans, today’s session with set tracking, history, and bodyweight charts. Mobile-first with accessible charts." },
      { name: "Games", text: "Tier lists with a shared feed, crosswords, a Street View geography guesser, quizzes with leaderboards, and a graph editor." },
      { name: "Timeline & Yearbook", text: "The group’s history from 1997 to now, with member-submitted events, photos and comment threads, plus a page-turning yearbook." },
    ],
    stack: ["Go", "PostgreSQL", "React", "TypeScript", "Docker", "GCP Cloud Run", "Claude API", "Voyage"],
  },
];

export const experience = [
  {
    org: "Stars Tech Group",
    title: "Software Engineer",
    when: "Jan 2025 – present",
    points: [
      "Built and ran the registration and payment platform for a national convention of 40,000+ attendees, covering online and on-site sign-up.",
      "Kept the AWS-hosted checkout up through a three-day, high-traffic event.",
      "Built REST APIs and third-party integrations on PostgreSQL schemas designed for high-volume attendee and transaction data, and integrated PCI-DSS-compliant payment gateways.",
    ],
  },
];

export const education = {
  org: "DePaul University",
  title: "B.S. Computer Science",
  when: "2021 – 2024",
  note: "Dean’s List, Jarvis College of Computing and Digital Media. Coursework in distributed systems, AI, data analysis and software engineering.",
};

export const skills = [
  { group: "Languages", items: "TypeScript, JavaScript, Python, Go, Java, SQL, C/C++, Bash" },
  { group: "Front end", items: "React, Next.js, Tailwind, Three.js, D3.js, HTML/CSS" },
  { group: "Back end", items: "Node.js, Express, Go, REST APIs, JWT auth, Socket.IO" },
  { group: "Data", items: "PostgreSQL, MySQL, MongoDB, Supabase, Pandas, NumPy, LightGBM" },
  { group: "Cloud", items: "AWS (EC2, S3, RDS), GCP Cloud Run, Docker, CI/CD, Linux" },
  { group: "AI", items: "LLM integration (Claude API), embeddings and semantic search, AI agents and browser automation, in-browser models (WebLLM)" },
];
