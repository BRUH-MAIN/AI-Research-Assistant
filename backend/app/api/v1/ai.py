"""
Enhanced AI endpoints for document management and RAG-based question answering.
Provides comprehensive RAG functionality with research paper awareness.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
from pathlib import Path
import os

from app.services.rag_service import RAGService, QuestionRequest, QuestionResponse, DocumentRemovalRequest, DocumentRemovalResponse

router = APIRouter()

# Initialize RAG service
def get_rag_service():
    """Get RAG service instance."""
    return RAGService()

@router.get("/")
async def ai_root():
    """AI endpoints root with available endpoints information."""
    return {
        "message": "Enhanced AI Research Assistant - RAG Endpoints",
        "version": "2.0.0",
        "features": [
            "Research paper awareness",
            "Hierarchical document chunking",
            "Hybrid search (dense + sparse vectors)",
            "Citation and section extraction",
            "Advanced metadata handling"
        ],
        "endpoints": {
            "upload_document": "POST /ai/documents/upload",
            "list_documents": "GET /ai/documents/list", 
            "remove_document": "DELETE /ai/documents/remove",
            "ask_question": "POST /ai/ask",
            "index_stats": "GET /ai/index/stats",
            "clear_index": "DELETE /ai/index/clear",
            "recreate_index": "POST /ai/index/recreate",
            "health": "GET /ai/health"
        }
    }

@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    upsert_to_index: bool = Query(True, description="Whether to upsert chunks to vector index"),
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Upload a PDF document, process it with enhanced research paper awareness, and optionally upsert to vector store.
    
    Features:
    - Hierarchical chunking with section detection
    - Citation and figure/table extraction
    - Paper metadata extraction (title, authors, year, venue)
    - Enhanced chunk metadata for research papers
    
    Args:
        file: PDF file to upload
        upsert_to_index: Whether to add chunks to vector index
        
    Returns:
        Processing results with research paper metadata and indexing information
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        result = await rag_service.upload_document(file, upsert_to_index)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading document: {str(e)}")

@router.get("/documents/list")
async def list_documents(rag_service: RAGService = Depends(get_rag_service)):
    """
    List all documents currently in the vector index with detailed information.
    
    Returns:
        Comprehensive list of documents with metadata, chunk counts, and statistics
    """
    try:
        # Get documents list from vector store
        vector_store = rag_service.get_vector_store()
        index = vector_store["index"]
        
        # Query all vectors to get document information
        dummy_vector = [0.0] * 1024  # PINECONE_DIMENSION
        query_result = index.query(
            vector=dummy_vector,
            top_k=10000,  # Get as many documents as possible
            include_metadata=True
        )
        
        if not query_result.matches:
            return {
                "success": True,
                "total_documents": 0,
                "total_chunks": 0,
                "documents": [],
                "summary": {
                    "total_documents": 0,
                    "total_chunks": 0,
                    "avg_chunks_per_document": 0
                }
            }
        
        # Group documents by source with enhanced metadata
        documents = {}
        for match in query_result.matches:
            if match.metadata and 'source' in match.metadata:
                source = match.metadata['source']
                doc_name = os.path.basename(source)
                
                if doc_name not in documents:
                    documents[doc_name] = {
                        "name": doc_name,
                        "source_path": source,
                        "chunk_count": 0,
                        "pages": set(),
                        "sections": set(),
                        "paper_metadata": {}
                    }
                
                # Count chunks and track pages
                documents[doc_name]["chunk_count"] += 1
                
                # Track pages if available
                if 'page' in match.metadata:
                    documents[doc_name]["pages"].add(match.metadata['page'])
                
                # Track sections if available
                if 'section' in match.metadata and match.metadata['section']:
                    documents[doc_name]["sections"].add(match.metadata['section'])
                
                # Collect paper metadata
                if 'paper_id' in match.metadata and not documents[doc_name]["paper_metadata"]:
                    documents[doc_name]["paper_metadata"] = {
                        "paper_id": match.metadata.get('paper_id', ''),
                        "title": match.metadata.get('title', ''),
                        "year": match.metadata.get('year', None),
                        "venue": match.metadata.get('venue', '')
                    }
        
        # Convert sets to counts and clean up
        for doc_name in documents:
            documents[doc_name]["page_count"] = len(documents[doc_name]["pages"])
            documents[doc_name]["section_count"] = len(documents[doc_name]["sections"])
            documents[doc_name]["sections_found"] = list(documents[doc_name]["sections"])
            del documents[doc_name]["pages"]  # Remove the set, keep only count
            del documents[doc_name]["sections"]  # Remove the set, keep only list
        
        # Convert to list format for easier consumption
        documents_list = list(documents.values())
        
        return {
            "success": True,
            "total_documents": len(documents),
            "total_chunks": len(query_result.matches),
            "documents": documents_list,
            "summary": {
                "total_documents": len(documents),
                "total_chunks": sum(doc["chunk_count"] for doc in documents.values()),
                "avg_chunks_per_document": round(sum(doc["chunk_count"] for doc in documents.values()) / len(documents), 2) if documents else 0,
                "research_papers_detected": sum(1 for doc in documents.values() if doc["paper_metadata"].get("title"))
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")

@router.delete("/documents/remove")
async def remove_document(
    request: DocumentRemovalRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Remove all chunks of a specific document from the vector index and delete the file from input directory.
    
    Args:
        request: Document removal request
        
    Returns:
        Removal confirmation with count and file deletion status
    """
    try:
        # Remove chunks from vector index using enhanced service
        chunks_removed = rag_service.remove_document_chunks(request.document_name)
        
        # Attempt to delete the file from input directory
        file_deleted = False
        file_path = None
        try:
            # Construct the file path
            file_path = os.path.join(rag_service.input_folder, request.document_name)
            
            if os.path.exists(file_path):
                os.remove(file_path)
                file_deleted = True
                print(f"Deleted file: {file_path}")
            else:
                print(f"File not found in input directory: {file_path}")
                
        except Exception as file_error:
            print(f"Error deleting file {file_path}: {file_error}")
            file_deleted = False
        
        # Determine overall success
        success = chunks_removed > 0 or file_deleted
        
        # Create appropriate message
        messages = []
        if chunks_removed > 0:
            messages.append(f"removed {chunks_removed} chunks from vector index")
        if file_deleted:
            messages.append(f"deleted file from input directory")
        
        if not messages:
            message = f"No chunks found in vector index and no file found in input directory for '{request.document_name}'"
        else:
            message = f"Successfully {' and '.join(messages)} for '{request.document_name}'"
        
        return DocumentRemovalResponse(
            success=success,
            message=message,
            chunks_removed=chunks_removed,
            document_name=request.document_name,
            file_deleted=file_deleted,
            file_path=file_path if file_deleted else None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing document: {str(e)}")

@router.post("/ask", response_model=QuestionResponse)
async def ask_question(
    request: QuestionRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Ask a question using the RAG system with research paper awareness.
    
    Args:
        request: Question request with query and optional parameters
        
    Returns:
        Answer with sources, sections, citations, and metadata
    """
    try:
        result = await rag_service.ask_question(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@router.get("/index/stats")
async def get_index_statistics(rag_service: RAGService = Depends(get_rag_service)):
    """
    Get current vector index statistics.
    
    Returns:
        Index statistics and metadata
    """
    try:
        stats = rag_service.get_index_stats()
        return {
            "success": True,
            "stats": stats,
            "total_vectors": stats.get('total_vector_count', 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting index stats: {str(e)}")

@router.delete("/index/clear")
async def clear_index(rag_service: RAGService = Depends(get_rag_service)):
    """
    Clear all vectors from the index and all files from input directory (DANGEROUS - use with caution).
    
    Returns:
        Confirmation of index and input directory clearing
    """
    try:
        # Clear the vector index
        vector_store = rag_service.get_vector_store()
        index = vector_store["index"]
        index.delete(delete_all=True)
        
        # Clear the input directory
        files_deleted = 0
        input_path = Path(rag_service.input_folder)
        if input_path.exists():
            for pdf_file in input_path.glob("*.pdf"):
                try:
                    pdf_file.unlink()
                    files_deleted += 1
                    print(f"Deleted file: {pdf_file}")
                except Exception as e:
                    print(f"Error deleting file {pdf_file}: {e}")
        
        return {
            "success": True,
            "message": f"Index cleared successfully and {files_deleted} files deleted from input directory",
            "vectors_cleared": True,
            "files_deleted": files_deleted
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing index and input directory: {str(e)}")

@router.post("/index/recreate")
async def recreate_index(rag_service: RAGService = Depends(get_rag_service)):
    """
    Delete the current index and create a new one with dotproduct metric for hybrid search.
    This will permanently destroy all existing data in the index.
    
    Returns:
        Confirmation of index recreation
    """
    try:
        api_keys = rag_service.get_api_keys()
        pinecone_api_key = api_keys["PINECONE_API_KEY"]
        
        if not pinecone_api_key:
            raise ValueError("PINECONE_API_KEY not found in environment variables.")
        
        from pinecone import Pinecone, ServerlessSpec
        pc = Pinecone(api_key=pinecone_api_key)
        
        # Import constants from service
        from app.services.rag_service import INDEX_NAME, PINECONE_DIMENSION, PINECONE_METRIC, PINECONE_CLOUD, PINECONE_REGION
        
        # Check if index exists and delete it
        existing_indexes = pc.list_indexes().names()
        if INDEX_NAME in existing_indexes:
            print(f"Deleting existing index '{INDEX_NAME}'...")
            pc.delete_index(INDEX_NAME)
            print(f"Index '{INDEX_NAME}' deleted successfully.")
        else:
            print(f"Index '{INDEX_NAME}' does not exist, proceeding to create new one.")
        
        # Clear cached vector store since index no longer exists
        from app.services.rag_service import _vector_store_cache
        _vector_store_cache = None
        
        # Create new index with dotproduct metric
        print(f"Creating new index '{INDEX_NAME}' with dotproduct metric...")
        pc.create_index(
            name=INDEX_NAME,
            dimension=PINECONE_DIMENSION,
            metric=PINECONE_METRIC,  # This will be "dotproduct"
            spec=ServerlessSpec(cloud=PINECONE_CLOUD, region=PINECONE_REGION)
        )
        print(f"Index '{INDEX_NAME}' created successfully with dotproduct metric.")
        
        return {
            "success": True,
            "message": f"Index '{INDEX_NAME}' recreated successfully with dotproduct metric for hybrid search",
            "metric": PINECONE_METRIC,
            "dimension": PINECONE_DIMENSION,
            "supports_hybrid_search": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error recreating index: {str(e)}")

@router.get("/health")
async def health_check(rag_service: RAGService = Depends(get_rag_service)):
    """
    Enhanced health check endpoint for AI services.
    
    Returns:
        Comprehensive health status of the AI/RAG service including API key validation and vector store connectivity
    """
    try:
        # Check API keys first
        validation_result = rag_service.validate_api_keys()
        
        if not validation_result['valid']:
            return {
                "status": "unhealthy",
                "service": "Enhanced AI Research Assistant RAG",
                "version": "2.0.0",
                "error": "Missing required API keys",
                "missing_api_keys": validation_result['missing_keys'],
                "message": validation_result['message'],
                "vector_store_connected": False,
                "setup_instructions": {
                    "1": "Copy backend/.env.example to backend/.env",
                    "2": "Fill in the required API keys in the .env file",
                    "3": "Restart the FastAPI service"
                }
            }
        
        # Check if we can get basic stats
        stats = rag_service.get_index_stats()
        
        # Get vector store information
        vector_store = rag_service.get_vector_store()
        
        return {
            "status": "healthy",
            "service": "Enhanced AI Research Assistant RAG",
            "version": "2.0.0",
            "api_keys_configured": True,
            "vector_store_connected": stats.get('total_vector_count', 0) >= 0,
            "total_documents": stats.get('total_vector_count', 0),
            "index_dimension": stats.get('dimension', 1024),
            "hybrid_search_enabled": vector_store.get("bm25_encoder") is not None,
            "features": {
                "research_paper_awareness": True,
                "hierarchical_chunking": True,
                "citation_extraction": True,
                "section_detection": True,
                "hybrid_search": vector_store.get("bm25_encoder") is not None,
                "metadata_enhancement": True
            },
            "input_folder": rag_service.input_folder
        }
    except Exception as e:
        # Check if this is an API key error
        validation_result = rag_service.validate_api_keys()
        if not validation_result['valid']:
            return {
                "status": "unhealthy",
                "service": "Enhanced AI Research Assistant RAG",
                "version": "2.0.0",
                "error": "Missing required API keys",
                "missing_api_keys": validation_result['missing_keys'],
                "message": validation_result['message'],
                "vector_store_connected": False,
                "setup_instructions": {
                    "1": "Copy backend/.env.example to backend/.env",
                    "2": "Fill in the required API keys in the .env file",
                    "3": "Restart the FastAPI service"
                }
            }
        
        return {
            "status": "unhealthy",
            "service": "Enhanced AI Research Assistant RAG",
            "version": "2.0.0",
            "error": str(e),
            "vector_store_connected": False,
            "api_keys_configured": validation_result['valid']
        }