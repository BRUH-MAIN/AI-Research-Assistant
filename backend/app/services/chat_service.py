"""
Chat service for managing chat sessions and messages
"""
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.db.redis_client import redis_client
from app.services.ai_service import ai_service
from app.models.chat import ChatMessage, ChatRequest, ChatResponse


class ChatService:
    """Service for managing chat sessions and messages"""
    
    @staticmethod
    def create_session() -> str:
        """Create a new chat session"""
        session_id = str(uuid.uuid4())
        session_data = {
            "session_id": session_id,
            "messages": [],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        success = redis_client.store_session(session_id, session_data)
        if not success:
            print(f"⚠️ Warning: Failed to store session {session_id} in Redis")
        return session_id
    
    @staticmethod
    def get_session_history(session_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get chat history for a session"""
        session = redis_client.get_session(session_id)
        if session:
            return session["messages"]
        return None
    
    @staticmethod
    def get_session_info(session_id: str) -> Optional[Dict[str, Any]]:
        """Get session information"""
        return redis_client.get_session_info(session_id)
    
    @staticmethod
    async def send_message(session_id: str, request: ChatRequest) -> Optional[ChatResponse]:
        """Send a message and get AI response"""
        session = redis_client.get_session(session_id)
        if not session:
            return None
        
        # Create user message
        user_message = ChatMessage(
            id=request.id,
            sender=request.sender,
            content=request.content,
            timestamp=request.timestamp
        )
        
        # Store user message
        success = redis_client.add_message_to_session(session_id, user_message.dict())
        if not success:
            print(f"⚠️ Warning: Failed to store user message for session {session_id}")
        
        # Generate AI response
        ai_response_content = await ai_service.generate_response(
            request.content, 
            session.get("messages", [])
        )
        
        # Create AI message
        ai_message = ChatMessage(
            id=str(uuid.uuid4()),
            sender="ai",
            content=ai_response_content,
            timestamp=datetime.now()
        )
        
        # Store AI message
        success = redis_client.add_message_to_session(session_id, ai_message.dict())
        if not success:
            print(f"⚠️ Warning: Failed to store AI message for session {session_id}")
        
        return ChatResponse(userMessage=user_message, aiMessage=ai_message)
    
    @staticmethod
    def delete_session(session_id: str) -> bool:
        """Delete a chat session"""
        return redis_client.delete_session(session_id)
    
    @staticmethod
    def get_all_sessions() -> List[str]:
        """Get all active session IDs (for debugging)"""
        return redis_client.get_all_sessions()


# Create global chat service instance
chat_service = ChatService()
