from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional

try:
    from backend.database import get_db
    from backend.models import User, Standard, Subject, TeacherAssignment
    from backend.schemas import UserCreate, UserLogin, UserOut, TeacherOut, Token, PasswordReset, TeacherSignup
    from backend.auth import get_password_hash, verify_password, create_access_token, get_current_user
except ImportError:
    from database import get_db
    from models import User, Standard, Subject, TeacherAssignment
    from schemas import UserCreate, UserLogin, UserOut, TeacherOut, Token, PasswordReset, TeacherSignup
    from auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class ProfileUpdate(BaseModel):
    email: EmailStr
    boards: Optional[List[str]] = None

@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: TeacherSignup, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == payload.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_password = get_password_hash("Test@123")
    new_user = User(
        email=payload.email,
        password_hash=hashed_password,
        role="teacher",
        must_reset_password=True,
        is_active=True,
        boards=payload.boards
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create standard and subjects for the teacher context if provided
    if payload.standards:
        for board in payload.boards:
            for std_name in payload.standards:
                std = Standard(
                    name=std_name,
                    board=board,
                    user_id=new_user.id
                )
                db.add(std)
                db.commit()
                db.refresh(std)
                
                if payload.subjects:
                    for sub_name in payload.subjects:
                        sub = db.query(Subject).filter(
                            Subject.name == sub_name,
                            Subject.board == board,
                            Subject.user_id == new_user.id
                        ).first()
                        if not sub:
                            sub = Subject(
                                name=sub_name,
                                board=board,
                                user_id=new_user.id
                            )
                            db.add(sub)
                            db.commit()
                            db.refresh(sub)
                            
                        assignment = TeacherAssignment(
                            teacher_id=new_user.id,
                            standard_id=std.id,
                            subject=sub_name
                        )
                        db.add(assignment)
                
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    hashed_password = get_password_hash(user_in.password)
    new_user = User(email=user_in.email, password_hash=hashed_password, role="teacher", is_active=True)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    if not getattr(user, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You have been blocked due to suspicious activity. Contact administrator to access this.",
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=TeacherOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/reset-password")
def reset_password(data: PasswordReset, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.password_hash = get_password_hash(data.new_password)
    current_user.must_reset_password = False
    db.commit()
    return {"message": "Password reset successful"}

@router.put("/profile", response_model=UserOut)
def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.email != current_user.email:
        conflict = db.query(User).filter(User.email == data.email).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = data.email
        
    if data.boards is not None:
        current_user.boards = data.boards
        
    db.commit()
    db.refresh(current_user)
    return current_user
