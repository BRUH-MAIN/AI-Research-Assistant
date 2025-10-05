"""
Session-based RAG endpoints for AI Research Assistant.
Provides session-scoped RAG functionality with Express DB integration.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from pathlib import Path
import os
import shutil
import time

from app.services.rag_service import RAGService, QuestionRequest, QuestionResponse
from app.services.express_client import express_db_client

router = APIRouter()

# Initialize RAG service
def get_rag_service():
    """Get RAG service instance."""
    return RAGService()

@router.get("/")
async def session_rag_root():
    """Session RAG endpoints root with available endpoints information."""
    return {
        "message": "Session-based RAG Endpoints - AI Research Assistant",
        "version": "1.0.0",
        "description": "Session-scoped RAG functionality with metadata persistence",
        "endpoints": {
            "auto_process_paper": "POST /session-rag/{session_id}/papers/auto-process",
            "auto_fetch_papers": "POST /session-rag/{session_id}/papers/auto-fetch",
            "fetch_from_arxiv": "POST /session-rag/{session_id}/papers/{paper_id}/fetch-from-arxiv",
            "upload_paper": "POST /session-rag/{session_id}/papers/upload",
            "process_paper": "POST /session-rag/{session_id}/papers/{paper_id}/process",
            "remove_paper": "DELETE /session-rag/{session_id}/papers/{paper_id}",
            "get_papers": "GET /session-rag/{session_id}/papers",
            "enable_rag": "POST /session-rag/{session_id}/enable",
            "disable_rag": "POST /session-rag/{session_id}/disable",
            "ask_question": "POST /session-rag/{session_id}/ask",
            "get_status": "GET /session-rag/{session_id}/status"
        }
    }

@router.post("/{session_id}/papers/auto-process")
async def auto_process_paper_for_rag(
    session_id: int,
    paper_id: int = Form(...),
    pdf_url: str = Form(...),
    title: str = Form(...),
    authors: str = Form(None),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Automatically download and process a paper for RAG when added to session.
    This is triggered when papers are linked to sessions with RAG enabled.
    """
    try:
        import requests
        import tempfile
        from fastapi import UploadFile
        from io import BytesIO
        
        # Check if paper is already processed
        rag_doc = await express_db_client.get_rag_document_by_paper_id(paper_id)
        if rag_doc and rag_doc["processing_status"] == "completed":
            return {
                "success": True,
                "message": "Paper already processed",
                "paper_id": paper_id,
                "status": "already_completed"
            }
        
        # Download the PDF from URL
        try:
            response = requests.get(pdf_url, timeout=30)
            response.raise_for_status()
            
            if 'application/pdf' not in response.headers.get('content-type', '').lower():
                # If it's not a direct PDF, try to append .pdf to the URL
                if not pdf_url.endswith('.pdf'):
                    pdf_url_with_ext = pdf_url.replace('/abs/', '/pdf/') + '.pdf'
                    response = requests.get(pdf_url_with_ext, timeout=30)
                    response.raise_for_status()
            
            pdf_content = response.content
            
        except Exception as download_error:
            error_msg = f"Failed to download PDF from {pdf_url}: {str(download_error)}"
            # Create/update RAG document entry with failed status
            if rag_doc:
                await express_db_client.update_rag_document_status(
                    paper_id=paper_id,
                    processing_status="failed",
                    processing_error=error_msg
                )
            else:
                await express_db_client.create_rag_document(
                    paper_id=paper_id,
                    file_name=f"paper_{paper_id}_{title.replace(' ', '_')[:30]}.pdf",
                    file_path="download_failed"
                )
                await express_db_client.update_rag_document_status(
                    paper_id=paper_id,
                    processing_status="failed",
                    processing_error=error_msg
                )
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Create filename and save to FastAPI input directory
        safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()[:50]
        file_name = f"paper_{paper_id}_{safe_title.replace(' ', '_')}.pdf"
        file_path = os.path.join(rag_service.input_folder, file_name)
        
        # Ensure input directory exists
        os.makedirs(rag_service.input_folder, exist_ok=True)
        
        # Save PDF content to file
        with open(file_path, "wb") as f:
            f.write(pdf_content)
        
        # Create or update RAG document entry
        if not rag_doc:
            rag_doc = await express_db_client.create_rag_document(
                paper_id=paper_id,
                file_name=file_name,
                file_path=file_path
            )
        else:
            # Update with new file info - can't update file details in status endpoint
            # Just update status to pending, file info was set during creation
            rag_doc = await express_db_client.update_rag_document_status(
                paper_id=paper_id,
                processing_status="pending"
            )
        
        if not rag_doc:
            # Clean up file if DB operation failed
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=500, detail="Failed to create RAG document entry")
        
        # Update status to processing
        await express_db_client.update_rag_document_status(
            paper_id=paper_id,
            processing_status="processing"
        )
        
        # Process the document with RAG service
        start_time = time.time()
        
        try:
            # Create UploadFile-like object for processing
            file_obj = UploadFile(
                filename=file_name,
                file=BytesIO(pdf_content)
            )
            
            # Process with RAG service, pass paper_id for arXiv metadata storage
            result = await rag_service.upload_document(file_obj, upsert_to_index=True, paper_id=paper_id)
            
            processing_time = int((time.time() - start_time) * 1000)  # Convert to ms
            
            # Check if upload was successful based on the actual return structure
            if result.get("upserted", False) and result.get("chunks_upserted", 0) > 0:
                # Update status to completed
                chunks_count = result.get("chunks_upserted", 0)
                # Generate vector IDs based on filename and chunks (since upload_document doesn't return them)
                vector_ids = []
                for i in range(chunks_count):
                    vector_ids.append(f"{file_name}_chunk_{i}")
                
                await express_db_client.update_rag_document_status(
                    paper_id=paper_id,
                    processing_status="completed",
                    chunks_count=chunks_count,
                    vector_store_ids=vector_ids
                )
                
                return {
                    "success": True,
                    "message": f"Paper automatically downloaded and processed for session {session_id}",
                    "paper_id": paper_id,
                    "file_name": file_name,
                    "file_path": file_path,
                    "processing_time_ms": processing_time,
                    "chunks_count": chunks_count,
                    "vector_ids_count": len(vector_ids),
                    "status": "completed",
                    "download_source": pdf_url,
                    "rag_result": result
                }
            else:
                # Update status to failed
                error_msg = result.get("upsert_error", "Failed to upsert chunks to vector store")
                await express_db_client.update_rag_document_status(
                    paper_id=paper_id,
                    processing_status="failed",
                    processing_error=error_msg
                )
                
                raise HTTPException(status_code=500, detail=f"RAG processing failed: {error_msg}")
                
        except Exception as process_error:
            # Update status to failed
            await express_db_client.update_rag_document_status(
                paper_id=paper_id,
                processing_status="failed",
                processing_error=str(process_error)
            )
            raise HTTPException(status_code=500, detail=f"Error processing document: {str(process_error)}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in auto-processing: {str(e)}")


@router.post("/{session_id}/papers/upload")
async def upload_paper_to_session(
    session_id: int,
    paper_id: int = Form(...),
    file: UploadFile = File(...),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Upload a PDF paper to a session and store it in FastAPI input directory.
    Creates RAG document entry in Express DB but doesn't process it yet.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Create filename using paper_id to avoid duplicates
        file_name = f"paper_{paper_id}_{file.filename}"
        file_path = os.path.join(rag_service.input_folder, file_name)
        
        # Ensure input directory exists
        os.makedirs(rag_service.input_folder, exist_ok=True)
        
        # Save file to FastAPI input directory
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Create RAG document entry in Express DB
        rag_doc = await express_db_client.create_rag_document(
            paper_id=paper_id,
            file_name=file_name,
            file_path=file_path
        )
        
        if not rag_doc:
            # Clean up file if DB operation failed
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=500, detail="Failed to create RAG document entry")
        
        return {
            "success": True,
            "message": f"Paper uploaded successfully to session {session_id}",
            "paper_id": paper_id,
            "file_name": file_name,
            "file_path": file_path,
            "file_size": os.path.getsize(file_path),
            "rag_document": rag_doc,
            "status": "uploaded_not_processed"
        }
        
    except Exception as e:
        # Clean up file if something went wrong
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error uploading paper: {str(e)}")

@router.post("/{session_id}/papers/{paper_id}/process")
async def process_paper_for_rag(
    session_id: int,
    paper_id: int,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Process a paper for RAG (extract chunks and add to vector store).
    This is the manual trigger for RAG processing.
    """
    try:
        # Get RAG document info from Express DB
        rag_doc = await express_db_client.get_rag_document_by_paper_id(paper_id)
        if not rag_doc:
            raise HTTPException(status_code=404, detail="RAG document not found for this paper")
        
        if rag_doc["processing_status"] == "completed":
            return {
                "success": True,
                "message": "Paper already processed",
                "paper_id": paper_id,
                "chunks_count": rag_doc["chunks_count"],
                "status": "already_completed"
            }
        
        # Update status to processing
        await express_db_client.update_rag_document_status(
            paper_id=paper_id,
            processing_status="processing"
        )
        
        file_path = rag_doc["file_path"]
        if not os.path.exists(file_path):
            await express_db_client.update_rag_document_status(
                paper_id=paper_id,
                processing_status="failed",
                processing_error="File not found"
            )
            raise HTTPException(status_code=404, detail="Paper file not found")
        
        # Process the document with RAG service
        start_time = time.time()
        
        # Use the existing upload_document method but with our file
        with open(file_path, "rb") as f:
            from fastapi import UploadFile
            from io import BytesIO
            
            # Create UploadFile-like object
            file_content = f.read()
            file_obj = UploadFile(
                filename=rag_doc["file_name"],
                file=BytesIO(file_content)
            )
            
            # Process with RAG service, pass paper_id for arXiv metadata storage
            result = await rag_service.upload_document(file_obj, upsert_to_index=True, paper_id=paper_id)
        
        processing_time = int((time.time() - start_time) * 1000)  # Convert to ms
        
        # Check if upload was successful based on the actual return structure
        if result.get("upserted", False) and result.get("chunks_upserted", 0) > 0:
            # Update status to completed
            chunks_count = result.get("chunks_upserted", 0)
            # Generate vector IDs based on filename and chunks (since upload_document doesn't return them)
            vector_ids = []
            for i in range(chunks_count):
                vector_ids.append(f"{rag_doc['file_name']}_chunk_{i}")
            
            await express_db_client.update_rag_document_status(
                paper_id=paper_id,
                processing_status="completed",
                chunks_count=chunks_count,
                vector_store_ids=vector_ids
            )
            
            return {
                "success": True,
                "message": f"Paper processed successfully for session {session_id}",
                "paper_id": paper_id,
                "processing_time_ms": processing_time,
                "chunks_count": chunks_count,
                "vector_ids_count": len(vector_ids),
                "status": "completed",
                "rag_result": result
            }
        else:
            # Update status to failed
            error_msg = result.get("upsert_error", "Failed to upsert chunks to vector store")
            await express_db_client.update_rag_document_status(
                paper_id=paper_id,
                processing_status="failed",
                processing_error=error_msg
            )
            
            raise HTTPException(status_code=500, detail=f"RAG processing failed: {error_msg}")
            
    except HTTPException:
        raise
    except Exception as e:
        # Update status to failed
        await express_db_client.update_rag_document_status(
            paper_id=paper_id,
            processing_status="failed",
            processing_error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Error processing paper: {str(e)}")

@router.delete("/{session_id}/papers/{paper_id}")
async def remove_paper_from_session(
    session_id: int,
    paper_id: int,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Remove a paper from session RAG (delete file and remove from vector store).
    """
    try:
        # Get RAG document info from Express DB
        rag_doc = await express_db_client.get_rag_document_by_paper_id(paper_id)
        if not rag_doc:
            raise HTTPException(status_code=404, detail="RAG document not found for this paper")
        
        file_path = rag_doc["file_path"]
        file_name = rag_doc["file_name"]
        
        # Remove from vector store if it was processed
        chunks_removed = 0
        if rag_doc["processing_status"] == "completed":
            chunks_removed = rag_service.remove_document_chunks(file_name)
        
        # Delete the file
        file_deleted = False
        if os.path.exists(file_path):
            os.remove(file_path)
            file_deleted = True
        
        return {
            "success": True,
            "message": f"Paper removed from session {session_id}",
            "paper_id": paper_id,
            "file_deleted": file_deleted,
            "chunks_removed": chunks_removed,
            "file_path": file_path if file_deleted else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing paper: {str(e)}")

@router.get("/{session_id}/papers")
async def get_session_papers_rag_status(session_id: int):
    """
    Get all papers in session with their RAG processing status.
    """
    try:
        papers = await express_db_client.get_session_papers_with_rag_status(session_id)
        return {
            "success": True,
            "session_id": session_id,
            "papers": papers,
            "total_papers": len(papers),
            "processed_papers": len([p for p in papers if p.get("rag_status") == "completed"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting session papers: {str(e)}")

@router.post("/{session_id}/enable")
async def enable_session_rag(
    session_id: int,
    enabled_by: int = Form(...)
):
    """
    Enable RAG for a session.
    """
    try:
        result = await express_db_client.enable_session_rag(session_id, enabled_by)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to enable RAG for session")
        
        return {
            "success": True,
            "message": f"RAG enabled for session {session_id}",
            "session_id": session_id,
            "enabled_by": enabled_by,
            "rag_status": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error enabling RAG: {str(e)}")

@router.post("/{session_id}/disable")
async def disable_session_rag(session_id: int):
    """
    Disable RAG for a session.
    """
    try:
        result = await express_db_client.disable_session_rag(session_id)
        if not result:
            raise HTTPException(status_code=404, detail="Session RAG status not found")
        
        return {
            "success": True,
            "message": f"RAG disabled for session {session_id}",
            "session_id": session_id,
            "rag_status": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error disabling RAG: {str(e)}")

@router.post("/{session_id}/ask", response_model=QuestionResponse)
async def ask_session_rag_question(
    session_id: int,
    request: QuestionRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Ask a question using session-scoped RAG.
    Only searches documents that are processed in this session.
    """
    try:
        # Check if RAG is enabled for this session
        rag_status = await express_db_client.get_session_rag_status(session_id)
        if not rag_status or not rag_status.get("is_rag_enabled", False):
            raise HTTPException(
                status_code=400, 
                detail="RAG is not enabled for this session. Please enable RAG first."
            )
        
        # Get session papers with RAG status
        papers = await express_db_client.get_session_papers_with_rag_status(session_id)
        processed_papers = [p for p in papers if p.get("rag_status") == "completed"]
        
        if not processed_papers:
            raise HTTPException(
                status_code=400,
                detail="No processed papers found in this session. Please process some papers first."
            )
        
        # Get file names of processed papers for session-scoped search
        session_files = [p["rag_file_name"] for p in processed_papers if p["rag_file_name"]]
        
        start_time = time.time()
        
        # Use session-scoped RAG query instead of global search
        result = await rag_service.ask_question_session_scoped(request, session_files)
        
        processing_time = int((time.time() - start_time) * 1000)
        
        # Record RAG chat metadata (assuming we have message_id from somewhere)
        # This would typically come from the frontend when the message is created
        sources_used = []
        chunks_retrieved = 0
        
        if result.sources:
            sources_used = [source.get("source", "") for source in result.sources]
            chunks_retrieved = len(result.sources)
        
        # Add session context to response
        result.metadata = result.metadata or {}
        result.metadata.update({
            "session_id": session_id,
            "session_papers_used": len([s for s in sources_used if s in session_files]),
            "total_session_papers": len(processed_papers),
            "processing_time_ms": processing_time,
            "used_rag": True
        })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@router.get("/{session_id}/status")
async def get_session_rag_status(session_id: int):
    """
    Get comprehensive RAG status for a session.
    """
    try:
        # Get RAG status from Express DB
        rag_status = await express_db_client.get_session_rag_status(session_id)
        
        # Get papers with RAG status
        papers = await express_db_client.get_session_papers_with_rag_status(session_id)
        
        # Get chat statistics
        chat_stats = await express_db_client.get_session_rag_chat_stats(session_id)
        
        return {
            "success": True,
            "session_id": session_id,
            "rag_enabled": rag_status.get("is_rag_enabled", False) if rag_status else False,
            "rag_status": rag_status,
            "papers_summary": {
                "total_papers": len(papers),
                "processed_papers": len([p for p in papers if p.get("rag_status") == "completed"]),
                "pending_papers": len([p for p in papers if p.get("rag_status") == "pending"]),
                "failed_papers": len([p for p in papers if p.get("rag_status") == "failed"])
            },
            "papers": papers,
            "chat_statistics": chat_stats or {
                "total_messages": 0,
                "rag_messages": 0,
                "rag_usage_percentage": 0,
                "avg_chunks_retrieved": 0,
                "avg_processing_time_ms": 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting session status: {str(e)}")

@router.post("/{session_id}/papers/auto-fetch")
async def auto_fetch_and_process_papers(
    session_id: int,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Automatically fetch and process all papers in a session that have arXiv IDs or PDF URLs
    but haven't been processed for RAG yet.
    """
    try:
        # Get all papers in the session
        papers_response = await express_db_client.get_session_papers_with_rag_status(session_id)
        
        if not papers_response:
            return {
                "success": True,
                "message": "No papers found in session",
                "session_id": session_id,
                "processed_papers": []
            }
        
        processed_papers = []
        skipped_papers = []
        failed_papers = []
        
        for paper in papers_response:
            paper_id = paper["paper_id"]
            title = paper["title"]
            
            # Skip if already processed
            if paper.get("has_rag", False) and paper.get("rag_status") == "completed":
                skipped_papers.append({
                    "paper_id": paper_id,
                    "title": title,
                    "reason": "Already processed"
                })
                continue
            
            # Get full paper details to check for arXiv ID or PDF URL
            paper_details = await express_db_client.get_paper_by_id(paper_id)
            if not paper_details:
                skipped_papers.append({
                    "paper_id": paper_id,
                    "title": title,
                    "reason": "Paper details not found"
                })
                continue
            
            # Check for arXiv information in papers_arxiv table first
            arxiv_info = await express_db_client.get_paper_arxiv_info(paper_id)
            
            # Determine PDF URL to use
            target_pdf_url = None
            authors = ""
            
            if arxiv_info:
                # Use arXiv information
                arxiv_id = arxiv_info.get("arxiv_id")
                pdf_url = arxiv_info.get("pdf_url")
                source_url = arxiv_info.get("source_url")
                authors = arxiv_info.get("authors", "")
                
                if arxiv_id:
                    # Convert arXiv ID to PDF URL
                    # arXiv IDs can be like "2301.12345" or "cs.AI/0123456"
                    if "/" in arxiv_id:
                        # Old format: cs.AI/0123456
                        target_pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
                    else:
                        # New format: 2301.12345
                        target_pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
                elif pdf_url:
                    target_pdf_url = pdf_url
                elif source_url and ("arxiv.org" in source_url.lower()):
                    # Extract arXiv ID from source URL
                    if "/abs/" in source_url:
                        arxiv_id_from_url = source_url.split("/abs/")[-1]
                        target_pdf_url = f"https://arxiv.org/pdf/{arxiv_id_from_url}.pdf"
                    elif "/pdf/" in source_url:
                        target_pdf_url = source_url
            else:
                # Fallback to main papers table
                arxiv_id = paper_details.get("arxiv_id")
                pdf_url = paper_details.get("pdf_url")
                url = paper_details.get("url")
                authors = paper_details.get("authors", "")
                
                if arxiv_id:
                    # Convert arXiv ID to PDF URL
                    if "/" in arxiv_id:
                        target_pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
                    else:
                        target_pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
                elif pdf_url:
                    target_pdf_url = pdf_url
                elif url and ("arxiv.org" in url.lower()):
                    # Extract arXiv ID from URL
                    if "/abs/" in url:
                        arxiv_id_from_url = url.split("/abs/")[-1]
                        target_pdf_url = f"https://arxiv.org/pdf/{arxiv_id_from_url}.pdf"
                    elif "/pdf/" in url:
                        target_pdf_url = url
            
            if not target_pdf_url:
                skipped_papers.append({
                    "paper_id": paper_id,
                    "title": title,
                    "reason": "No arXiv ID or PDF URL found"
                })
                continue
            
            # Try to auto-process the paper
            try:
                import requests
                from fastapi import Form
                
                # Call the existing auto-process endpoint internally
                result = await auto_process_paper_for_rag(
                    session_id=session_id,
                    paper_id=paper_id,
                    pdf_url=target_pdf_url,
                    title=title,
                    authors=authors,
                    rag_service=rag_service
                )
                
                processed_papers.append({
                    "paper_id": paper_id,
                    "title": title,
                    "pdf_url": target_pdf_url,
                    "result": result
                })
                
            except Exception as process_error:
                failed_papers.append({
                    "paper_id": paper_id,
                    "title": title,
                    "pdf_url": target_pdf_url,
                    "error": str(process_error)
                })
        
        return {
            "success": True,
            "message": f"Auto-fetch completed for session {session_id}",
            "session_id": session_id,
            "summary": {
                "total_papers": len(papers_response),
                "processed": len(processed_papers),
                "skipped": len(skipped_papers),
                "failed": len(failed_papers)
            },
            "processed_papers": processed_papers,
            "skipped_papers": skipped_papers,
            "failed_papers": failed_papers
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error auto-fetching papers: {str(e)}")

@router.post("/{session_id}/papers/{paper_id}/fetch-from-arxiv")
async def fetch_paper_from_arxiv(
    session_id: int,
    paper_id: int,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Fetch and process a specific paper from arXiv based on its stored arXiv ID or URL.
    """
    try:
        # First, try to get arXiv information from papers_arxiv table
        arxiv_info = await express_db_client.get_paper_arxiv_info(paper_id)
        
        if not arxiv_info:
            # Fallback: Get basic paper details and check for URL
            paper_details = await express_db_client.get_paper_by_id(paper_id)
            if not paper_details:
                raise HTTPException(status_code=404, detail="Paper not found")
            
            # Check if the paper has any arXiv-related URL
            url = paper_details.get("url", "")
            pdf_url = paper_details.get("pdf_url", "")
            
            if "arxiv.org" in url.lower():
                # Extract arXiv ID from URL
                if "/abs/" in url:
                    arxiv_id_from_url = url.split("/abs/")[-1]
                    target_pdf_url = f"https://arxiv.org/pdf/{arxiv_id_from_url}.pdf"
                elif "/pdf/" in url:
                    target_pdf_url = url
                else:
                    raise HTTPException(
                        status_code=400, 
                        detail="No arXiv ID or PDF URL found for this paper"
                    )
            elif "arxiv.org" in pdf_url.lower():
                target_pdf_url = pdf_url
            else:
                raise HTTPException(
                    status_code=400, 
                    detail="No arXiv ID or PDF URL found for this paper"
                )
            
            title = paper_details.get("title", f"Paper {paper_id}")
            authors = paper_details.get("authors", "")
        else:
            # Use arXiv information
            arxiv_id = arxiv_info.get("arxiv_id")
            pdf_url = arxiv_info.get("pdf_url")
            source_url = arxiv_info.get("source_url")
            title = arxiv_info.get("title", f"Paper {paper_id}")
            authors = arxiv_info.get("authors", "")
            
            # Determine PDF URL
            target_pdf_url = None
            
            if arxiv_id:
                # Convert arXiv ID to PDF URL
                if "/" in arxiv_id:
                    target_pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
                else:
                    target_pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
            elif pdf_url:
                target_pdf_url = pdf_url
            elif source_url and ("arxiv.org" in source_url.lower()):
                # Extract arXiv ID from source URL
                if "/abs/" in source_url:
                    arxiv_id_from_url = source_url.split("/abs/")[-1]
                    target_pdf_url = f"https://arxiv.org/pdf/{arxiv_id_from_url}.pdf"
                elif "/pdf/" in source_url:
                    target_pdf_url = source_url
            
            if not target_pdf_url:
                raise HTTPException(
                    status_code=400, 
                    detail="No arXiv ID or PDF URL found for this paper"
                )
        
        # Process the paper
        result = await auto_process_paper_for_rag(
            session_id=session_id,
            paper_id=paper_id,
            pdf_url=target_pdf_url,
            title=title,
            authors=authors,
            rag_service=rag_service
        )
        
        return {
            "success": True,
            "message": f"Paper {paper_id} fetched and processed from arXiv",
            "paper_id": paper_id,
            "title": title,
            "pdf_url": target_pdf_url,
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching paper from arXiv: {str(e)}")