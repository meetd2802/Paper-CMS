#!/bin/bash

# Ensure our local node/conda paths are loaded
if [ -f ~/.zshrc ]; then
    source ~/.zshrc
fi

# Print startup information
echo "==================================================="
# Determine the absolute directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "Launching FastAPI Backend..."
cd backend
python3 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo "Launching React Frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "==================================================="
echo "Backend running at: http://127.0.0.1:8000"
echo "Frontend running at: http://localhost:3000"
echo "Press Ctrl+C to stop both servers."
echo "==================================================="

# Keep script running and clean up background processes on exit
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
