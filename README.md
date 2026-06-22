# ARS — AI Resume Screening Platform

> **Enterprise-grade recruitment intelligence powered by Google Gemini 2.5 Flash, ChromaDB RAG, real-time notifications, and a full-stack Next.js + FastAPI architecture.**

ARS automates the entire candidate pipeline — from bulk resume ingestion and AI-powered parsing, to fraud detection, smart scoring, interview question generation, and a conversational recruiter copilot — so your hiring team can focus on people, not paperwork.

---

## 🌟 Features

| Feature | Description |
|---|---|
| **Bulk Resume Intake** | Drag-and-drop upload of PDF, DOCX, TXT, PNG, JPG resumes. Scanned images processed via Tesseract OCR |
| **AI Resume Parser** | Gemini 2.5 Flash extracts name, email, phone, skills, experience, education, certifications, projects, and languages |
| **Job Description Module** | Create job postings; Gemini auto-extracts required/preferred skills, experience years, and keywords in the background |
| **AI Matching Engine** | Candidate suitability scores (0–100) using configurable weighted dimensions: Skills, Experience, Education, Certifications, Projects, Keywords, Semantic similarity |
| **AI Fraud Detection** | Flags overlapping job timelines, employment gaps, and keyword stuffing with a computed "hype risk" score |
| **Interview Question Generator** | Tailors technical and behavioral interview questions to each candidate's profile gaps per job |
| **AI Recruiter Copilot (RAG)** | Conversational chatbot with persistent session memory; semantic resume searches powered by ChromaDB + Sentence Transformers |
| **Hiring Analytics** | Pipeline funnel, skill distribution, score histograms, experience-level breakdowns; CSV export |
| **Real-Time Notifications** | Event-driven alerts (login, profile updates, resume parsed, copilot response) via Firebase Firestore + SQL fallback |
| **Role-Based Access Control** | Three roles: `Admin`, `HR Manager`, `Recruiter` — each with scoped permissions |

---

## 🏗️ Architecture

```
ARS/
├── backend/
│   ├── Dockerfile
│   └── app/
│       ├── api/               # REST endpoints
│       │   ├── auth.py        # Login, signup, JWT, profile
│       │   ├── upload.py      # Resume file ingestion
│       │   ├── jobs.py        # Job description CRUD + AI extraction
│       │   ├── candidates.py  # Candidate profiles, scores, questions, resume download
│       │   ├── copilot.py     # RAG chat + session history
│       │   ├── analytics.py   # Hiring metrics and CSV export
│       │   ├── notifications.py # Notification CRUD + broadcast
│       │   └── settings.py    # Scoring weights + org config
│       ├── core/
│       │   ├── config.py      # Environment settings (Pydantic)
│       │   ├── database.py    # SQLAlchemy engine + session
│       │   └── security.py    # bcrypt hashing, JWT creation/validation
│       ├── models/            # SQLAlchemy ORM models
│       ├── schemas/           # Pydantic request/response schemas
│       ├── services/
│       │   ├── gemini_service.py   # Google Gemini 2.5 Flash integration
│       │   ├── rag_service.py      # ChromaDB + Sentence Transformers RAG
│       │   └── firebase_service.py # Firestore notification push
│       ├── tasks/
│       │   └── resume_tasks.py     # Background parse → score → index pipeline
│       └── main.py            # FastAPI app entry + DB seeder
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Landing page
│       │   ├── auth/              # Login & signup
│       │   └── dashboard/
│       │       ├── page.tsx       # Overview dashboard
│       │       ├── upload/        # Resume intake
│       │       ├── jobs/          # Job management
│       │       ├── candidates/    # Candidate profiles & scoring
│       │       ├── copilot/       # AI recruiter chat
│       │       ├── analytics/     # Charts and reports
│       │       ├── notifications/ # Notification history
│       │       └── settings/      # Platform configuration
│       ├── store/useStore.ts      # Zustand global state
│       └── utils/
│           ├── api.ts             # Axios client with JWT interceptor
│           ├── firebase.ts        # Firebase app initialization
│           └── notifications.ts   # Notification helpers
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## ⚙️ Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) + Uvicorn
- SQLAlchemy ORM — SQLite (dev) / PostgreSQL (production)
- Google Gemini 2.5 Flash (`google-generativeai`)
- ChromaDB + Sentence Transformers (RAG vector store)
- Firebase Admin SDK (Firestore push notifications)
- Celery + Redis (optional async task queue)
- Tesseract OCR + Pillow (scanned image parsing)
- PyPDF2 / pdfplumber / python-docx (document parsing)
- JWT authentication via `python-jose` + `passlib[bcrypt]`

**Frontend**
- [Next.js 15](https://nextjs.org/) App Router (Turbopack)
- TypeScript + Tailwind CSS
- Zustand (global state)
- Axios (API client)
- Firebase JS SDK (real-time Firestore listener)
- Recharts (analytics charts)
- Lucide React (icons)
- react-dropzone (drag-and-drop upload)

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| npm | 9+ |
| Tesseract OCR | 5.x (for image resume support) |
| Google Gemini API Key | [Get one free →](https://aistudio.google.com/) |

---

### Option A — Local Development (Recommended for first run)

#### 1. Clone the repository

```bash
git clone https://github.com/yuva-1237/ARS.git
cd ARS
```

#### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
SECRET_KEY=any-long-random-string-for-jwt-signing
DATABASE_URL=sqlite:///./sql_app.db
CHROMA_DB_DIR=data/chromadb
UPLOAD_DIR=data/resumes
USE_CELERY=False
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

> 💡 **No Gemini key?** The system degrades gracefully — resumes will still be ingested and stored, but AI parsing/scoring will return placeholder values.

#### 3. Start the backend

```bash
# Create and activate a Python virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install all Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
python -m uvicorn backend.app.main:app --port 8000 --reload
```

The API will be live at **http://127.0.0.1:8000**
Interactive API docs: **http://127.0.0.1:8000/docs**

#### 4. Start the frontend

Open a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

The web app will be live at **http://localhost:3000**

---

### Option B — Docker Compose (Full production stack)

Spins up PostgreSQL, Redis, Celery worker, FastAPI backend, and Next.js frontend together.

```bash
# 1. Set your Gemini API key in .env
cp .env.example .env
# Edit .env → set GEMINI_API_KEY=...

# 2. Build and start all services
docker-compose up --build

# 3. To run in background
docker-compose up -d --build
```

| Service | URL |
|---|---|
| Frontend Dashboard | http://localhost:3000 |
| Backend REST API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |

To stop: `docker-compose down`

---

## 🔑 Default Login Credentials

The database is automatically seeded on first startup with three accounts:

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@ars.com` | `adminpass` |
| **HR Manager** | `hr@ars.com` | `hrpass` |
| **Recruiter** | `recruiter@ars.com` | `recruiterpass` |

> These accounts let you explore all features immediately. Change passwords in **Settings → Profile** before deploying to production.

---

## 📖 How to Use

### 1. Login

1. Open **http://localhost:3000**
2. Click **Sign In** and enter any of the demo credentials above
3. You'll land on the **Overview Dashboard**

---

### 2. Create a Job Description

1. Go to **Jobs** in the left sidebar
2. Click **+ New Job**
3. Fill in the job title, department, location, and a detailed job description
4. Click **Save Job**
5. In the background, Gemini automatically extracts required skills, preferred skills, experience years, education requirements, and keywords from your description
6. The job becomes available to link resumes to

---

### 3. Upload Resumes

1. Go to **Resume Intake** in the sidebar
2. *(Optional)* Select one or more jobs to link the resumes to — this triggers immediate scoring
3. Drag-and-drop resume files onto the upload zone, or click to browse
   - Supported formats: **PDF, DOCX, TXT, PNG, JPG, JPEG**
   - Scanned images are parsed via Tesseract OCR automatically
4. Click **Process Resume Queue**
5. Watch the status update from `uploading → processing → parsed` in real time

Behind the scenes, each resume goes through:
- Text extraction (PDF/DOCX/OCR)
- Gemini AI structured parsing
- AI fraud/anomaly detection
- Semantic vector indexing in ChromaDB
- Scoring against all linked jobs
- Interview question generation

---

### 4. Review Candidates

1. Go to **Candidates** in the sidebar
2. Use the **search bar** to filter by name, skill, or email
3. Click any candidate row to open their **full profile**

The candidate profile shows:
- **Parsed resume data** — contact info, skills, experience timeline, education, certifications, projects
- **AI Score Breakdown** — a radar/bar chart showing scores across Skills, Experience, Education, Certifications, Projects, Keywords, and Semantic dimensions
- **Fraud Risk Indicator** — AI hype risk score with explanation of any detected anomalies
- **Job Match Scores** — switch between jobs to see the candidate's score and ranking for each
- **Interview Questions** — AI-generated technical and behavioral questions tailored to this candidate's profile gaps

---

### 5. Use the AI Recruiter Copilot

1. Go to **Copilot** in the sidebar
2. Type a natural-language question into the chat, for example:
   - *"Show me the top 5 candidates for the Frontend Engineer role"*
   - *"Which candidates have React and TypeScript experience?"*
   - *"Find me Python developers with more than 3 years of experience"*
   - *"Who has the highest fraud risk score?"*
3. The Copilot uses RAG (Retrieval-Augmented Generation) to search the vectorized resume database and answer with real candidate data
4. Chat history is persistent per session — you can follow up with clarifying questions
5. Optionally filter by a **specific job** using the job selector in the top navigation bar

---

### 6. View Hiring Analytics

1. Go to **Analytics** in the sidebar
2. Use the **job filter** in the top bar to scope metrics to a specific role, or view platform-wide data

Available charts:
- **Score Distribution** — histogram of candidate overall scores
- **Skills Gap Analysis** — bar chart of most common vs. missing skills
- **Experience Level Breakdown** — pie chart of junior/mid/senior distribution
- **Pipeline Funnel** — stages from uploaded → parsed → scored → reviewed
- **Interview Readiness** — average readiness scores across roles

Click **Export CSV Report** to download a spreadsheet of all candidate data.

---

### 7. Configure Scoring Weights

1. Go to **Settings** in the sidebar *(available to Recruiters, HR Managers, and Admins)*
2. Adjust the **AI Scoring Weights** sliders for each dimension:
   - Skills Match
   - Experience Years
   - Education Level
   - Certifications
   - Projects
   - Keyword Overlap
   - Semantic Similarity
3. Click **Save Settings**
4. All existing candidate scores are **automatically recalculated** with the new weights and rankings are updated

---

### 8. Notifications

Real-time notifications appear in the **bell icon** (top-right). Events that trigger notifications:
- New account created
- Successful login
- Profile or password updated
- Resume parsed and scored
- AI Copilot response completed
- Admin system announcements

Click any notification to dismiss it, or use **Mark All Read** to clear all.

---

## 🔌 REST API Reference

All endpoints are prefixed with `/api/v1`. Interactive docs at **http://localhost:8000/docs**.

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/auth/signup` | Register a new user | Public |
| `POST` | `/auth/login/json` | Login with email + password → JWT | Public |
| `GET` | `/auth/me` | Get current user profile | Any |
| `PUT` | `/auth/me` | Update profile / password | Any |
| `POST` | `/upload/` | Upload resume files (multipart) | Any |
| `GET` | `/jobs/` | List all active jobs | Any |
| `POST` | `/jobs/` | Create a new job description | Recruiter+ |
| `PUT` | `/jobs/{job_id}` | Update a job | Recruiter+ |
| `DELETE` | `/jobs/{job_id}` | Archive a job | Recruiter+ |
| `POST` | `/jobs/{job_id}/recalculate` | Re-score all candidates vs. this job | Recruiter+ |
| `GET` | `/candidates/` | List candidates (paginated, filterable) | Any |
| `GET` | `/candidates/{id}` | Get full candidate profile | Any |
| `GET` | `/candidates/{id}/scores` | Get per-job score breakdown | Any |
| `GET` | `/candidates/{id}/questions/{job_id}` | Get AI interview questions | Any |
| `GET` | `/candidates/{id}/resume` | Download original resume file | Any |
| `POST` | `/copilot/chat` | RAG chat query | Any |
| `GET` | `/copilot/history/{session_id}` | Get chat session history | Any |
| `DELETE` | `/copilot/history/{session_id}` | Clear session chat history | Any |
| `GET` | `/analytics/` | Get hiring metrics | Any |
| `GET` | `/analytics/export` | Export CSV report | Any |
| `GET` | `/notifications/` | List user notifications | Any |
| `POST` | `/notifications/create` | Create a personal notification | Any |
| `POST` | `/notifications/mark-all-read` | Mark all as read | Any |
| `POST` | `/notifications/{id}/read` | Mark one as read | Any |
| `DELETE` | `/notifications/{id}` | Delete a notification | Any |
| `POST` | `/notifications/announcement` | Broadcast to all users | Admin |
| `GET` | `/settings/` | Get platform settings | Any |
| `PUT` | `/settings/` | Update scoring weights | Recruiter+ |

---

## 🔒 Role Permissions

| Action | Recruiter | HR Manager | Admin |
|---|---|---|---|
| View candidates & jobs | ✅ | ✅ | ✅ |
| Upload resumes | ✅ | ✅ | ✅ |
| Create/edit jobs | ✅ | ✅ | ✅ |
| Update scoring weights | ✅ | ✅ | ✅ |
| Use Copilot chat | ✅ | ✅ | ✅ |
| Broadcast announcements | ❌ | ❌ | ✅ |

---

## 🐞 Troubleshooting

**Backend won't start**
- Ensure your virtual environment is activated: `venv\Scripts\activate`
- Check that all packages installed: `pip install -r requirements.txt`
- Verify your `.env` file exists and `GEMINI_API_KEY` is set

**Tesseract OCR not found (image resumes fail)**
- Install Tesseract: https://github.com/tesseract-ocr/tesseract
- Windows: Add `C:\Program Files\Tesseract-OCR` to your PATH

**Frontend can't connect to backend (Network Error)**
- Ensure the backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1` in your `.env`
- CORS is enabled by default for `localhost:3000`

**Gemini API errors**
- Verify your `GEMINI_API_KEY` is valid at https://aistudio.google.com/
- The system falls back to a rule-based parser if Gemini is unavailable

**Notifications not loading**
- Firebase is optional. If unconfigured, notifications are loaded from the SQL database automatically
- Check the browser console — `Firestore real-time listener unavailable, using REST fallback` is a normal info message, not an error

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/yuva-1237">yuva-1237</a>
</div>
