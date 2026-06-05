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
        must_reset_password=True,
        is_active=True
    )
    db.add(new_teacher)
    db.commit()
    db.refresh(new_teacher)
    
    for std_id in payload.standard_ids:
        std = db.query(Standard).filter(Standard.id == std_id).first()
        if not std:
            raise HTTPException(status_code=404, detail=f"Standard ID {std_id} not found")
        for sub in payload.subjects:
            assignment = TeacherAssignment(
                teacher_id=new_teacher.id,
                standard_id=std_id,
                subject=sub
            )
            db.add(assignment)
            
    db.commit()
    db.refresh(new_teacher)
    return new_teacher

@router.get("", response_model=List[TeacherOut])
def list_teachers(
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    # Return all teachers, including soft-deleted/deactivated ones
    teachers = db.query(User).filter(User.role == "teacher").all()
    return teachers

@router.get("/dashboard-analytics")
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    from backend.models import QuestionPaper, Subject
    from sqlalchemy import func, text
    
    # Total papers
    total_papers = db.query(QuestionPaper).count()
    
    # User stats
    total_users = db.query(User).filter(User.role == "teacher").count()
    active_users = db.query(User).filter(User.role == "teacher", User.is_active == True).count()
    blocked_users = db.query(User).filter(User.role == "teacher", User.is_active == False).count()
    password_changed = db.query(User).filter(User.role == "teacher", User.must_reset_password == False).count()
    password_not_changed = db.query(User).filter(User.role == "teacher", User.must_reset_password == True).count()
    
    # Subject analytics
    subj_counts = db.query(QuestionPaper.subject, func.count(QuestionPaper.id).label("count"))\
                    .group_by(QuestionPaper.subject)\
                    .order_by(text("count DESC"))\
                    .all()
    subject_analytics = [{"subject": row[0], "count": row[1]} for row in subj_counts]
    
    # Board splits
    board_counts = db.query(QuestionPaper.board, func.count(QuestionPaper.id).label("count"))\
                     .group_by(QuestionPaper.board)\
                     .all()
    board_analytics = [{"board": row[0] or "CBSE", "count": row[1]} for row in board_counts]
    
    # User trending activity (top teachers by papers created)
    teacher_counts = db.query(User.email, func.count(QuestionPaper.id).label("count"))\
                       .join(QuestionPaper, QuestionPaper.created_by == User.id)\
                       .group_by(User.email)\
                       .order_by(text("count DESC"))\
                       .limit(5)\
                       .all()
    top_teachers = [{"email": row[0], "count": row[1]} for row in teacher_counts]
    
    return {
        "total_papers": total_papers,
        "users": {
            "total": total_users,
            "active": active_users,
            "blocked": blocked_users,
            "password_changed": password_changed,
            "password_not_changed": password_not_changed
        },
        "subjects": subject_analytics,
        "boards": board_analytics,
        "top_teachers": top_teachers
    }

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

@router.put("/{teacher_id}/toggle-active", response_model=TeacherOut)
def toggle_teacher_active(
    teacher_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    teacher = db.query(User).filter(User.id == teacher_id, User.role == "teacher").first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    teacher.is_active = not teacher.is_active
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
    
    # Soft delete: set is_active to False
    teacher.is_active = False
    db.commit()
    return