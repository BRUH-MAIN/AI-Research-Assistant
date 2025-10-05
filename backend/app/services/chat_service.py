"""
Chat service for managing chat sessions and messages
"""
import uuid
from typing import Dict, List, Optional
from datetime import datetime
import logging

from app.models.chat import ChatRequest, ChatResponse, ChatMessage
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)


class ChatService:
    """Service for handling chat sessions and messages"""
    
    def __init__(self):
        self.sessions: Dict[str, List[ChatMessage]] = {}
    
    def create_session(self) -> str:
        """Create a new chat session and return session ID"""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = []
        logger.info(f"Created new chat session: {session_id}")
        return session_id
    
    def get_session_history(self, session_id: str) -> Optional[List[ChatMessage]]:
        """Get chat history for a session"""
        if session_id not in self.sessions:
            logger.warning(f"Session not found: {session_id}")
            return None
        
        return self.sessions[session_id]
    
    async def send_message(self, session_id: str, request: ChatRequest) -> Optional[ChatResponse]:
        """Send a message to a session and get AI response"""
        if session_id not in self.sessions:
            logger.warning(f"Session not found: {session_id}")
            return None
        
        # Create user message
        user_message = ChatMessage(
            id=str(uuid.uuid4()),
            content=request.message,
            role="user",
            timestamp=datetime.now(),
            user_id=request.user_id
        )
        
        # Add user message to session
        self.sessions[session_id].append(user_message)
        
        # Generate AI response
        try:
            ai_response_content = await ai_service.generate_response(
                request.message, 
                self.sessions[session_id]
            )
            
            # Create AI response message
            ai_message = ChatMessage(
                id=str(uuid.uuid4()),
                content=ai_response_content,
                role="assistant",
                timestamp=datetime.now()
            )
            
            # Add AI message to session
            self.sessions[session_id].append(ai_message)
            
            return ChatResponse(
                message=ai_message,
                session_id=session_id
            )
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            # Create error response
            error_message = ChatMessage(
                id=str(uuid.uuid4()),
                content="I'm sorry, I encountered an error while processing your message. Please try again.",
                role="assistant",
                timestamp=datetime.now()
            )
            
            self.sessions[session_id].append(error_message)
            
            return ChatResponse(
                message=error_message,
                session_id=session_id
            )
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a chat session"""
        if session_id not in self.sessions:
            logger.warning(f"Session not found for deletion: {session_id}")
            return False
        
        del self.sessions[session_id]
        logger.info(f"Deleted chat session: {session_id}")
        return True
    
    def get_all_sessions(self) -> Dict[str, int]:
        """Get all active sessions with message counts"""
        return {
            session_id: len(messages) 
            for session_id, messages in self.sessions.items()
        }


# Global instance
chat_service = ChatService()