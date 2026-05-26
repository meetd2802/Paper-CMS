from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- User Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    created_at: datetime
    must_reset_password: bool
    
    class Config:
        from_attributes = True

# --- Standard Schemas ---
class StandardCreate(BaseModel):
    name: str

class StandardOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Subject Schemas ---
class SubjectCreate(BaseModel):
    name: str
    default_instructions: Optional[str] = None

class SubjectOut(BaseModel):
    id: int
    name: str
    default_instructions: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Teacher Schemas ---
class TeacherOnboard(BaseModel):
    email: EmailStr
    standard_ids: List[int] = []
    subjects: List[str] = []

class TeacherAssignmentOut(BaseModel):
    id: int
    teacher_id: int
    standard_id: int
    subject: str
    
    class Config:
        from_attributes = True

class TeacherOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    created_at: datetime
    must_reset_password: bool
    assignments: List[TeacherAssignmentOut] = []
    
    class Config:
        from_attributes = True

class TeacherUpdate(BaseModel):
    email: EmailStr
    standard_ids: List[int]
    subjects: List[str]

# --- Question Schemas ---
class QuestionCreate(BaseModel):
    section: Optional[str] = None
    question_type: str
    question_text: str
    answer_text: Optional[str] = None
    marks: int = 1
    display_order: int = 0
    sub_questions: Optional[List[Dict[str, Any]]] = None

class QuestionUpdate(BaseModel):
    section: Optional[str] = None
    question_type: Optional[str] = None
    question_text: Optional[str] = None
    answer_text: Optional[str] = None
    marks: Optional[int] = None
    display_order: Optional[int] = None
    sub_questions: Optional[List[Dict[str, Any]]] = None

class QuestionOut(BaseModel):
    id: int
    paper_id: int
    section: Optional[str] = None
    question_type: str
    question_text: str
    answer_text: Optional[str] = None
    marks: int
    display_order: int
    sub_questions: Optional[List[Dict[str, Any]]] = None
    
    class Config:
        from_attributes = True

# --- Question Paper Schemas ---
class QuestionPaperCreate(BaseModel):
    standard_id: int
    title: str
    subject: str
    class_name: str
    date_str: Optional[str] = None
    time_duration: Optional[str] = None
    max_marks: int = 25
    logo_path: Optional[str] = "/uploads/logo.png"
    instructions: Optional[str] = None
    structure_json: Optional[Dict[str, Any]] = None

class QuestionPaperUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    class_name: Optional[str] = None
    date_str: Optional[str] = None
    time_duration: Optional[str] = None
    max_marks: Optional[int] = None
    logo_path: Optional[str] = None
    instructions: Optional[str] = None
    structure_json: Optional[Dict[str, Any]] = None

class QuestionPaperOut(BaseModel):
    id: int
    standard_id: int
    title: str
    subject: str
    class_name: str
    date_str: Optional[str] = None
    time_duration: Optional[str] = None
    max_marks: int
    logo_path: Optional[str] = None
    instructions: Optional[str] = None
    structure_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    created_by: Optional[int] = None
    questions: List[QuestionOut] = []
    
    class Config:
        from_attributes = True

class PasswordReset(BaseModel):
    new_password: str