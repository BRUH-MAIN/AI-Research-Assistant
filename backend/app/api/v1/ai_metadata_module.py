from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from ...db.models import AIMetadata

router = APIRouter()

# AI METADATA ENDPOINTS
@router.get("/messages/{message_id}/ai-metadata", response_model=List[dict])
async def get_message_ai_metadata(message_id: int):
    """Get AI metadata for a specific message"""
    try:
        return AIMetadata.get_by_message(message_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/messages/{message_id}/ai-metadata", status_code=status.HTTP_201_CREATED)
async def create_ai_metadata(message_id: int, metadata: dict):
    """Create AI metadata for a specific message"""
    try:
        paper_id = metadata.get("paper_id")
        page_no = metadata.get("page_no")
        
        if not paper_id:
            raise HTTPException(status_code=400, detail="paper_id is required")
        
        new_metadata = AIMetadata.create(
            message_id=message_id,
            paper_id=paper_id,
            page_no=page_no
        )
        
        if not new_metadata:
            raise HTTPException(status_code=500, detail="Failed to create AI metadata")
        
        return new_metadata
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/papers/{paper_id}/ai-metadata")
async def get_paper_ai_metadata(paper_id: int):
    """Get AI metadata for a specific paper"""
    try:
        return AIMetadata.get_by_paper(paper_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/ai-metadata/{metadata_id}")
async def get_ai_metadata(metadata_id: int):
    """Get a specific AI metadata entry by ID"""
    try:
        metadata = AIMetadata.get_by_id(metadata_id)
        if not metadata:
            raise HTTPException(status_code=404, detail="AI metadata not found")
        return metadata
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/ai-metadata/{metadata_id}")
async def update_ai_metadata(metadata_id: int, metadata: dict):
    """Update a specific AI metadata entry"""
    try:
        # Check if metadata exists
        existing_metadata = AIMetadata.get_by_id(metadata_id)
        if not existing_metadata:
            raise HTTPException(status_code=404, detail="AI metadata not found")
        
        # Prepare update data
        update_data = {}
        if "page_no" in metadata:
            update_data["page_no"] = metadata["page_no"]
        if "paper_id" in metadata:
            update_data["paper_id"] = metadata["paper_id"]
        
        updated_metadata = AIMetadata.update(metadata_id, **update_data)
        if not updated_metadata:
            raise HTTPException(status_code=500, detail="Failed to update AI metadata")
        
        return updated_metadata
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/ai-metadata/{metadata_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_metadata(metadata_id: int):
    """Delete a specific AI metadata entry"""
    try:
        # Check if metadata exists
        existing_metadata = AIMetadata.get_by_id(metadata_id)
        if not existing_metadata:
            raise HTTPException(status_code=404, detail="AI metadata not found")
        
        success = AIMetadata.delete(metadata_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete AI metadata")
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/sessions/{session_id}/ai-metadata")
async def get_session_ai_metadata(session_id: int):
    """Get all AI metadata for messages in a specific session"""
    try:
        return AIMetadata.get_by_session(session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
