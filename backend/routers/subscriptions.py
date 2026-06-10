from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
import os
import json
import base64
import hashlib
import httpx
from pydantic import BaseModel

try:
    from backend.database import get_db
    from backend.models import User, SubscriptionPlan
    from backend.schemas import SubscriptionPlanCreate, SubscriptionPlanUpdate, SubscriptionPlanOut, UserOut
    from backend.auth import get_current_user
except ImportError:
    from database import get_db
    from models import User, SubscriptionPlan
    from schemas import SubscriptionPlanCreate, SubscriptionPlanUpdate, SubscriptionPlanOut, UserOut
    from auth import get_current_user

router = APIRouter(prefix="/api/subscriptions", tags=["Subscription Management"])

# Helper to check if current user is superadmin
def require_superadmin(current_user: User = Depends(get_current_user)):
    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SuperAdmin can perform subscription administration tasks."
        )
    return current_user

@router.get("/plans", response_model=List[SubscriptionPlanOut])
def get_plans(db: Session = Depends(get_db)):
    return db.query(SubscriptionPlan).all()

@router.post("/plans", response_model=SubscriptionPlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: SubscriptionPlanCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    plan = SubscriptionPlan(
        name=payload.name,
        price=payload.price,
        billing_cycle=payload.billing_cycle or "monthly",
        paper_limit=payload.paper_limit,
        class_limit=payload.class_limit,
        subject_limit=payload.subject_limit,
        features=payload.features or []
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

@router.put("/plans/{plan_id}", response_model=SubscriptionPlanOut)
def update_plan(
    plan_id: int,
    payload: SubscriptionPlanUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(plan, k, v)
        
    db.commit()
    db.refresh(plan)
    return plan

@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    db.delete(plan)
    db.commit()
    return

@router.post("/assign/{user_id}", response_model=UserOut)
def assign_subscription(
    user_id: int,
    plan_id: Optional[int] = None,
    months: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Allow superadmin, or the user themselves (acting as checkout callback simulation)
    if current_user.role != "superadmin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to assign this subscription."
        )
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if plan_id is None:
        # Cancel subscription
        user.subscription_plan_id = None
        user.subscription_expires_at = None
    else:
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Subscription plan not found")
            
        user.subscription_plan_id = plan.id
        
        import calendar
        now = datetime.datetime.now(datetime.timezone.utc)
        year = now.year + (now.month + months - 1) // 12
        month = (now.month + months - 1) % 12 + 1
        day = min(now.day, calendar.monthrange(year, month)[1])
        user.subscription_expires_at = datetime.datetime(year, month, day, now.hour, now.minute, now.second, tzinfo=datetime.timezone.utc)
        
    db.commit()
    db.refresh(user)
    return user

@router.get("/users", response_model=List[UserOut])
def get_all_users_subscriptions(
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    return db.query(User).all()

MID = os.environ.get("PHONEPE_MID", "PGTESTPAYUAT86")
SALT_KEY = os.environ.get("PHONEPE_SALT_KEY", "96434309-7796-489d-8924-ab56988a6076")
SALT_INDEX = os.environ.get("PHONEPE_SALT_INDEX", "1")
BASE_URL = os.environ.get("PHONEPE_BASE_URL", "https://api-preprod.phonepe.com/apis/pg-sandbox")
FRONTEND_REDIRECT_URL = "http://localhost:3000"

class PhonePeInitiateRequest(BaseModel):
    plan_id: int

def calculate_checksum(payload_b64: str, endpoint: str) -> str:
    main_string = payload_b64 + endpoint + SALT_KEY
    sha256_hash = hashlib.sha256(main_string.encode('utf-8')).hexdigest()
    return f"{sha256_hash}###{SALT_INDEX}"

@router.post("/phonepe/initiate")
async def phonepe_initiate(
    req: PhonePeInitiateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == req.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    months = 12 if plan.billing_cycle == 'yearly' else 1
    import time
    txn_id = f"TXN_{plan.id}_{current_user.id}_{int(time.time())}"
    
    payload = {
        "merchantId": MID,
        "merchantTransactionId": txn_id,
        "merchantUserId": f"USER_{current_user.id}",
        "amount": int(plan.price * 100),  # Amount in Paise
        "redirectUrl": f"http://localhost:8000/api/subscriptions/phonepe/callback/{current_user.id}/{plan.id}/{months}",
        "redirectMode": "POST",
        "paymentInstrument": {
            "type": "PAY_PAGE"
        }
    }
    
    payload_json = json.dumps(payload)
    payload_b64 = base64.b64encode(payload_json.encode('utf-8')).decode('utf-8')
    
    endpoint = "/pg/v1/pay"
    x_verify = calculate_checksum(payload_b64, endpoint)
    
    headers = {
        "Content-Type": "application/json",
        "X-VERIFY": x_verify
    }
    
    async with httpx.AsyncClient() as httpx_client:
        try:
            response = await httpx_client.post(
                f"{BASE_URL}{endpoint}",
                json={"request": payload_b64},
                headers=headers
            )
            res_data = response.json()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"PhonePe request failed: {str(e)}"
            )
        
        if response.status_code == 200 and res_data.get("success"):
            redirect_url = res_data["data"]["instrumentResponse"]["redirectInfo"]["url"]
            return {"redirect_url": redirect_url}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=res_data.get("message", "PhonePe payment initiation failed")
            )

@router.post("/phonepe/callback/{user_id}/{plan_id}/{months}")
async def phonepe_callback(
    user_id: int,
    plan_id: int,
    months: int,
    request: Request,
    db: Session = Depends(get_db)
):
    form_data = await request.form()
    response_b64 = form_data.get("response")
    
    if not response_b64:
        return RedirectResponse(url=f"{FRONTEND_REDIRECT_URL}/?payment_status=failed", status_code=303)
        
    try:
        response_json = base64.b64decode(response_b64).decode('utf-8')
        res_data = json.loads(response_json)
        txn_id = res_data["data"]["merchantTransactionId"]
    except Exception:
        return RedirectResponse(url=f"{FRONTEND_REDIRECT_URL}/?payment_status=failed", status_code=303)
        
    # Verify status via status check API
    endpoint = f"/pg/v1/status/{MID}/{txn_id}"
    main_string = endpoint + SALT_KEY
    sha256_hash = hashlib.sha256(main_string.encode('utf-8')).hexdigest()
    x_verify = f"{sha256_hash}###{SALT_INDEX}"
    
    headers = {
        "Content-Type": "application/json",
        "X-VERIFY": x_verify,
        "X-MERCHANT-ID": MID
    }
    
    async with httpx.AsyncClient() as httpx_client:
        try:
            status_res = await httpx_client.get(f"{BASE_URL}{endpoint}", headers=headers)
            status_data = status_res.json()
        except Exception:
            return RedirectResponse(url=f"{FRONTEND_REDIRECT_URL}/?payment_status=failed", status_code=303)
            
        if status_res.status_code == 200 and status_data.get("success") and status_data["data"]["responseCode"] == "SUCCESS":
            user = db.query(User).filter(User.id == user_id).first()
            plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
            
            if user and plan:
                user.subscription_plan_id = plan.id
                
                import calendar
                now = datetime.datetime.now(datetime.timezone.utc)
                year = now.year + (now.month + months - 1) // 12
                month = (now.month + months - 1) % 12 + 1
                day = min(now.day, calendar.monthrange(year, month)[1])
                user.subscription_expires_at = datetime.datetime(year, month, day, now.hour, now.minute, now.second, tzinfo=datetime.timezone.utc)
                
                db.commit()
                return RedirectResponse(url=f"{FRONTEND_REDIRECT_URL}/?payment_status=success", status_code=303)
                
    return RedirectResponse(url=f"{FRONTEND_REDIRECT_URL}/?payment_status=failed", status_code=303)
