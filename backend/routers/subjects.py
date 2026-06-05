from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

try:
    from backend.database import get_db
    from backend.models import Subject, User, Standard, TeacherAssignment
    from backend.schemas import SubjectCreate, SubjectOut
    from backend.auth import get_current_user
except ImportError:
    from database import get_db
    from models import Subject, User, Standard, TeacherAssignment
    from schemas import SubjectCreate, SubjectOut
    from auth import get_current_user

class SubjectUpdate(BaseModel):
    name: str
    default_instructions: Optional[str] = None

router = APIRouter(prefix="/api/subjects", tags=["Subjects Master"])

@router.get("", response_model=List[SubjectOut])
def get_subjects(
    board: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Subject)
    if current_user.role == "teacher":
        query = query.filter(Subject.user_id == current_user.id)
    if board:
        query = query.filter(Subject.board == board)
    return query.order_by(Subject.name).all()

@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject_in: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id if current_user.role == "teacher" else None
    db_subj = db.query(Subject).filter(
        Subject.name == subject_in.name,
        Subject.board == subject_in.board,
        Subject.user_id == user_id
    ).first()
    if db_subj:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject already exists")
    
    new_subj = Subject(
        name=subject_in.name,
        board=subject_in.board,
        user_id=user_id,
        default_instructions=subject_in.default_instructions
    )
    db.add(new_subj)
    db.commit()
    db.refresh(new_subj)
    
    # If teacher, auto-assign this subject to all of their standards for the same board.
    # This covers both teacher-created standards AND admin-created standards the teacher
    # already teaches in (via existing TeacherAssignment rows).
    if current_user.role == "teacher":
        # Collect standard_ids already associated with this teacher
        existing_assignment_std_ids = {
            a.standard_id for a in db.query(TeacherAssignment).filter(
                TeacherAssignment.teacher_id == current_user.id
            ).all()
        }
        # Also include standards the teacher owns directly
        teacher_owned_stds = db.query(Standard).filter(
            Standard.user_id == current_user.id,
            Standard.board == subject_in.board
        ).all()
        all_std_ids = existing_assignment_std_ids | {s.id for s in teacher_owned_stds}

        for std_id in all_std_ids:
            # Verify board matches
            std = db.query(Standard).filter(Standard.id == std_id).first()
            if not std or std.board != subject_in.board:
                continue
            # Avoid duplicate assignment
            already = db.query(TeacherAssignment).filter(
                TeacherAssignment.teacher_id == current_user.id,
                TeacherAssignment.standard_id == std_id,
                TeacherAssignment.subject == new_subj.name
            ).first()
            if not already:
                assign = TeacherAssignment(
                    teacher_id=current_user.id,
                    standard_id=std_id,
                    subject=new_subj.name
                )
                db.add(assign)
        db.commit()
        
    return new_subj


@router.put("/{subj_id}", response_model=SubjectOut)
def update_subject(
    subj_id: int,
    subject_in: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_subj = db.query(Subject).filter(Subject.id == subj_id).first()
    if not db_subj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
        
    if current_user.role != "superadmin" and db_subj.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    user_id = current_user.id if current_user.role == "teacher" else None
    if subject_in.name != db_subj.name:
        conflict = db.query(Subject).filter(
            Subject.name == subject_in.name,
            Subject.board == db_subj.board,
            Subject.user_id == user_id
        ).first()
        if conflict:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject name already exists")
            
    db_subj.name = subject_in.name
    db_subj.default_instructions = subject_in.default_instructions
    db.commit()
    db.refresh(db_subj)
    return db_subj

@router.delete("/{subj_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subj_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_subj = db.query(Subject).filter(Subject.id == subj_id).first()
    if not db_subj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
        
    if current_user.role != "superadmin" and db_subj.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    db.delete(db_subj)
    db.commit()
    return