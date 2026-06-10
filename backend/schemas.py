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

class SubscriptionPlanCreate(BaseModel):
    name: str
    price: int = 0
    billing_cycle: Optional[str] = "monthly"
    paper_limit: int = 1
    class_limit: int = 1
    subject_limit: int = 1
    features: Optional[List[str]] = None

class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[int] = None
    billing_cycle: Optional[str] = None
    paper_limit: Optional[int] = None
    class_limit: Optional[int] = None
    subject_limit: Optional[int] = None
    features: Optional[List[str]] = None

class SubscriptionPlanOut(BaseModel):
    id: int
    name: str
    price: int
    billing_cycle: str
    paper_limit: int
    class_limit: int
    subject_limit: int
    features: Optional[List[str]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    created_at: datetime
    must_reset_password: bool
    is_active: bool = True
    boards: Optional[List[str]] = None
    subscription_plan_id: Optional[int] = None
    subscription_expires_at: Optional[datetime] = None
    subscription_plan: Optional[SubscriptionPlanOut] = None
    
    class Config:
        from_attributes = True

class TeacherSignup(BaseModel):
    email: EmailStr
    boards: List[str]
    standards: Optional[List[str]] = None
    subjects: Optional[List[str]] = None

# --- Standard Schemas ---
class StandardCreate(BaseModel):
    name: str
    board: Optional[str] = "CBSE"

class StandardOut(BaseModel):
    id: int
    name: str
    board: str = "CBSE"
    user_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Subject Schemas ---
class SubjectCreate(BaseModel):
    name: str
    board: Optional[str] = "CBSE"
    default_instructions: Optional[str] = None

class SubjectOut(BaseModel):
    id: int
    name: str
    board: str = "CBSE"
    user_id: Optional[int] = None
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
    is_active: bool = True
    boards: Optional[List[str]] = None
    subscription_plan_id: Optional[int] = None
    subscription_expires_at: Optional[datetime] = None
    subscription_plan: Optional[SubscriptionPlanOut] = None
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
    board: Optional[str] = "CBSE"
    date_str: Optional[str] = None
    time_duration: Optional[str] = None
    max_marks: int = 25
    logo_path: Optional[str] = None
    instructions: Optional[str] = None
    structure_json: Optional[Dict[str, Any]] = None

class QuestionPaperUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    class_name: Optional[str] = None
    board: Optional[str] = None
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
    board: str = "CBSE"
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