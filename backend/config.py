import os

DATABASE_URL = "mysql+pymysql://root:Techup%40123@127.0.0.1:3306/question_paper_cms"
SECRET_KEY = "super-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
FONTS_DIR = os.path.join(BASE_DIR, "fonts")

# Ensure directories exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(FONTS_DIR, exist_ok=True)
