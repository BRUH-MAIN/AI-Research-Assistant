


"""

import httpx

import loggingclass ExpressDBClient: communicating with Express database service

from typing import Dict, List, Optional, Any"""


import logging
import httpx
from typing import Dict, List, Optional, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class ExpressDBClient:
    """Client for making HTTP requests to Express database service"""

    def __init__(self):
        self.base_url = settings.EXPRESS_DB_URL
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

    async def _make_request(self, method: str, endpoint: str, json_data: Optional[Dict] = None, params: Optional[Dict] = None) -> Optional[Any]:
        """Make HTTP request to Express service"""
        try:
            url = f"{self.base_url}/api{endpoint}"
            headers = {
                "x-internal-service": "fastapi-ai-server",
                "Content-Type": "application/json"
            }
            response = await self.client.request(
                method=method,
                url=url,
                json=json_data,
                params=params,
                headers=headers
            )
            if response.status_code == 204:
                return None
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.debug(f"Resource not found: {method} {endpoint} - {e}")
                return None
            else:
                logger.error(f"HTTP request failed: {method} {endpoint} - {e}")
                return None
        except httpx.HTTPError as e:
            logger.error(f"HTTP request failed: {method} {endpoint} - {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error: {method} {endpoint} - {e}")
            return None

    # Session operations
    async def create_session(self, title: str, user_id: int, group_id: int = 1) -> Optional[Dict]:
        """Create a new session"""
        data = {
            "title": title,
            "user_id": user_id,
            "group_id": group_id
        }
        return await self._make_request("POST", "/sessions", json_data=data)

    async def get_session(self, session_id: int) -> Optional[Dict]:
        """Get session by ID"""
        return await self._make_request("GET", f"/sessions/{session_id}")

    async def delete_session(self, session_id: int) -> bool:
        """Delete session"""
        result = await self._make_request("DELETE", f"/sessions/{session_id}")
        return result is not None

    # Message operations
    async def create_message(self, session_id: int, user_id: int, message_type: str, content: str, metadata: Optional[Dict] = None) -> Optional[Dict]:
        """Create a new message"""
        data = {
            "session_id": session_id,
            "user_id": user_id,
            "message_type": message_type,
            "content": content,
            "metadata": metadata
        }
        return await self._make_request("POST", "/messages", json_data=data)

    async def get_session_messages(self, session_id: int) -> List[Dict]:
        """Get messages for a session"""
        result = await self._make_request("GET", "/messages", params={"session_id": session_id})
        return result if result else []

    async def update_message(self, message_id: int, content: Optional[str] = None, metadata: Optional[Dict] = None) -> Optional[Dict]:
        """Update a message"""
        data = {}
        if content is not None:
            data["content"] = content
        if metadata is not None:
            data["metadata"] = metadata
        if not data:
            return None
        return await self._make_request("PUT", f"/messages/{message_id}", json_data=data)

    async def delete_message(self, message_id: int) -> bool:
        """Delete a message"""
        result = await self._make_request("DELETE", f"/messages/{message_id}")
        return result is not None

    # RAG operations
    async def create_rag_document(self, paper_id: int, file_name: str, file_path: str) -> Optional[Dict]:
        """Create RAG document entry"""
        data = {
            "paper_id": paper_id,
            "file_name": file_name,
            "file_path": file_path
        }
        return await self._make_request("POST", "/rag/documents", json_data=data)

    async def update_rag_document_status(self, paper_id: int, processing_status: str, chunks_count: Optional[int] = None, vector_store_ids: Optional[List[str]] = None, processing_error: Optional[str] = None) -> Optional[Dict]:
        """Update RAG document processing status"""
        data = {
            "processing_status": processing_status
        }
        if chunks_count is not None:
            data["chunks_count"] = chunks_count
        if vector_store_ids is not None:
            data["vector_store_ids"] = vector_store_ids
        if processing_error is not None:
            data["processing_error"] = processing_error
        return await self._make_request("PUT", f"/rag/documents/{paper_id}/status", json_data=data)

    async def get_rag_document_by_paper_id(self, paper_id: int) -> Optional[Dict]:
        """Get RAG document by paper ID"""
        return await self._make_request("GET", f"/rag/documents/{paper_id}")

    async def enable_session_rag(self, session_id: int, enabled_by: int) -> Optional[Dict]:
        """Enable RAG for a session"""
        data = {"enabled_by": enabled_by}
        return await self._make_request("POST", f"/rag/sessions/{session_id}/enable", json_data=data)

    async def disable_session_rag(self, session_id: int) -> Optional[Dict]:
        """Disable RAG for a session"""
        return await self._make_request("POST", f"/rag/sessions/{session_id}/disable")

    async def get_session_rag_status(self, session_id: int) -> Optional[Dict]:
        """Get RAG status for a session"""
        return await self._make_request("GET", f"/rag/sessions/{session_id}/status")

    async def get_session_papers_with_rag_status(self, session_id: int) -> List[Dict]:
        """Get session papers with their RAG processing status"""
        result = await self._make_request("GET", f"/rag/sessions/{session_id}/papers")
        return result if result else []

    async def create_rag_chat_metadata(self, message_id: int, session_id: int, used_rag: bool, sources_used: Optional[List[str]] = None, chunks_retrieved: Optional[int] = None, processing_time_ms: Optional[int] = None, model_used: Optional[str] = None) -> Optional[Dict]:
        """Record RAG chat metadata for a message"""
        data = {
            "message_id": message_id,
            "session_id": session_id,
            "used_rag": used_rag
        }
        if sources_used is not None:
            data["sources_used"] = sources_used
        if chunks_retrieved is not None:
            data["chunks_retrieved"] = chunks_retrieved
        if processing_time_ms is not None:
            data["processing_time_ms"] = processing_time_ms
        if model_used is not None:
            data["model_used"] = model_used
        return await self._make_request("POST", "/rag/chat/metadata", json_data=data)

    async def get_session_rag_chat_stats(self, session_id: int) -> Optional[Dict]:
        """Get RAG chat statistics for a session"""
        return await self._make_request("GET", f"/rag/sessions/{session_id}/chat-stats")

    # Paper-related methods
    async def get_paper_by_id(self, paper_id: int) -> Optional[Dict]:
        """Get paper details by ID"""
        return await self._make_request("GET", f"/papers/{paper_id}")

    async def get_paper_arxiv_info(self, paper_id: int) -> Optional[Dict]:
        """Get arXiv information for a paper by ID"""
        return await self._make_request("GET", f"/papers/{paper_id}/arxiv")

    async def create_arxiv_paper(self, paper_data: Dict) -> Optional[Dict]:
        """Create an arXiv paper entry in the database"""
        return await self._make_request("POST", "/papers/arxiv", json_data=paper_data)

    async def update_paper_with_arxiv_metadata(self, paper_id: int, arxiv_metadata: Dict) -> Optional[Dict]:
        """Update an existing paper with arXiv metadata by linking to papers_arxiv table"""
        arxiv_data = {
            "paper_id": paper_id,
            **arxiv_metadata
        }
        return await self._make_request("POST", "/papers/arxiv", json_data=arxiv_data)

# Global instance
express_db_client = ExpressDBClient()