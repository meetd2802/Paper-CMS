from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel

try:
    from backend.database import get_db
    from backend.models import Question, QuestionPaper, User
    from backend.schemas import QuestionCreate, QuestionUpdate, QuestionOut
    from backend.auth import get_current_user
except ImportError:
    from database import get_db
    from models import Question, QuestionPaper, User
    from schemas import QuestionCreate, QuestionUpdate, QuestionOut
    from auth import get_current_user

router = APIRouter(prefix="/api/questions", tags=["Questions"])

class ReorderPayload(BaseModel):
    paper_id: int
    question_ids: List[int]

# Helper to check if teacher has access to paper's standard and subject
def check_teacher_scope(user: User, paper: QuestionPaper):
    if user.role == "teacher":
        assigned = any(a.standard_id == paper.standard_id and a.subject == paper.subject for a in user.assignments)
        if not assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. This paper's class or subject is not assigned to you."
            )

@router.get("/paper/{paper_id}", response_model=List[QuestionOut])
def get_questions_by_paper(
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question paper not found")
        
    check_teacher_scope(current_user, paper)
    
    return db.query(Question).filter(Question.paper_id == paper_id).order_by(Question.display_order.asc()).all()

@router.post("/paper/{paper_id}", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def add_question(
    paper_id: int,
    q_in: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question paper not found")
        
    check_teacher_scope(current_user, paper)
        
    # Get max display order
    max_order = db.query(Question.display_order).filter(Question.paper_id == paper_id).order_by(Question.display_order.desc()).first()
    next_order = (max_order[0] + 1) if max_order else 0
    
    new_q = Question(
        paper_id=paper_id,
        section=q_in.section,
        question_type=q_in.question_type,
        question_text=q_in.question_text,
        answer_text=q_in.answer_text,
        marks=q_in.marks,
        display_order=next_order,
        sub_questions=q_in.sub_questions
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    return new_q

@router.put("/{q_id}", response_model=QuestionOut)
def update_question(
    q_id: int,
    q_in: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Question).filter(Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == q.paper_id).first()
    check_teacher_scope(current_user, paper)

    if q_in.section is not None:
        q.section = q_in.section
    if q_in.question_type is not None:
        q.question_type = q_in.question_type
    if q_in.question_text is not None:
        q.question_text = q_in.question_text
    if q_in.answer_text is not None:
        q.answer_text = q_in.answer_text
    if q_in.marks is not None:
        q.marks = q_in.marks
    if q_in.display_order is not None:
        q.display_order = q_in.display_order
    if q_in.sub_questions is not None:
        q.sub_questions = q_in.sub_questions
        
    db.commit()
    db.refresh(q)
    return q

@router.delete("/{q_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    q_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Question).filter(Question.id == q_id).first()
    if not q:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == q.paper_id).first()
    check_teacher_scope(current_user, paper)
            
    db.delete(q)
    db.commit()
    return

@router.post("/reorder")
def reorder_questions(
    payload: ReorderPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == payload.paper_id).first()
    if not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
        
    check_teacher_scope(current_user, paper)
            
    for idx, q_id in enumerate(payload.question_ids):
        q = db.query(Question).filter(Question.id == q_id, Question.paper_id == payload.paper_id).first()
        if q:
            q.display_order = idx
            
    db.commit()
    return {"message": "Questions reordered successfully"}