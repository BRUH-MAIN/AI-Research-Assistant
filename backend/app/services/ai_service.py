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
        
        # List of valid Groq models to try
        self.model_names = [
            "llama-3.1-8b-instant",
            "llama3-8b-8192", 
            "mixtral-8x7b-32768",
            "llama3-70b-8192",
            "gemma-7b-it"
        ]
        
        if self.configured:
            try:
                self.llm = ChatGroq(
                    groq_api_key=self.groq_api_key,
                    model_name=self.model_names[0],  # Start with first model
                    temperature=0.7,
                    max_tokens=1024,
                    timeout=60,
                    max_retries=2,
                )
                logger.info(f"ChatGroq initialized successfully with model: {self.model_names[0]}")
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
        
        # Try different models if one fails with 404
        for model_name in self.model_names:
            try:
                # Create a new LLM instance with current model
                llm = ChatGroq(
                    groq_api_key=self.groq_api_key,
                    model_name=model_name,
                    temperature=0.7,
                    max_tokens=1024,
                    timeout=60,
                    max_retries=2,
                )
                
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
                response = await llm.ainvoke(messages)
                
                # If successful, update the main LLM instance and return
                self.llm = llm
                logger.info(f"Successfully used model: {model_name}")
                return response.content
                
            except Exception as e:
                error_str = str(e)
                logger.warning(f"Model {model_name} failed: {error_str}")
                
                # If this is a 404 error, try the next model
                if "404" in error_str or "Not Found" in error_str:
                    continue
                else:
                    # For non-404 errors, raise immediately
                    logger.error(f"Error in AI response generation with {model_name}: {e}")
                    raise Exception(f"Failed to generate AI response: {str(e)}")
        
        # If all models failed
        raise Exception(f"Failed to generate AI response: All models failed. Tried: {', '.join(self.model_names)}")
    
    async def generate_simple_response(self, prompt: str) -> str:
        """
        Generate a simple response for legacy endpoint using Groq
        """
        if not self.configured:
            raise Exception("AI service not configured - missing GROQ_API_KEY")
        
        # Try different models if one fails with 404
        for model_name in self.model_names:
            try:
                # Create a new LLM instance with current model
                llm = ChatGroq(
                    groq_api_key=self.groq_api_key,
                    model_name=model_name,
                    temperature=0.7,
                    max_tokens=1024,
                    timeout=60,
                    max_retries=2,
                )
                
                # Create a simple conversation for the legacy endpoint
                messages = [
                    SystemMessage(content="You are a helpful AI assistant. Provide clear and concise responses."),
                    HumanMessage(content=prompt)
                ]
                
                # Generate response using ChatGroq
                response = await llm.ainvoke(messages)
                
                # If successful, update the main LLM instance and return
                self.llm = llm
                logger.info(f"Successfully used model: {model_name}")
                return response.content
                
            except Exception as e:
                error_str = str(e)
                logger.warning(f"Model {model_name} failed: {error_str}")
                
                # If this is a 404 error, try the next model
                if "404" in error_str or "Not Found" in error_str:
                    continue
                else:
                    # For non-404 errors, raise immediately
                    logger.error(f"Error in simple AI response generation with {model_name}: {e}")
                    raise Exception(f"Failed to generate AI response: {str(e)}")
        
        # If all models failed
        raise Exception(f"Failed to generate AI response: All models failed. Tried: {', '.join(self.model_names)}")


# Global instance
ai_service = AIService()