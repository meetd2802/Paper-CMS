import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.database import SessionLocal
from backend.models import User, SubscriptionPlan
import datetime

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == "test@gmail.com").first()
    plan = db.query(SubscriptionPlan).first() # gets Normal plan
    
    print(f"Before - User: {user.email}, Plan ID: {user.subscription_plan_id}, Expires: {user.subscription_expires_at}")
    
    if plan:
        user.subscription_plan_id = plan.id
        user.subscription_expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=30)
        db.commit()
        db.refresh(user)
        print(f"After - User: {user.email}, Plan ID: {user.subscription_plan_id}, Expires: {user.subscription_expires_at}")
    else:
        print("No subscription plan found to assign.")
        
except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()
