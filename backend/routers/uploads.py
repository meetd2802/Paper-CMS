from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import os
import uuid
import shutil

try:
    from backend.config import UPLOAD_DIR
    from backend.auth import get_current_user
except ImportError:
    from config import UPLOAD_DIR
    from auth import get_current_user

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])

@router.post("/image")
def upload_image(file: UploadFile = File(...), current_user = Depends(get_current_user)):
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
        
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save image: {str(e)}"
        )
        
    return {"url": f"/uploads/{filename}"}

@router.post("/logo")
def upload_logo(file: UploadFile = File(...), current_user = Depends(get_current_user)):
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
        
    ext = os.path.splitext(file.filename)[1]
    filename = f"logo_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save logo: {str(e)}"
        )
        
    return {"url": f"/uploads/{filename}"}