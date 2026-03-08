# Community Guardian — Project Rules

## Tech Stack
- **Backend**: Python 3.11+, FastAPI, Pydantic, OpenAI SDK (for UF NaviGator)
- **Frontend**: React 18 + Vite, Tailwind CSS
- **Tests**: pytest, pytest-asyncio, unittest.mock

## Build & Run
```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev

# Tests
cd backend && pytest -v
```

## Coding Standards
- Python: snake_case, type hints on all function signatures
- React: functional components with hooks, JSX
- All API responses use Pydantic models
- raw_text field is IMMUTABLE after creation (forensic integrity)
- AI analysis runs on create only — never re-analyze

## Environment Variables
Copy `.env.example` to `.env` and fill in your NaviGator API key.

## Architecture
Three-tier AI fallback: mistral-small-3.1 → llama-3.1-8b-instruct → regex deterministic engine.
Fake news detection overlays verification status after categorization.
