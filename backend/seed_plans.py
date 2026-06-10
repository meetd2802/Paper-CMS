import sys
import os

try:
    from database import SessionLocal, engine, Base
    from models import SubscriptionPlan
except ImportError:
    # Add parent to sys.path if needed
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from backend.database import SessionLocal, engine, Base
    from backend.models import SubscriptionPlan

def seed_exact_plans():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Clear existing plans
        db.query(SubscriptionPlan).delete()
        db.commit()
        print("Cleared existing subscription plans.")

        exact_plans = [
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

        for p_data in exact_plans:
            plan = SubscriptionPlan(**p_data)
            db.add(plan)
        
        db.commit()
        print("Successfully seeded exact subscription plans:")
        for p in db.query(SubscriptionPlan).all():
            print(f"- {p.name} (ID: {p.id}, Price: {p.price})")
            
    except Exception as e:
        print(f"Error seeding plans: {e}", file=sys.stderr)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_exact_plans()
