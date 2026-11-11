# 🎓 Smart Campus Assistant

An AI-powered Smart Campus Assistant designed to help students access campus-related information through an intelligent conversational interface.

The system uses Large Language Models (LLMs), Retrieval-Augmented Generation (RAG), and AI agents to provide relevant answers to student queries about academic and campus services.

## 🚀 Features

- **AI-Powered Chatbot:** Answers student queries using natural language.
- **Campus Information:** Provides information about fees, attendance, examinations, placements, hostel facilities, college policies, and schedules.
- **Document Understanding:** Supports PDF and image uploads to extract and retrieve relevant information.
- **Retrieval-Augmented Generation (RAG):** Retrieves relevant information from available campus documents before generating responses.
- **AI Agent Workflow:** Uses agent-based reasoning and tools to handle different types of student queries.
- **Conversation Memory:** Maintains conversational context for more relevant responses.
- **Authentication:** JWT-based authentication for secure access.
- **Database Management:** Stores student and support-related information using SQLite.
- **AI Monitoring:** LangSmith integration for tracing and monitoring AI workflows.
- **Safety Guardrails:** Helps ensure responses remain relevant to campus-related queries.

## 🛠️ Technology Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- Axios

### Backend
- Python
- FastAPI
- Pydantic
- SQLAlchemy

### AI & Machine Learning
- Groq LLM
- LangChain
- LangGraph
- ReAct Agents
- Retrieval-Augmented Generation (RAG)

### Database & Storage
- SQLite
- ChromaDB (Vector Database)

### Monitoring & Security
- LangSmith
- JWT Authentication

## 🏗️ System Architecture

```text
                 STUDENT
                    |
                    v
           REACT FRONTEND
                    |
                    v
             FASTAPI BACKEND
                    |
                    v
             AI AGENT SYSTEM
                    |
             LANGGRAPH WORKFLOW
                    |
          +---------+---------+
          |         |         |
          v         v         v
       GROQ LLM   RAG       TOOLS
                  |
                  v
              CHROMADB
                  |
                  v
          CAMPUS DOCUMENTS

                    |
                    v
             SQLITE DATABASE
                    |
                    v
          STUDENT / SUPPORT DATA
```

## 📂 Project Structure

```text
smart-campus-assistant/
│
├── backend/
│   ├── app/
│   ├── tests/
│   ├── uploads/
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── .env.example
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.example
│
├── README.md
└── .gitignore
```

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Thulasi04/AI-Classroom.git
```

```bash
cd AI-Classroom/smart-campus-assistant
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the environment on macOS/Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file using `.env.example` as a template.

Configure the required environment variables.

Start the FastAPI server (adjust the module path if your application entry point differs):

```bash
uvicorn app.main:app --reload
```

Backend API:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

### 3. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file and configure:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Start the frontend development server:

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## 🔐 Environment Variables

### Backend (.env)

Configure the following variables:

```env
GROQ_API_KEY=
LANGSMITH_API_KEY=
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=smart-campus-assistant
DATABASE_URL=sqlite:///./smart_campus.db
JWT_SECRET_KEY=
```

**Important:** Never upload your actual `.env` file, API keys, or JWT secrets to GitHub. Keep sensitive values private and use `.env.example` with placeholder values.

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## 🔄 Application Workflow

1. A student opens the Smart Campus Assistant frontend.
2. The student submits a question through the chatbot interface.
3. The frontend sends the request to the FastAPI backend.
4. The AI agent identifies the query and determines the appropriate workflow.
5. For document-related questions, RAG retrieves relevant information from the vector database.
6. The retrieved context is passed to the LLM for response generation.
7. The generated answer is returned to the frontend.
8. Conversation context and relevant application data are maintained for future interactions.

## 🎯 Project Objective

The primary objective of this project is to simplify access to campus information by providing students with an intelligent, centralized, and conversational AI-based support system.

Instead of searching through multiple documents or contacting different departments, students can interact with a single AI assistant to obtain relevant campus information.

## 🔮 Future Enhancements

- Voice-based interaction.
- Multilingual chatbot support.
- Integration with live college management systems.
- Personalized student assistance.
- Mobile application integration.
- Advanced analytics for student queries.

## 👩‍💻 Author

**Thulasi**

B.Tech – Artificial Intelligence and Data Science

Coimbatore Institute of Technology

---

⭐ If you find this project interesting, feel free to explore the repository!# AI-Classroom
# AI-Classroom
