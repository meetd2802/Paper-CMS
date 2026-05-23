@echo off
title Question Paper CMS Launcher
echo ===================================================
echo   Shivashish World School - Question Paper CMS
echo ===================================================
echo.

REM Check backend dependencies
echo Checking Python Backend dependencies...
cd backend
python -c "import fastapi, uvicorn, sqlalchemy, pymysql, jwt, reportlab, cryptography" 2>nul
if %errorlevel% neq 0 (
    echo Installing backend dependencies...
    pip install -r requirements.txt
) else (
    echo Backend dependencies are already verified.
)
cd ..

REM Check frontend node_modules
echo.
echo Checking React Frontend dependencies...
if not exist "frontend\node_modules\" (
    echo node_modules not found. Installing frontend dependencies (this may take a minute)...
    cd frontend
    call npm install --legacy-peer-deps --no-audit --no-fund
    cd ..
) else (
    echo Frontend dependencies are already verified.
)

echo.
echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start cmd /k "title CMS Backend && cd backend && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo [2/2] Launching React Frontend on http://localhost:5173 ...
start cmd /k "title CMS Frontend && cd frontend && npm run dev"

echo.
echo Both servers are spinning up in separate console windows!
echo - Backend Interactive docs: http://127.0.0.1:8000/docs
echo - Frontend Application: http://localhost:5173
echo.
echo Press any key to close this launcher shell (servers will keep running).
pause > null
