"""
AI service for generating responses using Groq
"""
from typing import List, Dict, Any, Optional
from langchain_groq import ChatGroq

from app.core.config import settings


class AIService:
    """Service for AI response generation using Groq"""
    
    def __init__(self):
        """Initialize Groq LLM"""
        self.llm = None
        if settings.GROQ_API_KEY:
            try:
                self.llm = ChatGroq(
                    groq_api_key=settings.GROQ_API_KEY,
                    model_name=settings.GROQ_MODEL_NAME
                )
                print("✅ Groq LLM initialized successfully")
            except Exception as e:
                print(f"❌ Failed to initialize Groq LLM: {e}")
        else:
            print("⚠️ Warning: GROQ_API_KEY not found in environment variables")
    
    def is_configured(self) -> bool:
        """Check if AI service is properly configured"""
        return self.llm is not None
    
    async def generate_response(
        self, 
        user_input: str, 
        conversation_history: List[Dict[str, Any]]
    ) -> str:
        """
        Generate AI response using Groq with conversation context
        
        Args:
            user_input: The user's message
            conversation_history: List of previous messages
            
        Returns:
            Generated AI response
        """
        try:
            if not self.llm:
                return "Error: AI service not configured. Please check your API key."
            
            if not user_input.strip():
                return "Error: Empty message received."
            
            # Build context from conversation history
            context_messages = []
            recent_history = conversation_history[-settings.MAX_CONVERSATION_HISTORY:]
            
            for msg in recent_history:
                if isinstance(msg, dict) and 'content' in msg and 'sender' in msg:
                    role = "Human" if msg['sender'] == 'user' else "Assistant"
                    context_messages.append(f"{role}: {msg['content']}")
            
            # Create prompt with context
            if context_messages:
                context_str = "\n".join(context_messages)
                full_prompt = f"Previous conversation:\n{context_str}\n\nHuman: {user_input}\nAssistant:"
            else:
                full_prompt = f"Human: {user_input}\nAssistant:"
            
            # Generate response using Groq
            response = self.llm.invoke(full_prompt)
            response_content = response.content if hasattr(response, 'content') else str(response)
            
            print(f"User input: {user_input}")
            print(f"Groq response: {response_content}")
            
            return response_content
            
        except Exception as e:
            error_msg = f"Sorry, I encountered an error: {str(e)}"
            print(f"Error generating AI response: {error_msg}")
            return error_msg
    
    async def generate_simple_response(self, prompt: str) -> str:
        """
        Generate a simple AI response without conversation context (legacy support)
        
        Args:
            prompt: The user's prompt
            
        Returns:
            Generated AI response
        """
        try:
            if not self.llm:
                raise Exception("AI service not configured")
            
            if not prompt.strip():
                raise Exception("Prompt cannot be empty")
            
            # Process the prompt with Groq
            response = self.llm.invoke(prompt)
            response_content = response.content if hasattr(response, 'content') else str(response)
            
            print(f"Legacy prompt: {prompt}")
            print(f"Groq response: {response_content}")
            
            return response_content
            
        except Exception as e:
            print(f"Error processing legacy prompt: {str(e)}")
            raise


# Create global AI service instance
ai_service = AIService()
