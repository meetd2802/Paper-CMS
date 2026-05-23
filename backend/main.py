from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

try:
    from backend.database import engine, Base
    from backend.config import UPLOAD_DIR
    from backend.routers import auth, standards, papers, questions, uploads, teachers, subjects
except ImportError:
    from database import engine, Base
    from config import UPLOAD_DIR
    from routers import auth, standards, papers, questions, uploads, teachers, subjects

# Create DB tables on startup
Base.metadata.create_all(bind=engine)

# Auto-migrate: check if sub_questions exists in questions table
from sqlalchemy import text
try:
    with engine.begin() as connection:
        result = connection.execute(text("SHOW COLUMNS FROM questions LIKE 'sub_questions'"))
        if not result.fetchone():
            connection.execute(text("ALTER TABLE questions ADD COLUMN sub_questions JSON NULL;"))
            print("Successfully added sub_questions column to questions table.")
except Exception as e:
    print("Migration check note (sub_questions):", e)

app = FastAPI(
    title="Question Paper CMS API",
    description="Backend service for generating school question papers",
    version="1.0.0"
)

# Configure CORS so our React frontend can query the APIs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory statically to serve logos and images
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Register routers
app.include_router(auth.router)
app.include_router(standards.router)
app.include_router(papers.router)
app.include_router(questions.router)
app.include_router(uploads.router)
app.include_router(teachers.router)
app.include_router(subjects.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to Question Paper CMS API. Interactive documentation is at /docs."
    }
