from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

try:
    from backend.database import get_db
    from backend.models import Standard, User
    from backend.schemas import StandardCreate, StandardOut
    from backend.auth import get_current_user
except ImportError:
    from database import get_db
    from models import Standard, User
    from schemas import StandardCreate, StandardOut
    from auth import get_current_user

router = APIRouter(prefix="/api/standards", tags=["Standards"])

def require_superadmin(current_user: User = Depends(get_current_user)):
    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to SuperAdmins only."
        )
    return current_user

@router.get("", response_model=List[StandardOut])
def get_standards(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == "superadmin":
        return db.query(Standard).order_by(Standard.name).all()
    else:
        # Teachers see only assigned standards
        assigned_ids = [a.standard_id for a in current_user.assignments]
        return db.query(Standard).filter(Standard.id.in_(assigned_ids)).order_by(Standard.name).all()

@router.post("", response_model=StandardOut, status_code=status.HTTP_201_CREATED)
def create_standard(
    standard_in: StandardCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    db_std = db.query(Standard).filter(Standard.name == standard_in.name).first()
    if db_std:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Standard already exists")
    
    new_std = Standard(name=standard_in.name)
    db.add(new_std)
    db.commit()
    db.refresh(new_std)
    return new_std

@router.put("/{std_id}", response_model=StandardOut)
def update_standard(
    std_id: int,
    standard_in: StandardCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    db_std = db.query(Standard).filter(Standard.id == std_id).first()
    if not db_std:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Standard not found")
        
    duplicate = db.query(Standard).filter(Standard.name == standard_in.name, Standard.id != std_id).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Standard name already exists")
        
    db_std.name = standard_in.name
    db.commit()
    db.refresh(db_std)
    return db_std

@router.delete("/{std_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_standard(
    std_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_superadmin)
):
    db_std = db.query(Standard).filter(Standard.id == std_id).first()
    if not db_std:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Standard not found")
    db.delete(db_std)
    db.commit()
    return