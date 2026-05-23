from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

try:
    from backend.database import get_db
    from backend.models import User, Standard, TeacherAssignment
    from backend.schemas import TeacherOut, TeacherOnboard, TeacherUpdate
    from backend.auth import get_current_user, get_password_hash
except ImportError:
    from database import get_db
    from models import User, Standard, TeacherAssignment
    from schemas import TeacherOut, TeacherOnboard, TeacherUpdate
    from auth import get_current_user, get_password_hash

router = APIRouter(prefix="/api/teachers", tags=["Teachers Management"])

# Helper to check if current user is superadmin
def require_superadmin(current_user: User = Depends(get_current_user)):
    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SuperAdmin can access teacher management."
        )
    return current_user

@router.post("", response_model=TeacherOut, status_code=status.HTTP_201_CREATED)
def onboard_teacher(
    payload: TeacherOnboard,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    db_user = db.query(User).filter(User.email == payload.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_pw = get_password_hash("Test@123")
    new_teacher = User(
        email=payload.email,
        password_hash=hashed_pw,
        role="teacher",
        must_reset_password=True
    )
    db.add(new_teacher)
    db.commit()
    db.refresh(new_teacher)
    return new_teacher

@router.get("", response_model=List[TeacherOut])
def list_teachers(
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    teachers = db.query(User).filter(User.role == "teacher").all()
    return teachers

@router.put("/{teacher_id}", response_model=TeacherOut)
def update_teacher(
    teacher_id: int,
    payload: TeacherUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    teacher = db.query(User).filter(User.id == teacher_id, User.role == "teacher").first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    if payload.email != teacher.email:
        conflict = db.query(User).filter(User.email == payload.email).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Email already registered")
        teacher.email = payload.email
        
    db.query(TeacherAssignment).filter(TeacherAssignment.teacher_id == teacher_id).delete()
    
    for std_id in payload.standard_ids:
        std = db.query(Standard).filter(Standard.id == std_id).first()
        if not std:
            raise HTTPException(status_code=404, detail=f"Standard ID {std_id} not found")
        for sub in payload.subjects:
            assignment = TeacherAssignment(
                teacher_id=teacher_id,
                standard_id=std_id,
                subject=sub
            )
            db.add(assignment)
            
    db.commit()
    db.refresh(teacher)
    return teacher

@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    teacher = db.query(User).filter(User.id == teacher_id, User.role == "teacher").first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    db.query(TeacherAssignment).filter(TeacherAssignment.teacher_id == teacher_id).delete()
    db.delete(teacher)
    db.commit()
    return