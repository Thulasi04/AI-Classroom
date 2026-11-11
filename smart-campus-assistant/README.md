# Smart Campus Assistant

A full-stack, production-oriented **AI-Powered Smart Campus Assistant** built with **React (Vite + Tailwind CSS)**, **FastAPI**, **SQLite (SQLAlchemy)**, **ChromaDB**, **HuggingFace Sentence Transformers**, **LangChain**, **LangGraph**, **Groq API**, and **LangSmith**.

---

## Architecture Overview

- **Frontend (`frontend/`)**: React.js + Vite + Tailwind CSS + React Router DOM + Axios + Lucide React + Recharts. Dark university SaaS dashboard with emerald green accents, responsive sidebar/header, protected student & admin routes, SSE streaming AI chatbot, interactive charts, and document upload progress tracking.
- **Backend (`backend/`)**: FastAPI modular REST API with Pydantic v2 schemas, SQLAlchemy ORM (13+ relational models), bcrypt password hashing, JWT access tokens, HttpOnly refresh cookie rotation, sliding-window rate limiting, file magic-byte validation, prompt-injection & PII guardrails, and automatic Swagger UI at `http://localhost:8000/docs`.
- **Multi-Agent AI Workflow (`backend/app/agents/`)**:
  - **Supervisor Agent** (`supervisor.py`): Runs security/PII guardrails, classifies intent, and conditionally routes queries in LangGraph.
  - **Academic RAG Agent** (`academic_agent.py`): Performs semantic similarity retrieval against ChromaDB (`sentence-transformers/all-MiniLM-L6-v2`) with document citations.
  - **Student Information Agent** (`student_agent.py`): Queries authenticated student records (attendance, internal marks, courses, exam timetable) from SQLite.
  - **Placement Agent** (`placement_agent.py`): Evaluates real-time company eligibility, packages, deadlines, and application status from SQLite.
  - **Campus Support Agent** (`campus_support_agent.py`): Answers campus facilities queries (library, hostel, transport, canteen, medical) and tracks personal support tickets.
  - **Multimodal Agent** (`multimodal_agent.py`): Processes uploaded PDF, TXT, MD, CSV, and image (`PNG`, `JPG`, `JPEG`, `WEBP`) files securely and chains into RAG when policy context is needed.

---

## Project Structure

```text
smart-campus-assistant/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   ├── dashboard/
│   │   │   ├── chatbot/
│   │   │   └── charts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── app/
│   │   ├── api/routers/
│   │   ├── agents/
│   │   ├── rag/
│   │   ├── core/
│   │   ├── database/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── main.py
│   ├── tests/
│   ├── uploads/
│   ├── chroma_db/
│   ├── .env.example
│   └── requirements.txt
├── README.md
└── .gitignore
```

---

## Setup & Execution

### 1. Backend Setup

```bash
cd smart-campus-assistant/backend
python3.13 -m venv venv   # or python -m venv venv (Python 3.11-3.13 recommended)
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and set your keys:
- `GROQ_API_KEY`: Your Groq API key for LLM & Vision synthesis (if unset, agents still execute LangGraph + ChromaDB + SQLite retrieval and display verified retrieved records directly without fabricating LLM text).
- `LANGSMITH_API_KEY`: Your LangSmith key (with `LANGSMITH_TRACING=true`) for LangGraph tracing.
- `JWT_SECRET_KEY`: A strong random secret key.

Start the backend server:

```bash
uvicorn app.main:app --reload
```

- Backend API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd smart-campus-assistant/frontend
npm install
cp .env.example .env
npm run dev
```

- Frontend URL: `http://localhost:5173`

---

## Seeded Demo Credentials

On first startup, SQLite and ChromaDB are automatically seeded with sample university data:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Student** | `arjun.mehta@campus.edu` | `Student@1234` |
| **Student 2** | `priya.nair@campus.edu` | `Student@1234` |
| **Admin** | `admin@campus.edu` | `Admin@1234` |

---

## Running Tests

### Backend API & Multi-Agent Tests

```bash
cd smart-campus-assistant/backend
source venv/bin/activate
pytest -v
```

### Frontend Production Build Check

```bash
cd smart-campus-assistant/frontend
npm run build
```

