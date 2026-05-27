from fastapi import APIRouter, HTTPException, Depends, status
import os
import json
from pydantic import BaseModel
from typing import List, Optional
try:
    from backend.auth import get_current_user
    from backend.models import User
except ImportError:
    from auth import get_current_user
    from models import User

import google.generativeai as genai

router = APIRouter(prefix="/api/ai", tags=["AI"])

class AISuggestionRequest(BaseModel):
    class_name: str
    subject: str
    topic: str
    question_type: str
    count: int

@router.post("/suggest-questions")
def suggest_questions(
    req: AISuggestionRequest,
    current_user: User = Depends(get_current_user)
):
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    load_dotenv(dotenv_path=env_path)
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gemini API Key is not configured on the server. Tried loading from {env_path}"
        )

    genai.configure(api_key=api_key)
    
    # We use gemini-2.5-flash for fast and accurate json responses
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
You are an expert teacher for {req.class_name} {req.subject}.
Your task is to generate {req.count} questions of type '{req.question_type}' about the topic: '{req.topic}'.

Output ONLY a JSON array of objects. Do not include markdown blocks like ```json or any other text.
The JSON array should contain objects with the following structure:
{{
    "question_text": "The question text here",
    "answer_text": "The answer or explanation",
    "marks": 1,
    "sub_questions": [] // If it's an MCQ, provide 4 options as sub_questions like {{"text": "Option A", "type": "MCQ"}}, otherwise empty array.
}}

For MCQs, ensure 'question_text' is the main question, and 'sub_questions' contains exactly 4 options. Set the 'answer_text' to the correct option text.
For Short/Long answers, 'sub_questions' should be an empty array [].
"""

    try:
        response = model.generate_content(prompt)
        text_response = response.text.strip()
        
        # Cleanup in case the model returns markdown code blocks
        if text_response.startswith("```json"):
            text_response = text_response[7:]
        if text_response.endswith("```"):
            text_response = text_response[:-3]
            
        questions = json.loads(text_response.strip())
        return questions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate questions: {str(e)}"
        )
