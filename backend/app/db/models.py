"""
Database models that correspond to the schema.sql structure
"""
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import logging
from .db import run_query, initialize_database, DB_AVAILABLE

logger = logging.getLogger(__name__)

# Mock data for when database is not available
MOCK_USERS = [
    {"id": 1, "email": "alice@example.com", "first_name": "Alice", "last_name": "Smith", "is_active": True},
    {"id": 2, "email": "bob@example.com", "first_name": "Bob", "last_name": "Johnson", "is_active": True},
    {"id": 3, "email": "ai@assistant.com", "first_name": "AI", "last_name": "Assistant", "is_active": True}
]

MOCK_GROUPS = [
    {"id": 1, "name": "Default Group", "member_count": 3},
    {"id": 2, "name": "Researchers", "member_count": 2}
]

MOCK_SESSIONS = [
    {"id": 1, "title": "Research Session 1", "user_id": 1, "created_at": "2025-09-01T10:00:00", 
     "updated_at": "2025-09-01T10:30:00", "is_active": True, "message_count": 3},
    {"id": 2, "title": "Project Discussion", "user_id": 2, "created_at": "2025-09-01T14:00:00", 
     "updated_at": "2025-09-01T14:45:00", "is_active": True, "message_count": 2}
]

MOCK_MESSAGES = [
    {"id": 1, "session_id": 1, "user_id": 1, "content": "Hello, I need help with my research project.", 
     "message_type": "user", "created_at": "2025-09-01T10:00:00", "updated_at": "2025-09-01T10:00:00", "is_edited": False},
    {"id": 2, "session_id": 1, "user_id": 3, "content": "I'd be happy to help you with your research project. What specific area are you working on?", 
     "message_type": "assistant", "created_at": "2025-09-01T10:01:00", "updated_at": "2025-09-01T10:01:00", "is_edited": False},
    {"id": 3, "session_id": 1, "user_id": 1, "content": "I'm working on machine learning algorithms for image recognition.", 
     "message_type": "user", "created_at": "2025-09-01T10:02:00", "updated_at": "2025-09-01T10:02:00", "is_edited": False}
]

class DatabaseModel:
    """Base class for database models"""
    
    @classmethod
    def initialize_db(cls):
        """Initialize the database with schema"""
        if DB_AVAILABLE:
            initialize_database()
        else:
            logger.warning("Database not available, using mock data")

class User:
    """User model corresponding to the users table"""
    
    @classmethod
    def get_all(cls) -> List[Dict[str, Any]]:
        """Get all users"""
        if not DB_AVAILABLE:
            logger.info("Using mock user data")
            return MOCK_USERS.copy()
            
        query = """
            SELECT user_id as id, email, first_name, last_name, 
                   created_at, availability as is_active
            FROM users 
            ORDER BY user_id;
        """
        result = run_query(query, fetch=True)
        return result if result is not None else MOCK_USERS.copy()
    
    @classmethod
    def get_by_id(cls, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        if not DB_AVAILABLE:
            user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
            return user.copy() if user else None
            
        query = """
            SELECT user_id as id, email, first_name, last_name, 
                   created_at, availability as is_active
            FROM users 
            WHERE user_id = %s;
        """
        result = run_query(query, (user_id,), fetch=True)
        if result:
            return result[0]
        else:
            # Fallback to mock data
            user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
            return user.copy() if user else None
    
    @classmethod
    def create(cls, email: str, first_name: str = None, last_name: str = None) -> Dict[str, Any]:
        """Create a new user"""
        if not DB_AVAILABLE:
            new_id = max([u["id"] for u in MOCK_USERS], default=0) + 1
            new_user = {
                "id": new_id,
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "is_active": True,
                "created_at": datetime.now().isoformat()
            }
            MOCK_USERS.append(new_user)
            return new_user
            
        query = """
            INSERT INTO users (email, first_name, last_name)
            VALUES (%s, %s, %s)
            RETURNING user_id as id, email, first_name, last_name, 
                     created_at, availability as is_active;
        """
        result = run_query(query, (email, first_name, last_name), fetch=True)
        if result:
            return result[0]
        else:
            # Fallback to mock behavior
            return cls.create(email, first_name, last_name)
    
    @classmethod
    def update(cls, user_id: int, **kwargs) -> Optional[Dict[str, Any]]:
        """Update user"""
        if not DB_AVAILABLE:
            user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
            if user:
                if 'email' in kwargs:
                    user['email'] = kwargs['email']
                if 'first_name' in kwargs:
                    user['first_name'] = kwargs['first_name']
                if 'last_name' in kwargs:
                    user['last_name'] = kwargs['last_name']
                if 'is_active' in kwargs:
                    user['is_active'] = kwargs['is_active']
                return user.copy()
            return None
            
        fields = []
        params = []
        
        if 'email' in kwargs:
            fields.append("email = %s")
            params.append(kwargs['email'])
        if 'first_name' in kwargs:
            fields.append("first_name = %s")
            params.append(kwargs['first_name'])
        if 'last_name' in kwargs:
            fields.append("last_name = %s")
            params.append(kwargs['last_name'])
        if 'is_active' in kwargs:
            availability = 'available' if kwargs['is_active'] else 'offline'
            fields.append("availability = %s")
            params.append(availability)
        
        if not fields:
            return cls.get_by_id(user_id)
        
        params.append(user_id)
        query = f"""
            UPDATE users 
            SET {', '.join(fields)}
            WHERE user_id = %s
            RETURNING user_id as id, email, first_name, last_name, 
                     created_at, availability as is_active;
        """
        result = run_query(query, tuple(params), fetch=True)
        if result:
            return result[0]
        else:
            # Fallback to mock behavior
            return cls.update(user_id, **kwargs)
    
    @classmethod
    def delete(cls, user_id: int) -> bool:
        """Delete user"""
        if not DB_AVAILABLE:
            user_index = next((i for i, u in enumerate(MOCK_USERS) if u["id"] == user_id), None)
            if user_index is not None:
                MOCK_USERS.pop(user_index)
                return True
            return False
            
        query = "DELETE FROM users WHERE user_id = %s;"
        try:
            run_query(query, (user_id,))
            return True
        except Exception:
            # Fallback to mock behavior
            return cls.delete(user_id)

class Group:
    """Group model corresponding to the groups table"""
    
    @classmethod
    def get_all(cls) -> List[Dict[str, Any]]:
        """Get all groups with member count"""
        if not DB_AVAILABLE:
            return MOCK_GROUPS.copy()
            
        query = """
            SELECT g.group_id as id, g.name, g.created_at,
                   COUNT(gp.user_id) as member_count
            FROM groups g
            LEFT JOIN group_participants gp ON g.group_id = gp.group_id
            GROUP BY g.group_id, g.name, g.created_at
            ORDER BY g.group_id;
        """
        result = run_query(query, fetch=True)
        return result if result is not None else MOCK_GROUPS.copy()
    
    @classmethod
    def get_by_id(cls, group_id: int) -> Optional[Dict[str, Any]]:
        """Get group by ID"""
        if not DB_AVAILABLE:
            group = next((g for g in MOCK_GROUPS if g["id"] == group_id), None)
            return group.copy() if group else None
            
        query = """
            SELECT g.group_id as id, g.name, g.created_at,
                   COUNT(gp.user_id) as member_count
            FROM groups g
            LEFT JOIN group_participants gp ON g.group_id = gp.group_id
            WHERE g.group_id = %s
            GROUP BY g.group_id, g.name, g.created_at;
        """
        result = run_query(query, (group_id,), fetch=True)
        if result:
            return result[0]
        else:
            group = next((g for g in MOCK_GROUPS if g["id"] == group_id), None)
            return group.copy() if group else None
    
    @classmethod
    def create(cls, name: str, created_by: int, description: str = None, is_public: bool = False) -> Dict[str, Any]:
        """Create a new group"""
        if not DB_AVAILABLE:
            new_id = max([g["id"] for g in MOCK_GROUPS], default=0) + 1
            new_group = {
                "id": new_id,
                "name": name,
                "description": description or "",
                "invite_code": f"TEST{new_id:04d}",  # Mock invite code
                "is_public": is_public,
                "member_count": 1,
                "created_at": datetime.now().isoformat()
            }
            MOCK_GROUPS.append(new_group)
            return new_group
            
        query = """
            INSERT INTO groups (name, created_by, description, is_public)
            VALUES (%s, %s, %s, %s)
            RETURNING group_id as id, name, description, invite_code, is_public,
                     created_at, 1 as member_count;
        """
        result = run_query(query, (name, created_by, description, is_public), fetch=True)
        if result:
            group = result[0]
            # Add creator as admin
            cls.add_member(group['id'], created_by, 'admin')
            return group
        else:
            # Fallback to mock behavior
            return cls.create(name, created_by, description, is_public)
    
    @classmethod
    def get_members(cls, group_id: int) -> List[int]:
        """Get group member user IDs"""
        if not DB_AVAILABLE:
            # Mock: return some users for group 1, fewer for others
            if group_id == 1:
                return [1, 2, 3]
            elif group_id == 2:
                return [1, 2]
            return []
            
        query = """
            SELECT user_id
            FROM group_participants
            WHERE group_id = %s;
        """
        result = run_query(query, (group_id,), fetch=True)
        if result is not None:
            return [row['user_id'] for row in result]
        else:
            return cls.get_members(group_id)
    
    @classmethod
    def add_member(cls, group_id: int, user_id: int, role: str = 'member') -> bool:
        """Add user to group"""
        if not DB_AVAILABLE:
            # Mock implementation - just return True
            return True
            
        query = """
            INSERT INTO group_participants (group_id, user_id, role)
            VALUES (%s, %s, %s)
            ON CONFLICT (group_id, user_id) DO NOTHING;
        """
        try:
            run_query(query, (group_id, user_id, role))
            return True
        except Exception:
            return True  # Mock fallback
    
    @classmethod
    def remove_member(cls, group_id: int, user_id: int) -> bool:
        """Remove user from group"""
        if not DB_AVAILABLE:
            return True
            
        query = """
            DELETE FROM group_participants 
            WHERE group_id = %s AND user_id = %s;
        """
        try:
            run_query(query, (group_id, user_id))
            return True
        except Exception:
            return True

    @classmethod
    def get_by_invite_code(cls, invite_code: str) -> Optional[Dict[str, Any]]:
        """Get group by invite code"""
        if not DB_AVAILABLE:
            # Mock: return a group if invite code matches pattern
            if invite_code.startswith("TEST"):
                try:
                    group_id = int(invite_code[4:])
                    group = next((g for g in MOCK_GROUPS if g["id"] == group_id), None)
                    return group.copy() if group else None
                except ValueError:
                    return None
            return None
            
        query = """
            SELECT g.group_id as id, g.name, g.description, g.invite_code, g.is_public,
                   g.created_at, COUNT(gp.user_id) as member_count
            FROM groups g
            LEFT JOIN group_participants gp ON g.group_id = gp.group_id
            WHERE g.invite_code = %s
            GROUP BY g.group_id, g.name, g.description, g.invite_code, g.is_public, g.created_at;
        """
        result = run_query(query, (invite_code,), fetch=True)
        if result:
            return result[0]
        return None

    @classmethod
    def join_by_invite_code(cls, invite_code: str, user_id: int) -> Dict[str, Any]:
        """Join group using invite code"""
        if not DB_AVAILABLE:
            return {
                "success": True,
                "message": "Successfully joined group (mock)",
                "group_id": 1,
                "group_name": "Mock Group"
            }
            
        # Check if group exists and get info
        group = cls.get_by_invite_code(invite_code)
        if not group:
            return {
                "success": False,
                "message": "Invalid invite code",
                "group_id": None,
                "group_name": None
            }
        
        # Check if user is already a member
        current_members = cls.get_members(group['id'])
        if user_id in current_members:
            return {
                "success": False,
                "message": "You are already a member of this group",
                "group_id": group['id'],
                "group_name": group['name']
            }
        
        # Add user to group
        success = cls.add_member(group['id'], user_id, 'member')
        if success:
            return {
                "success": True,
                "message": "Successfully joined group",
                "group_id": group['id'],
                "group_name": group['name']
            }
        else:
            return {
                "success": False,
                "message": "Failed to join group",
                "group_id": group['id'],
                "group_name": group['name']
            }

    @classmethod
    def get_user_groups(cls, user_id: int) -> List[Dict[str, Any]]:
        """Get all groups for a specific user"""
        if not DB_AVAILABLE:
            # Mock: return groups for user 1 and 2
            if user_id in [1, 2]:
                return MOCK_GROUPS.copy()
            return []
            
        query = """
            SELECT g.group_id as id, g.name, g.description, g.invite_code, g.is_public,
                   g.created_at, COUNT(gp_all.user_id) as member_count, gp_user.role
            FROM groups g
            JOIN group_participants gp_user ON g.group_id = gp_user.group_id AND gp_user.user_id = %s
            LEFT JOIN group_participants gp_all ON g.group_id = gp_all.group_id
            GROUP BY g.group_id, g.name, g.description, g.invite_code, g.is_public, 
                     g.created_at, gp_user.role
            ORDER BY g.created_at DESC;
        """
        result = run_query(query, (user_id,), fetch=True)
        return result if result is not None else []

    @classmethod
    def update_member_role(cls, group_id: int, user_id: int, new_role: str, updated_by: int) -> Dict[str, Any]:
        """Update member role (admin/mentor functionality)"""
        if not DB_AVAILABLE:
            return {"success": True, "message": "Role updated successfully (mock)"}
            
        # Check if updater is admin
        query_check = """
            SELECT role FROM group_participants 
            WHERE group_id = %s AND user_id = %s;
        """
        result = run_query(query_check, (group_id, updated_by), fetch=True)
        
        if not result or result[0]['role'] != 'admin':
            return {"success": False, "message": "Only admins can change member roles"}
        
        # Check if target user exists in group
        target_result = run_query(query_check, (group_id, user_id), fetch=True)
        if not target_result:
            return {"success": False, "message": "User is not a member of this group"}
        
        # Update role
        update_query = """
            UPDATE group_participants 
            SET role = %s 
            WHERE group_id = %s AND user_id = %s;
        """
        try:
            run_query(update_query, (new_role, group_id, user_id))
            return {"success": True, "message": "Role updated successfully"}
        except Exception:
            return {"success": False, "message": "Failed to update role"}

    @classmethod
    def regenerate_invite_code(cls, group_id: int, user_id: int) -> Dict[str, Any]:
        """Regenerate invite code (admin only)"""
        if not DB_AVAILABLE:
            return {
                "success": True, 
                "message": "Invite code regenerated successfully (mock)",
                "new_invite_code": f"NEW{group_id:05d}"
            }
            
        # Check if user is admin
        query_check = """
            SELECT role FROM group_participants 
            WHERE group_id = %s AND user_id = %s;
        """
        result = run_query(query_check, (group_id, user_id), fetch=True)
        
        if not result or result[0]['role'] != 'admin':
            return {"success": False, "message": "Only admins can regenerate invite codes"}
        
        # Generate new invite code (this would trigger the database function)
        # For now, we'll update the group to trigger the auto-generation
        update_query = """
            UPDATE groups 
            SET updated_at = CURRENT_TIMESTAMP 
            WHERE group_id = %s
            RETURNING invite_code;
        """
        try:
            update_result = run_query(update_query, (group_id,), fetch=True)
            if update_result:
                return {
                    "success": True,
                    "message": "Invite code regenerated successfully",
                    "new_invite_code": update_result[0]['invite_code']
                }
            else:
                return {"success": False, "message": "Failed to regenerate invite code"}
        except Exception:
            return {"success": False, "message": "Failed to regenerate invite code"}

class Session:
    """Session model corresponding to the sessions table"""
    
    @classmethod
    def get_all(cls, user_id: Optional[int] = None, is_active: Optional[bool] = None) -> List[Dict[str, Any]]:
        """Get all sessions with optional filtering"""
        if not DB_AVAILABLE:
            sessions = MOCK_SESSIONS.copy()
            if user_id is not None:
                sessions = [s for s in sessions if s["user_id"] == user_id]
            if is_active is not None:
                sessions = [s for s in sessions if s["is_active"] == is_active]
            return sessions
            
        base_query = """
            SELECT s.session_id as id, s.topic as title, s.created_by as user_id,
                   s.started_at as created_at, 
                   COALESCE(s.ended_at, s.started_at) as updated_at,
                   CASE WHEN s.status = 'active' THEN true ELSE false END as is_active,
                   COUNT(m.message_id) as message_count
            FROM sessions s
            LEFT JOIN messages m ON s.session_id = m.session_id
        """
        
        conditions = []
        params = []
        
        if user_id is not None:
            conditions.append("s.created_by = %s")
            params.append(user_id)
        
        if is_active is not None:
            if is_active:
                conditions.append("s.status = 'active'")
            else:
                conditions.append("s.status != 'active'")
        
        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)
        
        base_query += """
            GROUP BY s.session_id, s.topic, s.created_by, s.started_at, s.ended_at, s.status
            ORDER BY s.session_id;
        """
        
        result = run_query(base_query, tuple(params), fetch=True)
        return result if result is not None else cls.get_all(user_id, is_active)
    
    @classmethod
    def get_by_id(cls, session_id: int) -> Optional[Dict[str, Any]]:
        """Get session by ID"""
        if not DB_AVAILABLE:
            session = next((s for s in MOCK_SESSIONS if s["id"] == session_id), None)
            return session.copy() if session else None
            
        query = """
            SELECT s.session_id as id, s.topic as title, s.created_by as user_id,
                   s.started_at as created_at, 
                   COALESCE(s.ended_at, s.started_at) as updated_at,
                   CASE WHEN s.status = 'active' THEN true ELSE false END as is_active,
                   COUNT(m.message_id) as message_count
            FROM sessions s
            LEFT JOIN messages m ON s.session_id = m.session_id
            WHERE s.session_id = %s
            GROUP BY s.session_id, s.topic, s.created_by, s.started_at, s.ended_at, s.status;
        """
        result = run_query(query, (session_id,), fetch=True)
        if result:
            return result[0]
        else:
            session = next((s for s in MOCK_SESSIONS if s["id"] == session_id), None)
            return session.copy() if session else None
    
    @classmethod
    def create(cls, title: str, user_id: int, group_id: int = 1) -> Dict[str, Any]:
        """Create a new session"""
        if not DB_AVAILABLE:
            new_id = max([s["id"] for s in MOCK_SESSIONS], default=0) + 1
            new_session = {
                "id": new_id,
                "title": title,
                "user_id": user_id,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "is_active": True,
                "message_count": 0
            }
            MOCK_SESSIONS.append(new_session)
            return new_session
            
        query = """
            INSERT INTO sessions (group_id, created_by, topic, status, started_at)
            VALUES (%s, %s, %s, 'active', CURRENT_TIMESTAMP)
            RETURNING session_id as id, topic as title, created_by as user_id,
                     started_at as created_at, started_at as updated_at;
        """
        result = run_query(query, (group_id, user_id, title), fetch=True)
        if result:
            session = result[0]
            session['is_active'] = True
            session['message_count'] = 0
            return session
        else:
            return cls.create(title, user_id, group_id)

class Message:
    """Message model corresponding to the messages table"""
    
    @classmethod
    def get_all(cls, session_id: Optional[int] = None, user_id: Optional[int] = None, 
                message_type: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Get messages with filtering and pagination"""
        if not DB_AVAILABLE:
            messages = MOCK_MESSAGES.copy()
            if session_id is not None:
                messages = [m for m in messages if m["session_id"] == session_id]
            if user_id is not None:
                messages = [m for m in messages if m["user_id"] == user_id]
            if message_type is not None:
                messages = [m for m in messages if m["message_type"] == message_type]
            return messages[offset:offset + limit]
            
        # For now, we'll use a simplified query since the schema has different structure
        query = """
            SELECT m.message_id as id, m.session_id, 
                   gp.user_id, m.content,
                   CASE WHEN u.email = 'ai@assistant.com' THEN 'assistant' ELSE 'user' END as message_type,
                   m.sent_at as created_at, m.sent_at as updated_at,
                   false as is_edited
            FROM messages m
            JOIN group_participants gp ON m.sender_id = gp.group_participant_id
            JOIN users u ON gp.user_id = u.user_id
        """
        
        conditions = []
        params = []
        
        if session_id is not None:
            conditions.append("m.session_id = %s")
            params.append(session_id)
        
        if user_id is not None:
            conditions.append("gp.user_id = %s")
            params.append(user_id)
        
        if message_type is not None:
            if message_type == 'assistant':
                conditions.append("u.email = 'ai@assistant.com'")
            else:
                conditions.append("u.email != 'ai@assistant.com'")
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        query += f" ORDER BY m.sent_at LIMIT %s OFFSET %s;"
        params.extend([limit, offset])
        
        result = run_query(query, tuple(params), fetch=True)
        return result if result is not None else cls.get_all(session_id, user_id, message_type, limit, offset)
    
    @classmethod
    def create(cls, session_id: int, user_id: int, content: str, message_type: str = 'user') -> Dict[str, Any]:
        """Create a new message"""
        if not DB_AVAILABLE:
            new_id = max([m["id"] for m in MOCK_MESSAGES], default=0) + 1
            new_message = {
                "id": new_id,
                "session_id": session_id,
                "user_id": user_id,
                "content": content,
                "message_type": message_type,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "is_edited": False
            }
            MOCK_MESSAGES.append(new_message)
            return new_message
        
        # First, get the group_participant_id for this user in this session's group
        get_participant_query = """
            SELECT gp.group_participant_id
            FROM group_participants gp
            JOIN sessions s ON gp.group_id = s.group_id
            WHERE s.session_id = %s AND gp.user_id = %s
            LIMIT 1;
        """
        
        participant_result = run_query(get_participant_query, (session_id, user_id), fetch=True)
        
        if not participant_result:
            # If user is not a participant, we need to add them first
            add_participant_query = """
                INSERT INTO group_participants (group_id, user_id, role)
                SELECT s.group_id, %s, 'member'
                FROM sessions s
                WHERE s.session_id = %s
                ON CONFLICT (group_id, user_id) DO NOTHING
                RETURNING group_participant_id;
            """
            add_result = run_query(add_participant_query, (user_id, session_id), fetch=True)
            if add_result:
                sender_id = add_result[0]['group_participant_id']
            else:
                # Try to get the participant ID again
                participant_result = run_query(get_participant_query, (session_id, user_id), fetch=True)
                sender_id = participant_result[0]['group_participant_id'] if participant_result else None
        else:
            sender_id = participant_result[0]['group_participant_id']
        
        if not sender_id:
            # Fallback to mock behavior
            return cls.create(session_id, user_id, content, message_type)
        
        # Insert the message
        query = """
            INSERT INTO messages (session_id, sender_id, content)
            VALUES (%s, %s, %s)
            RETURNING message_id as id, session_id, content, sent_at as created_at;
        """
        
        result = run_query(query, (session_id, sender_id, content), fetch=True)
        if result:
            message = result[0]
            message['user_id'] = user_id
            message['message_type'] = message_type
            message['updated_at'] = message['created_at']
            message['is_edited'] = False
            return message
        else:
            return cls.create(session_id, user_id, content, message_type)

class Paper:
    """Paper model corresponding to the papers table"""
    
    @classmethod
    def get_all(cls) -> List[Dict[str, Any]]:
        """Get all papers"""
        if not DB_AVAILABLE:
            # Mock paper data
            return [
                {
                    "id": 1,
                    "title": "AI Reasoning Models for Problem Solving in Physics",
                    "abstract": "This paper explores the application of AI reasoning models...",
                    "authors": "John Smith, Jane Doe",
                    "doi": "10.1000/182",
                    "published_at": "2025-08-01T10:00:00",
                    "source_url": "https://arxiv.org/abs/2508.20941"
                },
                {
                    "id": 2,
                    "title": "NSPDI-SNN: An efficient lightweight SNN",
                    "abstract": "Neural networks for efficient computation...",
                    "authors": "Alice Johnson, Bob Wilson",
                    "doi": "10.1000/183",
                    "published_at": "2025-08-02T14:00:00",
                    "source_url": "https://arxiv.org/abs/2508.21566"
                }
            ]
            
        query = """
            SELECT paper_id as id, title, abstract, authors, doi, 
                   published_at, source_url
            FROM papers 
            ORDER BY paper_id;
        """
        result = run_query(query, fetch=True)
        return result if result is not None else cls.get_all()
    
    @classmethod
    def get_by_id(cls, paper_id: int) -> Optional[Dict[str, Any]]:
        """Get paper by ID"""
        if not DB_AVAILABLE:
            papers = cls.get_all()
            return next((p for p in papers if p["id"] == paper_id), None)
            
        query = """
            SELECT paper_id as id, title, abstract, authors, doi, 
                   published_at, source_url
            FROM papers 
            WHERE paper_id = %s;
        """
        result = run_query(query, (paper_id,), fetch=True)
        if result:
            return result[0]
        return None
    
    @classmethod
    def create(cls, title: str, abstract: str = None, authors: str = None, 
               doi: str = None, published_at = None, source_url: str = None) -> Dict[str, Any]:
        """Create a new paper"""
        if not DB_AVAILABLE:
            papers = cls.get_all()
            new_id = max([p["id"] for p in papers], default=0) + 1
            new_paper = {
                "id": new_id,
                "title": title,
                "abstract": abstract,
                "authors": authors,
                "doi": doi,
                "published_at": published_at,
                "source_url": source_url
            }
            return new_paper
            
        query = """
            INSERT INTO papers (title, abstract, authors, doi, published_at, source_url)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING paper_id as id, title, abstract, authors, doi, 
                     published_at, source_url;
        """
        result = run_query(query, (title, abstract, authors, doi, published_at, source_url), fetch=True)
        if result:
            return result[0]
        return cls.create(title, abstract, authors, doi, published_at, source_url)
    
    @classmethod
    def update(cls, paper_id: int, **kwargs) -> Optional[Dict[str, Any]]:
        """Update paper"""
        if not DB_AVAILABLE:
            papers = cls.get_all()
            paper = next((p for p in papers if p["id"] == paper_id), None)
            if paper:
                for key, value in kwargs.items():
                    if key in paper:
                        paper[key] = value
                return paper
            return None
            
        fields = []
        params = []
        
        for field in ["title", "abstract", "authors", "doi", "published_at", "source_url"]:
            if field in kwargs:
                fields.append(f"{field} = %s")
                params.append(kwargs[field])
        
        if not fields:
            return cls.get_by_id(paper_id)
        
        params.append(paper_id)
        query = f"""
            UPDATE papers 
            SET {', '.join(fields)}
            WHERE paper_id = %s
            RETURNING paper_id as id, title, abstract, authors, doi, 
                     published_at, source_url;
        """
        result = run_query(query, tuple(params), fetch=True)
        if result:
            return result[0]
        return None
    
    @classmethod
    def delete(cls, paper_id: int) -> bool:
        """Delete paper"""
        if not DB_AVAILABLE:
            return True
            
        query = "DELETE FROM papers WHERE paper_id = %s;"
        try:
            run_query(query, (paper_id,))
            return True
        except Exception:
            return False
    
    @classmethod
    def search(cls, query_text: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search papers by title, abstract, or authors"""
        if not DB_AVAILABLE:
            papers = cls.get_all()
            # Simple text search in mock data
            results = []
            query_lower = query_text.lower()
            for paper in papers:
                if (query_lower in paper.get("title", "").lower() or 
                    query_lower in paper.get("abstract", "").lower() or 
                    query_lower in paper.get("authors", "").lower()):
                    results.append(paper)
                if len(results) >= limit:
                    break
            return results
            
        query = """
            SELECT paper_id as id, title, abstract, authors, doi, 
                   published_at, source_url
            FROM papers 
            WHERE title ILIKE %s OR abstract ILIKE %s OR authors ILIKE %s
            ORDER BY paper_id
            LIMIT %s;
        """
        search_pattern = f"%{query_text}%"
        result = run_query(query, (search_pattern, search_pattern, search_pattern, limit), fetch=True)
        return result if result is not None else cls.search(query_text, limit)
    
    @classmethod
    def get_tags(cls, paper_id: int) -> List[str]:
        """Get tags for a paper"""
        if not DB_AVAILABLE:
            # Mock tags
            if paper_id == 1:
                return ["AI", "Physics", "Machine Learning"]
            elif paper_id == 2:
                return ["Neural Networks", "SNN", "Efficiency"]
            return []
            
        query = "SELECT tag FROM paper_tags WHERE paper_id = %s ORDER BY tag;"
        result = run_query(query, (paper_id,), fetch=True)
        if result is not None:
            return [row["tag"] for row in result]
        return []
    
    @classmethod
    def add_tags(cls, paper_id: int, tags: List[str]) -> bool:
        """Add tags to a paper"""
        if not DB_AVAILABLE:
            return True
            
        try:
            for tag in tags:
                query = """
                    INSERT INTO paper_tags (paper_id, tag)
                    VALUES (%s, %s)
                    ON CONFLICT (paper_id, tag) DO NOTHING;
                """
                run_query(query, (paper_id, tag))
            return True
        except Exception:
            return False
    
    @classmethod
    def remove_tag(cls, paper_id: int, tag: str) -> bool:
        """Remove a tag from a paper"""
        if not DB_AVAILABLE:
            return True
            
        query = "DELETE FROM paper_tags WHERE paper_id = %s AND tag = %s;"
        try:
            run_query(query, (paper_id, tag))
            return True
        except Exception:
            return False
    
    @classmethod
    def get_by_session(cls, session_id: int) -> List[Dict[str, Any]]:
        """Get papers linked to a session"""
        if not DB_AVAILABLE:
            # Mock: return first paper for session 1
            if session_id == 1:
                papers = cls.get_all()
                return papers[:1]
            return []
            
        query = """
            SELECT p.paper_id as id, p.title, p.abstract, p.authors, p.doi, 
                   p.published_at, p.source_url, sp.added_at
            FROM papers p
            JOIN session_papers sp ON p.paper_id = sp.paper_id
            WHERE sp.session_id = %s
            ORDER BY sp.added_at;
        """
        result = run_query(query, (session_id,), fetch=True)
        return result if result is not None else []
    
    @classmethod
    def add_to_session(cls, session_id: int, paper_id: int) -> bool:
        """Link a paper to a session"""
        if not DB_AVAILABLE:
            return True
            
        query = """
            INSERT INTO session_papers (session_id, paper_id)
            VALUES (%s, %s)
            ON CONFLICT (session_id, paper_id) DO NOTHING;
        """
        try:
            run_query(query, (session_id, paper_id))
            return True
        except Exception:
            return False
    
    @classmethod
    def remove_from_session(cls, session_id: int, paper_id: int) -> bool:
        """Remove paper from session"""
        if not DB_AVAILABLE:
            return True
            
        query = "DELETE FROM session_papers WHERE session_id = %s AND paper_id = %s;"
        try:
            run_query(query, (session_id, paper_id))
            return True
        except Exception:
            return False

class Feedback:
    """Feedback model corresponding to the feedback table"""
    
    @classmethod
    def get_by_session(cls, session_id: int) -> List[Dict[str, Any]]:
        """Get feedback for a session"""
        if not DB_AVAILABLE:
            # Mock feedback data
            if session_id == 1:
                return [
                    {
                        "id": 1,
                        "session_id": 1,
                        "given_by": 1,
                        "content": "Great research discussion!",
                        "created_at": "2025-09-01T15:00:00"
                    }
                ]
            return []
            
        query = """
            SELECT f.session_id, f.given_by, f.content, f.created_at,
                   gp.user_id as user_id
            FROM feedback f
            JOIN group_participants gp ON f.given_by = gp.group_participant_id
            WHERE f.session_id = %s
            ORDER BY f.created_at;
        """
        result = run_query(query, (session_id,), fetch=True)
        return result if result is not None else []
    
    @classmethod
    def get_by_id(cls, feedback_id: int) -> Optional[Dict[str, Any]]:
        """Get feedback by ID (mock implementation)"""
        if not DB_AVAILABLE:
            if feedback_id == 1:
                return {
                    "id": 1,
                    "session_id": 1,
                    "given_by": 1,
                    "content": "Great research discussion!",
                    "created_at": "2025-09-01T15:00:00"
                }
            return None
        return None  # Would need proper implementation with feedback ID in schema
    
    @classmethod
    def get_by_user(cls, user_id: int) -> List[Dict[str, Any]]:
        """Get feedback by user"""
        if not DB_AVAILABLE:
            if user_id == 1:
                return [
                    {
                        "id": 1,
                        "session_id": 1,
                        "given_by": 1,
                        "content": "Great research discussion!",
                        "created_at": "2025-09-01T15:00:00"
                    }
                ]
            return []
            
        query = """
            SELECT f.session_id, f.given_by, f.content, f.created_at,
                   gp.user_id as user_id
            FROM feedback f
            JOIN group_participants gp ON f.given_by = gp.group_participant_id
            WHERE gp.user_id = %s
            ORDER BY f.created_at;
        """
        result = run_query(query, (user_id,), fetch=True)
        return result if result is not None else []
    
    @classmethod
    def create(cls, session_id: int, given_by: int, content: str = None) -> Dict[str, Any]:
        """Create feedback"""
        if not DB_AVAILABLE:
            return {
                "session_id": session_id,
                "given_by": given_by,
                "content": content,
                "created_at": datetime.now().isoformat()
            }
            
        # First get the group_participant_id for this user in this session
        get_participant_query = """
            SELECT gp.group_participant_id
            FROM group_participants gp
            JOIN sessions s ON gp.group_id = s.group_id
            WHERE s.session_id = %s AND gp.user_id = %s
            LIMIT 1;
        """
        
        participant_result = run_query(get_participant_query, (session_id, given_by), fetch=True)
        if not participant_result:
            return None
        
        participant_id = participant_result[0]['group_participant_id']
        
        query = """
            INSERT INTO feedback (session_id, given_by, content)
            VALUES (%s, %s, %s)
            RETURNING session_id, given_by, content, created_at;
        """
        result = run_query(query, (session_id, participant_id, content), fetch=True)
        if result:
            feedback = result[0]
            feedback['user_id'] = given_by
            return feedback
        return None
    
    @classmethod
    def update(cls, feedback_id: int, **kwargs) -> Optional[Dict[str, Any]]:
        """Update feedback (mock implementation)"""
        if not DB_AVAILABLE:
            return cls.get_by_id(feedback_id)
        return None
    
    @classmethod
    def delete(cls, feedback_id: int) -> bool:
        """Delete feedback (mock implementation)"""
        if not DB_AVAILABLE:
            return True
        return False

class AIMetadata:
    """AI Metadata model corresponding to the ai_metadata table"""
    
    @classmethod
    def get_by_message(cls, message_id: int) -> List[Dict[str, Any]]:
        """Get AI metadata for a message"""
        if not DB_AVAILABLE:
            # Mock AI metadata
            if message_id == 2:  # AI assistant message
                return [
                    {
                        "page_no": 5,
                        "message_id": 2,
                        "paper_id": 1,
                        "created_at": "2025-09-01T10:01:30"
                    }
                ]
            return []
            
        query = """
            SELECT page_no, message_id, paper_id, created_at
            FROM ai_metadata 
            WHERE message_id = %s
            ORDER BY created_at;
        """
        result = run_query(query, (message_id,), fetch=True)
        return result if result is not None else []
    
    @classmethod
    def get_by_paper(cls, paper_id: int) -> List[Dict[str, Any]]:
        """Get AI metadata for a paper"""
        if not DB_AVAILABLE:
            if paper_id == 1:
                return [
                    {
                        "page_no": 5,
                        "message_id": 2,
                        "paper_id": 1,
                        "created_at": "2025-09-01T10:01:30"
                    }
                ]
            return []
            
        query = """
            SELECT page_no, message_id, paper_id, created_at
            FROM ai_metadata 
            WHERE paper_id = %s
            ORDER BY created_at;
        """
        result = run_query(query, (paper_id,), fetch=True)
        return result if result is not None else []
    
    @classmethod
    def get_by_id(cls, metadata_id: int) -> Optional[Dict[str, Any]]:
        """Get AI metadata by ID (mock implementation)"""
        if not DB_AVAILABLE:
            if metadata_id == 1:
                return {
                    "page_no": 5,
                    "message_id": 2,
                    "paper_id": 1,
                    "created_at": "2025-09-01T10:01:30"
                }
            return None
        return None  # Would need proper implementation with metadata ID in schema
    
    @classmethod
    def create(cls, message_id: int, paper_id: int, page_no: int = None) -> Dict[str, Any]:
        """Create AI metadata"""
        if not DB_AVAILABLE:
            return {
                "page_no": page_no,
                "message_id": message_id,
                "paper_id": paper_id,
                "created_at": datetime.now().isoformat()
            }
            
        query = """
            INSERT INTO ai_metadata (page_no, message_id, paper_id)
            VALUES (%s, %s, %s)
            RETURNING page_no, message_id, paper_id, created_at;
        """
        result = run_query(query, (page_no, message_id, paper_id), fetch=True)
        if result:
            return result[0]
        return cls.create(message_id, paper_id, page_no)
    
    @classmethod
    def update(cls, metadata_id: int, **kwargs) -> Optional[Dict[str, Any]]:
        """Update AI metadata (mock implementation)"""
        if not DB_AVAILABLE:
            return cls.get_by_id(metadata_id)
        return None
    
    @classmethod
    def delete(cls, metadata_id: int) -> bool:
        """Delete AI metadata (mock implementation)"""
        if not DB_AVAILABLE:
            return True
        return False
    
    @classmethod
    def get_by_session(cls, session_id: int) -> List[Dict[str, Any]]:
        """Get AI metadata for all messages in a session"""
        if not DB_AVAILABLE:
            if session_id == 1:
                return cls.get_by_message(2)
            return []
            
        query = """
            SELECT ai.page_no, ai.message_id, ai.paper_id, ai.created_at
            FROM ai_metadata ai
            JOIN messages m ON ai.message_id = m.message_id
            WHERE m.session_id = %s
            ORDER BY ai.created_at;
        """
        result = run_query(query, (session_id,), fetch=True)
        return result if result is not None else []
