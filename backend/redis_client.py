# backend/redis_client.py
import redis
import json
import os
from typing import Optional, List
from datetime import datetime, timedelta

class RedisClient:
    def __init__(self):
        # Use your Redis Cloud configuration
        self.redis_client = redis.Redis(
            host='redis-17345.c305.ap-south-1-1.ec2.redns.redis-cloud.com',
            port=17345,
            decode_responses=True,
            username="default",
            password="9A5pbzj0oxuhQm5ui8FyGmLWtKwgTfRj",
        )
        
        # Test the connection
        try:
            self.redis_client.ping()
            print("✅ Redis Cloud connection successful!")
        except redis.ConnectionError as e:
            print(f"❌ Redis Cloud connection failed: {e}")
    
    def store_session(self, session_id: str, session_data: dict, ttl_hours: int = 24):
        """Store chat session with TTL"""
        key = f"chat:session:{session_id}"
        self.redis_client.setex(
            key, 
            timedelta(hours=ttl_hours), 
            json.dumps(session_data, default=str)
        )
        print(f"📝 Stored session: {session_id}")
    
    def get_session(self, session_id: str) -> Optional[dict]:
        """Retrieve chat session"""
        key = f"chat:session:{session_id}"
        data = self.redis_client.get(key)
        if data:
            print(f"📖 Retrieved session: {session_id}")
            return json.loads(data)
        else:
            print(f"❌ Session not found: {session_id}")
            return None
    
    def add_message_to_session(self, session_id: str, message: dict):
        """Add a message to existing session"""
        session = self.get_session(session_id)
        if session:
            session['messages'].append(message)
            session['updated_at'] = datetime.now().isoformat()
            self.store_session(session_id, session)
            print(f"💬 Added message to session: {session_id}")
        else:
            print(f"❌ Cannot add message - session not found: {session_id}")
    
    def delete_session(self, session_id: str):
        """Delete a chat session"""
        key = f"chat:session:{session_id}"
        result = self.redis_client.delete(key)
        if result:
            print(f"🗑️ Deleted session: {session_id}")
        else:
            print(f"❌ Session not found for deletion: {session_id}")
    
    def get_all_sessions(self) -> List[str]:
        """Get all active session IDs (for debugging)"""
        pattern = "chat:session:*"
        keys = self.redis_client.keys(pattern)
        session_ids = [key.replace("chat:session:", "") for key in keys]
        print(f"📋 Found {len(session_ids)} active sessions")
        return session_ids

# Create a global instance
redis_client = RedisClient()
