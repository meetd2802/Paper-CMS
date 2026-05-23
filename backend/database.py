from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import pymysql
import urllib.parse
import sys

try:
    from backend.config import DATABASE_URL
except ImportError:
    from config import DATABASE_URL

# Parse database URL to auto-create schema if needed
parsed_url = urllib.parse.urlparse(DATABASE_URL)
db_name = parsed_url.path.lstrip('/')
host = parsed_url.hostname
port = parsed_url.port or 3306
user = parsed_url.username
password = urllib.parse.unquote(parsed_url.password or '')

try:
    conn = pymysql.connect(host=host, port=port, user=user, password=password)
    with conn.cursor() as cursor:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    conn.commit()
    conn.close()
    print(f"Database `{db_name}` verified/created.")
except Exception as e:
    print(f"Warning: Could not auto-create database `{db_name}`: {e}", file=sys.stderr)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
