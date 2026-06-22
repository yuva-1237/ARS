# ARS — AI Resume Screening System

ARS (AI Resume Screening System) is an enterprise-grade, recruitment intelligence platform. It automates candidate intake, parses resume profiles with Generative AI (Google Gemini), matching candidates to job description parameters, flags resume fraud chronologies, generates structured screening questionnaires, and offers a RAG recruiter copilot chatbot.

---

## 🌟 Core Capabilities
1. **Resume Bulk Intake**: Drag-and-drop ingestion of candidate CVs in PDF, DOCX, TXT, and scanned image formats. Scanned documents are parsed using Tesseract OCR.
2. **AI Resume Parser**: Automatically extracts candidate names, emails, phones, location, skills, projects, certifications, languages, and full professional timelines, storing them in PostgreSQL.
3. **Job Description Module**: Allows recruiters to create job postings. Gemini automatically extracts required/preferred skills, education, experience years, and keywords in the background.
4. **AI Matching Engine**: Computes candidate suitability scores (0-100) using custom-weighted configurations (Skills, Experience, Academic, etc.) and provides a detailed text assessment explanation.
5. **AI Fraud Detection**: Flags chronological anomalies (overlapping full-time roles, huge gaps) and keyword stuffing to compute a candidate hype risk score.
6. **Interview Question Generator**: Tailors technical and behavioral interview questions with ideal guidelines based on individual candidate profile gaps.
7. **AI Recruiter Copilot (RAG)**: Chatbot interface supporting conversational memory and resume semantic searches using ChromaDB and Sentence Transformers.
8. **Recruiting Analytics**: Visual charts summarizing funnel stages, skill distributions, candidate experience levels, and exports CSV spreadsheet reports.

---

## 📂 Project Architecture

```
ARS/
├── backend/
│   ├── Dockerfile
│   └── app/
│       ├── api/               # Router endpoints (auth, upload, jobs, candidates, RAG chat, settings)
│       ├── core/              # Config, Security (direct bcrypt hashing), database engines
│       ├── models/            # SQLAlchemy database models
│       ├── schemas/           # Pydantic data serialization schemas
│       ├── services/          # AI integrations (Gemini, ChromaDB RAG, fallback engines)
│       ├── tasks/             # Background workers (Celery, native async BackgroundTasks)
│       └── main.py            # FastAPI Entrypoint & Database Seeder
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── app/               # Next.js App Router (Landing, Onboarding, Dashboard views)
│   │   ├── store/             # Zustand global states
│   │   └── utils/             # Axios API client gateways
│   └── tailwind.config.ts
├── docker-compose.yml
├── .env.example
└── requirements.txt
```

---

## 🚀 Quickstart Guide

### Option 1: Running with Docker Compose (Recommended)
This runs the entire stack (FastAPI backend, Next.js frontend, PostgreSQL, Redis, and Celery) inside orchestrated Docker containers.

1. **Clone and Navigate**:
   ```bash
   cd ARS
   ```
2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your Gemini API key:
   ```bash
   cp .env.example .env
   ```
   *Note: If no API key is specified, the system automatically falls back to offline mock AI engines to ensure the application remains fully functional for inspection!*
3. **Build and Run**:
   ```bash
   docker-compose up --build
   ```
4. **Access the Applications**:
   * **Frontend Web Dashboard**: [http://localhost:3000](http://localhost:3000)
   * **Backend REST Swagger API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option 2: Running Locally (Development Mode)
You can run the backend and frontend separately on your system.

#### 1. Setup Backend
1. Navigate to the backend directory and set up a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install Python requirements:
   ```bash
   pip install -r requirements.txt
   ```
3. Set your environment variables (or save them inside a `.env` file at the root):
   ```bash
   # If running locally, you can use SQLite fallback out-of-the-box:
   export DATABASE_URL=sqlite:///./sql_app.db
   export GEMINI_API_KEY=your_google_gemini_api_key
   ```
4. Start the FastAPI server:
   ```bash
   python -m uvicorn backend.app.main:app --reload
   ```

#### 2. Setup Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node.js packages:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the web dashboard at [http://localhost:3000](http://localhost:3000).

---

## 🔑 Seeding & Default Credentials
To simplify onboarding, the backend automatically seeds the database with three roles upon initial startup:
* **Admin Account**: `admin@ars.com` (password: `adminpass`)
* **Recruiter Account**: `recruiter@ars.com` (password: `recruiterpass`)
* **HR Manager Account**: `hr@ars.com` (password: `hrpass`)
