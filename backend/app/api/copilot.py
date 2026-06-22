from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.app.core.database import get_db
from backend.app.models import ChatHistory, User
from backend.app.schemas import ChatRequest, ChatResponse, ChatMessage
from backend.app.api.deps import get_current_user
from backend.app.services.rag_service import rag_service

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
def copilot_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    RAG chat endpoint. Evaluates search queries, retrieves resumes, and answers questions with conversational context.
    """
    # Fetch historical context for session_id
    history = db.query(ChatHistory).filter(
        ChatHistory.session_id == payload.session_id
    ).order_by(ChatHistory.created_at.asc()).all()
    
    chat_history_list = [
        {"role": h.role, "content": h.message_text} for h in history
    ]
    
    # Run retrieval-augmented query
    result = rag_service.answer_query(
        query=payload.message,
        job_id=payload.job_id,
        chat_history=chat_history_list
    )
    
    # Save user message
    user_msg = ChatHistory(
        session_id=payload.session_id,
        role="user",
        message_text=payload.message
    )
    db.add(user_msg)
    
    # Save assistant answer
    assistant_msg = ChatHistory(
        session_id=payload.session_id,
        role="assistant",
        message_text=result["answer"]
    )
    db.add(assistant_msg)
    db.commit()
    
    return {
        "answer": result["answer"],
        "session_id": payload.session_id,
        "suggested_candidates": result["suggested_candidates"]
    }

@router.get("/history/{session_id}", response_model=List[ChatMessage])
def get_chat_history(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves conversational memory for a given session.
    """
    history = db.query(ChatHistory).filter(
        ChatHistory.session_id == session_id
    ).order_by(ChatHistory.created_at.asc()).all()
    return history

@router.delete("/history/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def clear_chat_history(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Clears conversation logs for a session.
    """
    db.query(ChatHistory).filter(ChatHistory.session_id == session_id).delete()
    db.commit()
    return None
