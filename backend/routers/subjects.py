from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

try:
    from backend.database import get_db
    from backend.models import Subject, User
    from backend.schemas import SubjectCreate, SubjectOut
    from backend.auth import get_current_user
except ImportError:
    from database import get_db
    from models import Subject, User
    from schemas import SubjectCreate, SubjectOut
    from auth import get_current_user

class SubjectUpdate(BaseModel):
    name: str
    default_instructions: Optional[str] = None

router = APIRouter(prefix="/api/subjects", tags=["Subjects Master"])

def require_superadmin(current_user: User = Depends(get_current_user)):
    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SuperAdmin can perform this operation."
        )
    return current_user

@router.get("", response_model=List[SubjectOut])
def get_subjects(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Subject).order_by(Subject.name).all()

@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(
    subject_in: SubjectCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    db_subj = db.query(Subject).filter(Subject.name == subject_in.name).first()
    if db_subj:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject already exists")
    
    new_subj = Subject(
        name=subject_in.name,
        default_instructions=subject_in.default_instructions
    )
    db.add(new_subj)
    db.commit()
    db.refresh(new_subj)
    return new_subj

@router.put("/{subj_id}", response_model=SubjectOut)
def update_subject(
    subj_id: int,
    subject_in: SubjectUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    db_subj = db.query(Subject).filter(Subject.id == subj_id).first()
    if not db_subj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
        
    if subject_in.name != db_subj.name:
        conflict = db.query(Subject).filter(Subject.name == subject_in.name).first()
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
    admin: User = Depends(require_superadmin)
):
    db_subj = db.query(Subject).filter(Subject.id == subj_id).first()
    if not db_subj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    db.delete(db_subj)
    db.commit()
    return