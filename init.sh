#!/bin/bash
set -e

echo "=== Community Guardian Setup ==="

# Backend setup
echo "[1/4] Setting up Python virtual environment..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt --quiet

# Copy .env if not exists
if [ ! -f .env ]; then
  echo "[2/4] Creating .env from template..."
  cp ../.env.example .env
  echo "  -> Edit backend/.env with your NaviGator API key"
else
  echo "[2/4] .env already exists, skipping..."
fi

cd ..

# Frontend setup
echo "[3/4] Installing frontend dependencies..."
cd frontend
npm install --silent

echo "[4/4] Setup complete!"
echo ""
echo "To start the backend:"
echo "  cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000"
echo ""
echo "To start the frontend:"
echo "  cd frontend && npm run dev"
echo ""
echo "To run tests:"
echo "  cd backend && source venv/bin/activate && pytest -v"
