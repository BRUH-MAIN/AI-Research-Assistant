"""
HTTP client for communicating with Express database service
"""
import httpx
import logging
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
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        json_data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Optional[Any]:
        """Make HTTP request to Express service"""
        try:
            url = f"{self.base_url}/api{endpoint}"
            
            response = await self.client.request(
                method=method,
                url=url,
                json=json_data,
                params=params
            )
            
            if response.status_code == 204:  # No content
                return None
            
            response.raise_for_status()
            return response.json()
            
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
    async def create_message(
        self, 
        session_id: int, 
        user_id: int, 
        message_type: str, 
        content: str,
        metadata: Optional[Dict] = None
    ) -> Optional[Dict]:
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
    
    async def update_message(
        self, 
        message_id: int, 
        content: Optional[str] = None, 
        metadata: Optional[Dict] = None
    ) -> Optional[Dict]:
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


# Global instance
express_db_client = ExpressDBClient()