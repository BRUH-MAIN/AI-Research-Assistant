# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from redis_client import redis_client

# Load environment variables
load_dotenv()

app = FastAPI(title="Chatbot API with Redis History", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Next.js and Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq LLM
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    print("Warning: GROQ_API_KEY not found in environment variables")
    llm = None
else:
    llm = ChatGroq(
        groq_api_key=groq_api_key,
        model_name="llama-3.1-8b-instant"  # You can change this to other Groq models
    )

class ChatMessage(BaseModel):
    id: str
    sender: str
    content: str
    timestamp: datetime

class ChatRequest(BaseModel):
    id: str
    sender: str
    content: str
    timestamp: datetime

class ChatResponse(BaseModel):
    userMessage: ChatMessage
    aiMessage: ChatMessage

# Legacy endpoint for backward compatibility
class PromptRequest(BaseModel):
    prompt: str

class PromptResponse(BaseModel):
    response: str

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Chatbot API with Redis History is running!"}

@app.get("/api/status")
async def get_status():
    """Get API status"""
    return {
        "status": "online",
        "groq_configured": llm is not None,
        "redis_connected": True,  # We can add a proper check here
        "version": "1.0.0"
    }

@app.post("/api/chat/sessions")
async def create_session():
    """Create a new chat session"""
    session_id = str(uuid.uuid4())
    session_data = {
        "session_id": session_id,
        "messages": [],
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    redis_client.store_session(session_id, session_data)
    return {"session_id": session_id}

@app.get("/api/chat/{session_id}/history")
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    session = redis_client.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"messages": session["messages"]}

@app.post("/api/chat/{session_id}")
async def send_message(session_id: str, request: ChatRequest) -> ChatResponse:
    """Send a message and get AI response"""
    session = redis_client.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Store user message
    user_message = ChatMessage(
        id=request.id,
        sender=request.sender,
        content=request.content,
        timestamp=request.timestamp
    )
    
    redis_client.add_message_to_session(session_id, user_message.dict())
    
    # Generate AI response (replace with your AI logic)
    ai_response_content = await generate_ai_response(request.content, session["messages"])
    
    ai_message = ChatMessage(
        id=str(uuid.uuid4()),
        sender="ai",
        content=ai_response_content,
        timestamp=datetime.now()
    )
    
    redis_client.add_message_to_session(session_id, ai_message.dict())
    
    return ChatResponse(userMessage=user_message, aiMessage=ai_message)

@app.delete("/api/chat/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session"""
    redis_client.delete_session(session_id)
    return {"message": "Session deleted"}

@app.get("/api/debug/sessions")
async def debug_sessions():
    """Debug endpoint to see all active sessions"""
    sessions = redis_client.get_all_sessions()
    return {"active_sessions": sessions, "count": len(sessions)}

@app.get("/api/debug/redis")
async def debug_redis():
    """Debug endpoint to test Redis connection"""
    try:
        redis_client.redis_client.ping()    
        return {"status": "connected", "message": "Redis Cloud connection successful"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Legacy endpoint for backward compatibility
@app.post("/api/chat", response_model=PromptResponse)
async def process_prompt_legacy(request: PromptRequest):
    """
    Legacy endpoint for backward compatibility
    Process a prompt using Groq without session management
    """
    try:
        if not llm:
            raise HTTPException(status_code=500, detail="Groq API key not configured")
        
        if not request.prompt.strip():
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")
        
        # Process the prompt with Groq
        response = llm.invoke(request.prompt)
        response_content = response.content if hasattr(response, 'content') else str(response)
        
        print(f"Legacy - User prompt: {request.prompt}")
        print(f"Legacy - Groq response: {response_content}")
        
        return PromptResponse(response=response_content)
    
    except Exception as e:
        print(f"Error processing legacy prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing prompt: {str(e)}")

async def generate_ai_response(user_input: str, conversation_history: List[dict]) -> str:
    """
    Generate AI response using Groq with conversation context
    """
    try:
        if not llm:
            return "Error: Groq API key not configured"
        
        # Build context from conversation history
        context_messages = []
        for msg in conversation_history[-10:]:  # Use last 10 messages for context
            if isinstance(msg, dict) and 'content' in msg and 'sender' in msg:
                role = "human" if msg['sender'] == 'user' else "assistant"
                context_messages.append(f"{role}: {msg['content']}")
        
        # Create prompt with context
        if context_messages:
            context_str = "\n".join(context_messages)
            full_prompt = f"Previous conversation:\n{context_str}\n\nHuman: {user_input}\nAssistant:"
        else:
            full_prompt = user_input
        
        # Generate response using Groq
        response = llm.invoke(full_prompt)
        response_content = response.content if hasattr(response, 'content') else str(response)
        
        print(f"User input: {user_input}")
        print(f"Groq response: {response_content}")
        
        return response_content
        
    except Exception as e:
        print(f"Error generating AI response: {str(e)}")
        return f"Sorry, I encountered an error: {str(e)}"

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)