"""
Chat endpoints router
"""
from fastapi import APIRouter, HTTPException

from app.models.chat import (
    ChatRequest, 
    ChatResponse, 
    SessionCreate, 
    SessionHistory,
    PromptRequest,
    PromptResponse,
    GroupChatRequest,
    GroupChatResponse
)
from app.models.responses import SuccessResponse
from app.services.chat_service import chat_service
from app.services.ai_service import ai_service

router = APIRouter()


@router.post("/sessions", response_model=SessionCreate)
async def create_session():
    """Create a new chat session"""
    session_id = chat_service.create_session()
    return SessionCreate(session_id=session_id)


@router.get("/{session_id}/history", response_model=SessionHistory)
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    messages = chat_service.get_session_history(session_id)
    if messages is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SessionHistory(messages=messages)


@router.post("/paper-message", response_model=GroupChatResponse)
async def handle_paper_message(request: GroupChatRequest):
    """Handle @paper invocation from group chat - RAG-enabled AI responses"""
    if not ai_service.is_configured():
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        from app.services.express_client import express_db_client
        from app.services.rag_service import RAGService, QuestionRequest
        import time
        
        # Check if session has RAG enabled
        rag_status = await express_db_client.get_session_rag_status(request.session_id)
        if not rag_status or not rag_status.get("is_rag_enabled", False):
            return GroupChatResponse(
                response="📚 RAG is not enabled for this session. Please enable RAG first to use @paper. For general AI assistance, use @ai instead.",
                session_id=request.session_id,
                model="rag-disabled"
            )
        
        # Get session papers with RAG status
        papers = await express_db_client.get_session_papers_with_rag_status(request.session_id)
        processed_papers = [p for p in papers if p.get("rag_status") == "completed"]
        
        if not processed_papers:
            return GroupChatResponse(
                response="📄 No processed papers found in this session. Please add and process some papers first to use @paper. For general AI assistance, use @ai instead.",
                session_id=request.session_id,
                model="no-papers"
            )
        
        # Use session-scoped RAG service to answer the question
        rag_service = RAGService()
        start_time = time.time()
        
        # Clean the message by removing @paper trigger
        clean_message = request.user_message
        for trigger in ['@paper', '/paper']:
            clean_message = clean_message.replace(trigger, '').strip()
        
        if not clean_message:
            return GroupChatResponse(
                response="📝 Please provide a question along with @paper. For example: '@paper What are the main findings in the uploaded papers?'",
                session_id=request.session_id,
                model="empty-question"
            )
        
        # Create question request for RAG
        question_request = QuestionRequest(
            question=clean_message,
            max_chunks=5,
            search_type="hybrid"
        )
        
        # Get file names of processed papers for session-scoped search
        session_files = [p["rag_file_name"] for p in processed_papers if p["rag_file_name"]]
        
        # Get session-scoped RAG response
        rag_result = await rag_service.ask_question_session_scoped(question_request, session_files)
        processing_time = int((time.time() - start_time) * 1000)
        
        # Format response with sources if available
        response_text = rag_result.answer
        if rag_result.sources:
            response_text += "\n\n**Sources:**\n"
            for i, source in enumerate(rag_result.sources[:3], 1):  # Limit to top 3 sources
                paper_title = source.get("paper_title", source.get("source", "Unknown"))
                response_text += f"{i}. {paper_title}"
                if source.get("page"):
                    response_text += f" (Page {source['page']})"
                response_text += "\n"
        
        # Record RAG chat metadata
        if request.trigger_message_id:
            await express_db_client.create_rag_chat_metadata(
                message_id=request.trigger_message_id,
                session_id=request.session_id,
                used_rag=True,
                sources_used=[s.get("source", "") for s in rag_result.sources] if rag_result.sources else [],
                chunks_retrieved=len(rag_result.sources) if rag_result.sources else 0,
                processing_time_ms=processing_time,
                model_used="rag-enhanced"
            )
        
        return GroupChatResponse(
            response=response_text,
            session_id=request.session_id,
            model="rag-enhanced",
            metadata={
                "used_rag": True,
                "sources_used": [s.get("source", "") for s in rag_result.sources] if rag_result.sources else [],
                "chunks_retrieved": len(rag_result.sources) if rag_result.sources else 0,
                "processing_time_ms": processing_time,
                "session_papers_count": len(processed_papers)
            }
        )
        
    except Exception as e:
        return GroupChatResponse(
            response=f"❌ I encountered an error while processing your request with @paper: {str(e)}. Please try again or use @ai for general assistance.",
            session_id=request.session_id,
            model="error"
        )


@router.post("/group-message", response_model=GroupChatResponse)
async def handle_group_message(request: GroupChatRequest):
    """Handle @ai invocation from group chat - General purpose AI responses"""
    if not ai_service.is_configured():
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    try:
        # Clean the message by removing @ai triggers
        clean_message = request.user_message
        for trigger in ['@ai', '/ai', '@assistant']:
            clean_message = clean_message.replace(trigger, '').strip()
        
        if not clean_message:
            clean_message = "Hello! How can I help you today?"
        
        # Generate AI response based on the user message
        # You can enhance this to include group context, previous messages, etc.
        ai_response = await ai_service.generate_simple_response(clean_message)
        
        return GroupChatResponse(
            response=ai_response,
            session_id=request.session_id,
            model="groq-general",
            metadata={
                "used_rag": False,
                "ai_type": "general"
            }
        )
    except Exception as e:
        return GroupChatResponse(
            response=f"❌ I encountered an error while processing your request: {str(e)}. Please try again.",
            session_id=request.session_id,
            model="error"
        )


@router.post("/{session_id}", response_model=ChatResponse)
async def send_message(session_id: str, request: ChatRequest):
    """Send a message and get AI response"""
    response = await chat_service.send_message(session_id, request)
    if response is None:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return response


@router.delete("/{session_id}", response_model=SuccessResponse)
async def delete_session(session_id: str):
    """Delete a chat session"""
    success = chat_service.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SuccessResponse(message="Session deleted successfully")


# Legacy endpoint for backward compatibility
@router.post("", response_model=PromptResponse)
async def process_prompt_legacy(request: PromptRequest):
    """
    Legacy endpoint for backward compatibility
    Process a prompt using Groq without session management
    """
    if not ai_service.is_configured():
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    response_content = await ai_service.generate_simple_response(request.prompt)
    return PromptResponse(response=response_content)
