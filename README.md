# Question Paper CMS

This project contains the codebase for the Question Paper Content Management System (CMS), featuring a Python backend (FastAPI) and a React frontend (Vite).

## Directory Structure
- `/frontend`: React frontend application
- `/backend`: Python backend application

---

## 🚀 Server Deployment & Update Commands (Ubuntu / AWS EC2)

Always upload your code changes using FileZilla to their respective directories on the server first, then run these commands via SSH.

### 1. Frontend Updates (Vite React)

Whenever you make frontend changes:
1. **Locally** build the frontend project:
   ```bash
   npm run build
   ```
2. Using FileZilla, upload the contents of your local `dist` folder to `/home/ubuntu/project/Paper-CMS/frontend/dist` (overwrite existing files).
3. If you changed Nginx configuration, restart Nginx on the server:
   ```bash
   sudo systemctl restart nginx
   ```

### 2. Backend Updates (Python FastAPI)

Whenever you change Python backend code:
1. Using FileZilla, upload the changed files to `/home/ubuntu/project/Paper-CMS/backend`.
2. Connect to the server via SSH and navigate to the backend directory:
   ```bash
   cd ~/project/Paper-CMS/backend
   ```
3. **If you added new packages to `requirements.txt`**, run:
   ```bash
   source venv/bin/activate
   pip install -r requirements.txt
   deactivate
   ```
4. Restart the backend process with PM2:
   ```bash
   pm2 restart paper-cms-backend
   ```

#### PM2 Troubleshooting & Helper Commands:
- **Check server status/running processes:**
  ```bash
  pm2 status
  ```
- **View backend real-time logs:**
  ```bash
  pm2 logs paper-cms-backend
  ```
- **If the process is not found / needs to be started fresh:**
  ```bash
  pm2 start "venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000" --name "paper-cms-backend"
  pm2 save
  ```

---

## 💻 Local Development Setup

To run the application locally on your machine:

### 1. Run Backend
```bash
cd backend
# Create virtual environment (first time)
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
# Install requirements
pip install -r requirements.txt
# Run FastAPI Server
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Run Frontend
```bash
cd frontend
# Install packages (first time)
npm install
# Run dev server
npm run dev
```
