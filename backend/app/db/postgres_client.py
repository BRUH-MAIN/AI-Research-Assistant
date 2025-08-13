"""
Postgres client for storing chat sessions (2-table schema)
"""
import json
from typing import Optional, List, Dict, Any
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor

from app.core.config import settings


class PostgresClient:
    """Postgres client for managing chat sessions"""

    def __init__(self):
        self._connection = None

    @property
    def connection(self):
        """Lazy initialization of Postgres connection"""
        if self._connection is None:
            try:
                self._connection = psycopg2.connect(
                    host=settings.POSTGRES_HOST,
                    port=settings.POSTGRES_PORT,
                    user=settings.POSTGRES_USER,
                    password=settings.POSTGRES_PASSWORD,
                    dbname=settings.POSTGRES_DB,
                    cursor_factory=RealDictCursor
                )
                self._connection.autocommit = True
                print("✅ Postgres connection successful!")
            except psycopg2.Error as e:
                print(f"❌ Failed to connect to Postgres: {e}")
                self._connection = None
        return self._connection

    def store_session(self, session_id: str, session_data: Dict[str, Any]) -> bool:
        """Store session metadata and messages in Postgres"""
        try:
            with self.connection.cursor() as cur:
                # Insert or update session metadata
                cur.execute("""
                    INSERT INTO chat_sessions (session_id, created_at, updated_at)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (session_id) DO UPDATE
                    SET updated_at = EXCLUDED.updated_at
                """, (
                    session_id,
                    session_data.get("created_at"),
                    session_data.get("updated_at")
                ))

                # Delete existing messages for this session to avoid duplicates
                cur.execute("""
                    DELETE FROM chat_messages
                    WHERE session_id = %s
                """, (session_id,))

                # Insert new messages
                for msg in session_data.get("messages", []):
                    cur.execute("""
                        INSERT INTO chat_messages (session_id, role, content, created_at)
                        VALUES (%s, %s, %s, %s)
                    """, (
                        session_id,
                        msg.get("role"),
                        msg.get("content"),
                        msg.get("created_at", datetime.utcnow())
                    ))

            print(f"📝 Stored session and messages in Postgres: {session_id}")
            return True
        except Exception as e:
            print(f"❌ Failed to store session {session_id} in Postgres: {e}")
            return False

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve session metadata and messages"""
        try:
            with self.connection.cursor() as cur:
                # Fetch session metadata
                cur.execute("""
                    SELECT session_id, created_at, updated_at
                    FROM chat_sessions
                    WHERE session_id = %s
                """, (session_id,))
                session_meta = cur.fetchone()
                if not session_meta:
                    print(f"❌ Session not found in Postgres: {session_id}")
                    return None

                # Fetch messages
                cur.execute("""
                    SELECT role, content, created_at
                    FROM chat_messages
                    WHERE session_id = %s
                    ORDER BY created_at ASC
                """, (session_id,))
                messages = cur.fetchall()

                session_data = dict(session_meta)
                session_data["messages"] = [dict(m) for m in messages]

                print(f"📖 Retrieved session from Postgres: {session_id}")
                return session_data
        except Exception as e:
            print(f"❌ Failed to get session {session_id} from Postgres: {e}")
            return None

    def migrate_from_redis(self, redis_client, session_id: Optional[str] = None) -> None:
        """
        Migrate data from Redis to Postgres.
        If session_id is provided, migrate only that session.
        If not, migrate all sessions.
        """
        if session_id:
            sessions = [session_id]
        else:
            sessions = redis_client.get_all_sessions()

        for sid in sessions:
            data = redis_client.get_session(sid)
            if data:
                self.store_session(sid, data)
            else:
                print(f"⚠ No data found in Redis for session {sid}")


# Global instance
postgres_client = PostgresClient()
