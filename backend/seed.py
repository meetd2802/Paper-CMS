from sqlalchemy.orm import Session
import sys

try:
    from backend.database import SessionLocal, engine, Base
    from backend.models import User, Standard
    from backend.auth import get_password_hash
except ImportError:
    from database import SessionLocal, engine, Base
    from models import User, Standard
    from auth import get_password_hash

def seed_db():
    db = SessionLocal()
    try:
        # Create tables
        Base.metadata.create_all(bind=engine)
        print("Tables verified/created.")
        
        # 1. Seed default superadmin if not exists
        admin_email = "admin@cms.com"
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            hashed_pw = get_password_hash("admin123")
            admin_user = User(
                email=admin_email,
                password_hash=hashed_pw,
                role="superadmin"
            )
            db.add(admin_user)
            db.commit()
            print(f"Created default admin user: {admin_email} / admin123")
        else:
            print("Admin user already exists.")
            
        # 2. Seed standards 1 to 12
        for i in range(1, 13):
            std_name = f"Class {i}"
            std = db.query(Standard).filter(Standard.name == std_name).first()
            if not std:
                std = Standard(name=std_name)
                db.add(std)
                print(f"Added standard: {std_name}")
                
        db.commit()
        print("Database seeded successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}", file=sys.stderr)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
