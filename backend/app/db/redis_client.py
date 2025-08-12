"""
Redis client and database operations
"""
import redis
import json
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from app.core.config import settings


class RedisClient:
    """Redis client for managing chat sessions"""
    
    def __init__(self):
        """Initialize Redis connection (lazy initialization)"""
        self._redis_client = None
        self._connection_tested = False
    
    @property
    def redis_client(self):
        """Lazy initialization of Redis client"""
        if self._redis_client is None:
            self._redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                decode_responses=True,
                username=settings.REDIS_USERNAME,
                password=settings.REDIS_PASSWORD,
            )
        return self._redis_client
    
    def _test_connection(self) -> None:
        """Test Redis connection"""
        try:
            self.redis_client.ping()
            print("✅ Redis Cloud connection successful!")
            self._connection_tested = True
        except redis.ConnectionError as e:
            print(f"❌ Redis Cloud connection failed: {e}")
            self._connection_tested = False
            # Don't raise - let the application start and handle errors gracefully
    
    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        try:
            self.redis_client.ping()
            return True
        except (redis.ConnectionError, redis.TimeoutError):
            return False
        except Exception as e:
            print(f"Unexpected Redis error: {e}")
            return False
    
    def store_session(self, session_id: str, session_data: Dict[str, Any]) -> bool:
        """Store chat session with TTL"""
        try:
            key = f"chat:session:{session_id}"
            self.redis_client.setex(
                key, 
                timedelta(hours=settings.REDIS_SESSION_TTL_HOURS), 
                json.dumps(session_data, default=str)
            )
            print(f"📝 Stored session: {session_id}")
            return True
        except Exception as e:
            print(f"❌ Failed to store session {session_id}: {e}")
            return False
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve chat session"""
        try:
            key = f"chat:session:{session_id}"
            data = self.redis_client.get(key)
            if data:
                print(f"📖 Retrieved session: {session_id}")
                return json.loads(data)
            else:
                print(f"❌ Session not found: {session_id}")
                return None
        except Exception as e:
            print(f"❌ Failed to get session {session_id}: {e}")
            return None
    
    def add_message_to_session(self, session_id: str, message: Dict[str, Any]) -> bool:
        """Add a message to existing session"""
        try:
            session = self.get_session(session_id)
            if session:
                session['messages'].append(message)
                session['updated_at'] = datetime.now().isoformat()
                success = self.store_session(session_id, session)
                if success:
                    print(f"💬 Added message to session: {session_id}")
                return success
            else:
                print(f"❌ Cannot add message - session not found: {session_id}")
                return False
        except Exception as e:
            print(f"❌ Failed to add message to session {session_id}: {e}")
            return False
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a chat session"""
        try:
            key = f"chat:session:{session_id}"
            result = self.redis_client.delete(key)
            if result:
                print(f"🗑️ Deleted session: {session_id}")
                return True
            else:
                print(f"❌ Session not found for deletion: {session_id}")
                return False
        except Exception as e:
            print(f"❌ Failed to delete session {session_id}: {e}")
            return False
    
    def get_all_sessions(self) -> List[str]:
        """Get all active session IDs (for debugging)"""
        try:
            pattern = "chat:session:*"
            keys = self.redis_client.keys(pattern)
            session_ids = [key.replace("chat:session:", "") for key in keys]
            print(f"📋 Found {len(session_ids)} active sessions")
            return session_ids
        except Exception as e:
            print(f"❌ Failed to get sessions: {e}")
            return []
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session metadata without full message history"""
        try:
            session = self.get_session(session_id)
            if session:
                return {
                    "session_id": session_id,
                    "created_at": session.get("created_at"),
                    "updated_at": session.get("updated_at"),
                    "message_count": len(session.get("messages", []))
                }
            return None
        except Exception as e:
            print(f"❌ Failed to get session info {session_id}: {e}")
            return None


# Create global Redis client instance
redis_client = RedisClient()
