from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

load_dotenv()

try:
    from backend.database import engine, Base
    from backend.config import UPLOAD_DIR
    from backend.routers import auth, standards, papers, questions, uploads, teachers, subjects, ai, subscriptions
except ImportError:
    from database import engine, Base
    from config import UPLOAD_DIR
    from routers import auth, standards, papers, questions, uploads, teachers, subjects, ai, subscriptions

# Create DB tables on startup
Base.metadata.create_all(bind=engine)

# Auto-migrate: check and apply missing columns/indexes
from sqlalchemy import text
def run_migrations(engine):
    with engine.begin() as connection:
        is_sqlite = engine.dialect.name == "sqlite"
        
        for column, col_type in [("is_active", "BOOLEAN NOT NULL DEFAULT 1"), ("boards", "JSON NULL"), ("subscription_plan_id", "INT NULL"), ("subscription_expires_at", "DATETIME NULL")]:
            try:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {column} {col_type};"))
                print(f"Added column {column} to users table")
            except Exception:
                pass

        # Make sure all existing users are set to active (unblocked) by default
        try:
            connection.execute(text("UPDATE users SET is_active = 1 WHERE is_active IS NULL or is_active = 0;"))
            print("Set existing users to active")
        except Exception:
            pass
                
        # 2. standards table
        for column, col_type in [("board", "VARCHAR(50) NOT NULL DEFAULT 'CBSE'"), ("user_id", "INT NULL")]:
            try:
                connection.execute(text(f"ALTER TABLE standards ADD COLUMN {column} {col_type};"))
                print(f"Added column {column} to standards table")
            except Exception:
                pass
                
        # 3. subjects table
        for column, col_type in [("board", "VARCHAR(50) NOT NULL DEFAULT 'CBSE'"), ("user_id", "INT NULL")]:
            try:
                connection.execute(text(f"ALTER TABLE subjects ADD COLUMN {column} {col_type};"))
                print(f"Added column {column} to subjects table")
            except Exception:
                pass
                
        # 4. question_papers table
        for column, col_type in [("board", "VARCHAR(50) NOT NULL DEFAULT 'CBSE'")]:
            try:
                connection.execute(text(f"ALTER TABLE question_papers ADD COLUMN {column} {col_type};"))
                print(f"Added column {column} to question_papers table")
            except Exception:
                pass

        # 5. questions table
        try:
            connection.execute(text("ALTER TABLE questions ADD COLUMN sub_questions JSON NULL;"))
            print("Added sub_questions column to questions table")
        except Exception:
            pass
            
        # 6. Drop unique constraints on standards(name) and subjects(name) so they can be duplicated per user
        if not is_sqlite:
            try:
                connection.execute(text("ALTER TABLE standards DROP INDEX name;"))
                print("Dropped unique index name on standards")
            except Exception:
                pass
                
            try:
                connection.execute(text("ALTER TABLE subjects DROP INDEX name;"))
                print("Dropped unique index name on subjects")
            except Exception:
                pass

        # 7. subscription_plans table
        for column, col_type in [("billing_cycle", "VARCHAR(50) NOT NULL DEFAULT 'monthly'")]:
            try:
                connection.execute(text(f"ALTER TABLE subscription_plans ADD COLUMN {column} {col_type};"))
                print(f"Added column {column} to subscription_plans table")
            except Exception:
                pass

try:
    run_migrations(engine)
    
    # Seed default subscription plans
    from backend.database import SessionLocal
    from backend.models import SubscriptionPlan
    db = SessionLocal()
    try:
        default_plans = [
            {
                "name": "Normal",
                "price": 499,
                "billing_cycle": "monthly",
                "paper_limit": 5,
                "class_limit": 3,
                "subject_limit": 5,
                "features": ["branding"]
            },
            {
                "name": "Medium",
                "price": 999,
                "billing_cycle": "monthly",
                "paper_limit": 20,
                "class_limit": 10,
                "subject_limit": 20,
                "features": ["branding", "live_preview", "ai_suggestions"]
            },
            {
                "name": "All Features",
                "price": 23988,
                "billing_cycle": "yearly",
                "paper_limit": 9999,
                "class_limit": 9999,
                "subject_limit": 9999,
                "features": ["branding", "live_preview", "ai_suggestions", "smart_scanner", "voice_typing", "teacher_management"]
            }
        ]
        for plan_data in default_plans:
            existing = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == plan_data["name"]).first()
            if not existing:
                plan = SubscriptionPlan(**plan_data)
                db.add(plan)
        db.commit()
        print("Default subscription plans seeded.")
    except Exception as e:
        print("Error seeding subscription plans:", e)
        db.rollback()
    finally:
        db.close()
except Exception as e:
    print("Migration run note / seed note:", e)

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
app.include_router(subscriptions.router)
app.include_router(standards.router)
app.include_router(papers.router)
app.include_router(questions.router)
app.include_router(uploads.router)
app.include_router(teachers.router)
app.include_router(subjects.router)
app.include_router(ai.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to Question Paper CMS API. Interactive documentation is at /docs."
    }
