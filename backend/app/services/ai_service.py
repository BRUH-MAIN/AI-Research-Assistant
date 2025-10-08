"""
AI service for generating responses using Groq and Gemini via LangChain
"""
import os
import logging
from typing import List, Optional

from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate

from app.models.chat import ChatMessage

logger = logging.getLogger(__name__)


class AIService:
    """Service for AI response generation using Groq and Gemini with fallback"""
    
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        
        # Initialize providers
        self.groq_llm = None
        self.gemini_llm = None
        self.configured = False
        
        # Try to initialize Groq first
        if self.groq_api_key:
            try:
                self.groq_llm = ChatGroq(
                    groq_api_key=self.groq_api_key,
                    model_name="llama-3.3-70b-versatile",  # Updated to working Groq model
                    temperature=0.7,
                    max_tokens=1024,
                    timeout=60,
                    max_retries=2,
                )
                self.configured = True
                logger.info("ChatGroq initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize ChatGroq: {e}")
        
        # Try to initialize Gemini as fallback
        if self.gemini_api_key:
            try:
                self.gemini_llm = ChatGoogleGenerativeAI(
                    google_api_key=self.gemini_api_key,
                    model="gemini-2.5-flash",  # Use stable Gemini model
                    temperature=0.7,
                    max_tokens=1024,
                    timeout=60,
                    max_retries=2,
                )
                self.configured = True
                logger.info("ChatGoogleGenerativeAI (Gemini) initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")
        
        if not self.configured:
            logger.warning("No AI services configured - missing GROQ_API_KEY and GEMINI_API_KEY")
    
    def is_configured(self) -> bool:
        """Check if AI service is properly configured"""
        return self.configured
    
    async def _try_llm_providers(self, messages: List) -> str:
        """Try different LLM providers in order of preference"""
        
        # Try Groq first if available
        if self.groq_llm:
            try:
                logger.info("Trying Groq...")
                response = await self.groq_llm.ainvoke(messages)
                logger.info("Groq response successful")
                return response.content
            except Exception as e:
                logger.warning(f"Groq failed: {str(e)}")
                
        # Fallback to Gemini if Groq fails or unavailable
        if self.gemini_llm:
            try:
                logger.info("Trying Gemini as fallback...")
                response = await self.gemini_llm.ainvoke(messages)
                logger.info("Gemini response successful")
                return response.content
            except Exception as e:
                logger.error(f"Gemini fallback failed: {str(e)}")
                
        # If all providers fail
        raise Exception("All AI providers failed. Please check your API keys and network connection.")
    
    async def generate_response(self, message: str, chat_history: List[ChatMessage]) -> str:
        """
        Generate AI response based on message and chat history using Groq/Gemini
        """
        if not self.configured:
            raise Exception("AI service not configured - missing GROQ_API_KEY and GEMINI_API_KEY")
        
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
            
            # Try providers with fallback
            return await self._try_llm_providers(messages)
                
        except Exception as e:
            logger.error(f"Error in AI response generation: {e}")
            raise Exception(f"Failed to generate AI response: {str(e)}")
    
    async def generate_simple_response(self, prompt: str) -> str:
        """
        Generate a simple response for legacy endpoint using Groq/Gemini
        """
        if not self.configured:
            raise Exception("AI service not configured - missing GROQ_API_KEY and GEMINI_API_KEY")
        
        try:
            # Create a simple conversation for the legacy endpoint
            messages = [
                SystemMessage(content="You are a helpful AI assistant. Provide clear and concise responses."),
                HumanMessage(content=prompt)
            ]
            
            # Try providers with fallback
            return await self._try_llm_providers(messages)
                
        except Exception as e:
            logger.error(f"Error in simple AI response generation: {e}")
            raise Exception(f"Failed to generate AI response: {str(e)}")


# Global instance
ai_service = AIService()