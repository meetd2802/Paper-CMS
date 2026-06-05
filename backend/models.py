from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, DateTime, Boolean
from sqlalchemy.orm import relationship
import datetime

try:
    from backend.database import Base
except ImportError:
    from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="superadmin")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    must_reset_password = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    boards = Column(JSON, nullable=True) # e.g. ["CBSE", "GSEB"]

    # Relationships
    assignments = relationship("TeacherAssignment", back_populates="teacher", cascade="all, delete-orphan")
    papers = relationship("QuestionPaper", back_populates="creator", cascade="all, delete-orphan")

class Standard(Base):
    __tablename__ = "standards"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    board = Column(String(50), default="CBSE", nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    papers = relationship("QuestionPaper", back_populates="standard", cascade="all, delete-orphan")
    assignments = relationship("TeacherAssignment", back_populates="standard", cascade="all, delete-orphan")

class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    board = Column(String(50), default="CBSE", nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    default_instructions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class TeacherAssignment(Base):
    __tablename__ = "teacher_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    standard_id = Column(Integer, ForeignKey("standards.id", ondelete="CASCADE"), nullable=False)
    subject = Column(String(100), nullable=False)

    teacher = relationship("User", back_populates="assignments")
    standard = relationship("Standard", back_populates="assignments")

class QuestionPaper(Base):
    __tablename__ = "question_papers"
    
    id = Column(Integer, primary_key=True, index=True)
    standard_id = Column(Integer, ForeignKey("standards.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=False)
    class_name = Column(String(50), nullable=False)
    board = Column(String(50), default="CBSE", nullable=False)
    date_str = Column(String(100), nullable=True)
    time_duration = Column(String(100), nullable=True)
    max_marks = Column(Integer, default=25)
    logo_path = Column(String(255), default="/uploads/logo.png")
    instructions = Column(Text, nullable=True)
    structure_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    standard = relationship("Standard", back_populates="papers")
    creator = relationship("User", back_populates="papers")
    questions = relationship("Question", back_populates="paper", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("question_papers.id", ondelete="CASCADE"), nullable=False)
    section = Column(String(100), nullable=True)
    question_type = Column(String(50), nullable=True)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text, nullable=True)
    marks = Column(Integer, default=1)
    display_order = Column(Integer, default=0)
    sub_questions = Column(JSON, nullable=True)

    paper = relationship("QuestionPaper", back_populates="questions")