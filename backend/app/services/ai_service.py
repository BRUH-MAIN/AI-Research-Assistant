"""
AI service for generating responses using Groq via LangChain
"""
import os
import logging
from typing import List, Optional

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate

from app.models.chat import ChatMessage

logger = logging.getLogger(__name__)


class AIService:
    """Service for AI response generation using Groq"""
    
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.configured = bool(self.groq_api_key)
        
        if self.configured:
            try:
                self.llm = ChatGroq(
                    groq_api_key=self.groq_api_key,
                    model_name="llama-3.1-8b-instant",  # Updated to supported model
                    temperature=0.7,
                    max_tokens=1024,
                    timeout=60,
                    max_retries=2,
                )
                logger.info("ChatGroq initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize ChatGroq: {e}")
                self.configured = False
        else:
            logger.warning("GROQ_API_KEY not found in environment variables")
    
    def is_configured(self) -> bool:
        """Check if AI service is properly configured"""
        return self.configured
    
    async def generate_response(self, message: str, chat_history: List[ChatMessage]) -> str:
        """
        Generate AI response based on message and chat history using Groq
        """
        if not self.configured:
            raise Exception("AI service not configured - missing GROQ_API_KEY")
        
        try:
            # Build conversation history for context
            messages = []
            
            # Add system message
            system_prompt = """You are a helpful AI research assistant. You provide accurate, helpful, and concise responses to user questions. You can help with research topics, answer questions, and provide explanations on various subjects."""
            messages.append(SystemMessage(content=system_prompt))
            
            # Add recent chat history for context (last 10 messages)
            recent_history = chat_history[-10:] if len(chat_history) > 10 else chat_history
            for msg in recent_history:
                if msg.role == "user":
                    messages.append(HumanMessage(content=msg.content))
                elif msg.role == "assistant":
                    messages.append(AIMessage(content=msg.content))
            
            # Add current user message
            messages.append(HumanMessage(content=message))
            
            # Generate response using ChatGroq
            response = await self.llm.ainvoke(messages)
            
            return response.content
                
        except Exception as e:
            logger.error(f"Error in AI response generation: {e}")
            raise Exception(f"Failed to generate AI response: {str(e)}")
    
    async def generate_simple_response(self, prompt: str) -> str:
        """
        Generate a simple response for legacy endpoint using Groq
        """
        if not self.configured:
            raise Exception("AI service not configured - missing GROQ_API_KEY")
        
        try:
            # Create a simple conversation for the legacy endpoint
            messages = [
                SystemMessage(content="You are a helpful AI assistant. Provide clear and concise responses."),
                HumanMessage(content=prompt)
            ]
            
            # Generate response using ChatGroq
            response = await self.llm.ainvoke(messages)
            
            return response.content
                
        except Exception as e:
            logger.error(f"Error in simple AI response generation: {e}")
            raise Exception(f"Failed to generate AI response: {str(e)}")


# Global instance
ai_service = AIService()