import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.database import SessionLocal
from backend.models import SubscriptionPlan, User

db = SessionLocal()
try:
    print("--- SUBSCRIPTION PLANS ---")
    for p in db.query(SubscriptionPlan).all():
        print(f"ID: {p.id}, Name: {p.name}, Price: {p.price}, Limits: {p.paper_limit}/{p.class_limit}/{p.subject_limit}, Features: {p.features}")
    
    print("\n--- USERS ---")
    for u in db.query(User).all():
        print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}, Plan ID: {u.subscription_plan_id}, Expires: {u.subscription_expires_at}")
finally:
    db.close()
