from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os

try:
    from backend.database import get_db
    from backend.models import QuestionPaper, Standard, User, Question
    from backend.schemas import QuestionPaperCreate, QuestionPaperUpdate, QuestionPaperOut
    from backend.auth import get_current_user
    from backend.pdf_generator import generate_paper_pdf
except ImportError:
    from database import get_db
    from models import QuestionPaper, Standard, User, Question
    from schemas import QuestionPaperCreate, QuestionPaperUpdate, QuestionPaperOut
    from auth import get_current_user
    from pdf_generator import generate_paper_pdf

router = APIRouter(prefix="/api/papers", tags=["Question Papers"])

class MockQuestionObj:
    def __init__(self, d):
        self.section = d.get("section")
        self.question_type = d.get("question_type", "text")
        self.question_text = d.get("question_text", "")
        self.answer_text = d.get("answer_text")
        self.marks = d.get("marks", 0)
        self.display_order = d.get("display_order", 0)
        self.sub_questions = d.get("sub_questions", [])

class MockPaperObj:
    def __init__(self, d):
        self.title = d.get("title", "Question Paper")
        self.subject = d.get("subject", "")
        self.class_name = d.get("class_name", "")
        self.date_str = d.get("date_str")
        self.time_duration = d.get("time_duration")
        self.max_marks = d.get("max_marks", 25)
        self.logo_path = d.get("logo_path")
        self.instructions = d.get("instructions")
        self.structure_json = d.get("structure_json", {})
        self.questions = [MockQuestionObj(q) for q in d.get("questions", [])]

class PreviewPayload(BaseModel):
    title: str
    subject: str
    class_name: str
    date_str: Optional[str] = None
    time_duration: Optional[str] = None
    max_marks: int
    logo_path: Optional[str] = None
    instructions: Optional[str] = None
    structure_json: Optional[Dict[str, Any]] = None
    questions: List[Dict[str, Any]] = []
    is_answer_key: Optional[bool] = False

# Helper to check teacher permissions on standard and subject
def check_teacher_scope(user: User, standard_id: int, subject: str):
    if user.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin is restricted from viewing or managing question papers."
        )
    if user.role == "teacher":
        assigned = any(a.standard_id == standard_id and a.subject == subject for a in user.assignments)
        if not assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You are not assigned to this class or subject."
            )

@router.get("", response_model=List[QuestionPaperOut])
def get_papers(
    standard_id: Optional[int] = None,
    subject: Optional[str] = None,
    board: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin is restricted from viewing or managing question papers."
        )
        
    query = db.query(QuestionPaper).filter(QuestionPaper.created_by == current_user.id)
    if standard_id is not None:
        query = query.filter(QuestionPaper.standard_id == standard_id)
    if subject is not None:
        query = query.filter(QuestionPaper.subject == subject)
    if board is not None:
        query = query.filter(QuestionPaper.board == board)
        
    return query.order_by(QuestionPaper.created_at.desc()).all()

@router.get("/standard/{standard_id}", response_model=List[QuestionPaperOut])
def get_papers_by_standard(
    standard_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin is restricted from viewing or managing question papers."
        )
        
    std = db.query(Standard).filter(Standard.id == standard_id).first()
    if not std:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Standard not found")
        
    query = db.query(QuestionPaper).filter(
        QuestionPaper.standard_id == standard_id,
        QuestionPaper.created_by == current_user.id
    )
    return query.order_by(QuestionPaper.created_at.desc()).all()

@router.get("/{paper_id}", response_model=QuestionPaperOut)
def get_paper_detail(
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin is restricted from viewing or managing question papers."
        )
        
    paper = db.query(QuestionPaper).filter(
        QuestionPaper.id == paper_id,
        QuestionPaper.created_by == current_user.id
    ).first()
    if not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question paper not found")
        
    return paper

@router.post("", response_model=QuestionPaperOut, status_code=status.HTTP_201_CREATED)
def create_paper(
    paper_in: QuestionPaperCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin is restricted from viewing or managing question papers."
        )
        
    std = db.query(Standard).filter(Standard.id == paper_in.standard_id).first()
    if not std:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Standard not found")
        
    check_teacher_scope(current_user, paper_in.standard_id, paper_in.subject)
    
    new_paper = QuestionPaper(
        standard_id=paper_in.standard_id,
        title=paper_in.title,
        subject=paper_in.subject,
        class_name=paper_in.class_name,
        board=std.board,
        date_str=paper_in.date_str,
        time_duration=paper_in.time_duration,
        max_marks=paper_in.max_marks,
        logo_path=paper_in.logo_path,
        instructions=paper_in.instructions,
        structure_json=paper_in.structure_json,
        created_by=current_user.id
    )
    db.add(new_paper)
    db.commit()
    db.refresh(new_paper)
    return new_paper

@router.put("/{paper_id}", response_model=QuestionPaperOut)
def update_paper(
    paper_id: int,
    paper_in: QuestionPaperUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin is restricted from viewing or managing question papers."
        )
        
    paper = db.query(QuestionPaper).filter(
        QuestionPaper.id == paper_id,
        QuestionPaper.created_by == current_user.id
    ).first()
    if not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question paper not found")
        
    # If standard or subject are changing, verify scopes
    new_std_id = paper_in.standard_id if hasattr(paper_in, 'standard_id') and paper_in.standard_id is not None else paper.standard_id
    new_subject = paper_in.subject if paper_in.subject is not None else paper.subject
    check_teacher_scope(current_user, new_std_id, new_subject)
    
    std = db.query(Standard).filter(Standard.id == new_std_id).first()
    if not std:
        raise HTTPException(status_code=404, detail="Standard not found")

    for k, v in paper_in.dict(exclude_unset=True).items():
        setattr(paper, k, v)
        
    paper.board = std.board # Update board if standard changed
    db.commit()
    db.refresh(paper)
    return paper

@router.delete("/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_paper(
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin is restricted from viewing or managing question papers."
        )
        
    paper = db.query(QuestionPaper).filter(
        QuestionPaper.id == paper_id,
        QuestionPaper.created_by == current_user.id
    ).first()
    if not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question paper not found")
            
    db.delete(paper)
    db.commit()
    return

@router.get("/{paper_id}/pdf")
def get_paper_pdf(
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin is restricted from viewing or managing question papers."
        )
        
    paper = db.query(QuestionPaper).filter(
        QuestionPaper.id == paper_id,
        QuestionPaper.created_by == current_user.id
    ).first()
    if not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question paper not found")
            
    pdf_data = generate_paper_pdf(paper, is_answer_key=False)
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=paper_{paper_id}.pdf"}
    )

@router.get("/{paper_id}/answer-key-pdf")
def get_answer_key_pdf(
    paper_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin is restricted from viewing or managing question papers."
        )
        
    paper = db.query(QuestionPaper).filter(
        QuestionPaper.id == paper_id,
        QuestionPaper.created_by == current_user.id
    ).first()
    if not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question paper not found")
            
    pdf_data = generate_paper_pdf(paper, is_answer_key=True)
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=answer_key_{paper_id}.pdf"}
    )

@router.post("/preview-pdf")
def preview_pdf(
    payload: PreviewPayload,
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SuperAdmin is restricted from viewing or managing question papers."
        )
        
    mock_paper = MockPaperObj(payload.dict())
    pdf_data = generate_paper_pdf(mock_paper, is_answer_key=payload.is_answer_key, structure_json=payload.structure_json)
    return Response(content=pdf_data, media_type="application/pdf")