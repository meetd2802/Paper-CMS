from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

try:
    from backend.database import get_db
    from backend.models import Standard, User, TeacherAssignment
    from backend.schemas import StandardCreate, StandardOut
    from backend.auth import get_current_user
except ImportError:
    from database import get_db
    from models import Standard, User, TeacherAssignment
    from schemas import StandardCreate, StandardOut
    from auth import get_current_user

router = APIRouter(prefix="/api/standards", tags=["Standards"])

@router.get("", response_model=List[StandardOut])
def get_standards(
    board: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Standard)
    if current_user.role == "teacher":
        query = query.filter(Standard.user_id == current_user.id)
    if board:
        query = query.filter(Standard.board == board)
    return query.order_by(Standard.name).all()

@router.post("", response_model=StandardOut, status_code=status.HTTP_201_CREATED)
def create_standard(
    standard_in: StandardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import datetime
    
    if current_user.role == "teacher":
        existing_std_count = db.query(Standard).filter(Standard.user_id == current_user.id).count()
        limit = 1 # Free/Trial limit
        
        if current_user.subscription_plan and (current_user.subscription_expires_at is None or current_user.subscription_expires_at > datetime.datetime.utcnow()):
            limit = current_user.subscription_plan.class_limit
            
        if existing_std_count >= limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You have reached your class/standard creation limit ({limit}). Please purchase or upgrade your subscription plan to continue."
            )
            
    # Check if standard already exists for this user and board
    user_id = current_user.id if current_user.role == "teacher" else None
    db_std = db.query(Standard).filter(
        Standard.name == standard_in.name,
        Standard.board == standard_in.board,
        Standard.user_id == user_id
    ).first()
    if db_std:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Standard already exists")
    
    new_std = Standard(
        name=standard_in.name,
        board=standard_in.board,
        user_id=user_id
    )
    db.add(new_std)
    db.commit()
    db.refresh(new_std)
    
    # If teacher, auto-assign their unique subjects to this standard
    if current_user.role == "teacher":
        subj_names = db.query(TeacherAssignment.subject).filter(
            TeacherAssignment.teacher_id == current_user.id
        ).distinct().all()
        
        for (sub_name,) in subj_names:
            assign = TeacherAssignment(
                teacher_id=current_user.id,
                standard_id=new_std.id,
                subject=sub_name
            )
            db.add(assign)
        db.commit()
        
    return new_std

@router.put("/{std_id}", response_model=StandardOut)
def update_standard(
    std_id: int,
    standard_in: StandardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_std = db.query(Standard).filter(Standard.id == std_id).first()
    if not db_std:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Standard not found")
        
    if current_user.role != "superadmin" and db_std.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    user_id = current_user.id if current_user.role == "teacher" else None
    duplicate = db.query(Standard).filter(
        Standard.name == standard_in.name,
        Standard.board == standard_in.board,
        Standard.user_id == user_id,
        Standard.id != std_id
    ).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Standard name already exists")
        
    db_std.name = standard_in.name
    db_std.board = standard_in.board
    db.commit()
    db.refresh(db_std)
    return db_std

@router.delete("/{std_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_standard(
    std_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_std = db.query(Standard).filter(Standard.id == std_id).first()
    if not db_std:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Standard not found")
        
    if current_user.role != "superadmin" and db_std.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    db.delete(db_std)
    db.commit()
    return