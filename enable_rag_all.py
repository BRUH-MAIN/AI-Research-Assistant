#!/usr/bin/env python3
"""
Script to enable RAG for all sessions in the database
"""

import requests
import json

# Configuration
EXPRESS_DB_URL = "http://localhost:3001"
FASTAPI_URL = "http://localhost:8000"

def get_all_sessions():
    """Get all sessions from the database."""
    print("🔍 Fetching all sessions...")
    
    try:
        # Since we don't have a direct endpoint to get all sessions,
        # let's try a few common session IDs
        session_ids = []
        
        for session_id in range(1, 21):  # Check sessions 1-20
            try:
                response = requests.get(f"{FASTAPI_URL}/api/v1/session-rag/{session_id}/status", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    session_ids.append(session_id)
                    print(f"  ✓ Found session {session_id}")
            except:
                pass
        
        print(f"📋 Found {len(session_ids)} sessions: {session_ids}")
        return session_ids
        
    except Exception as e:
        print(f"❌ Error fetching sessions: {e}")
        return []

def enable_rag_for_session(session_id, user_id=1):
    """Enable RAG for a specific session."""
    
    try:
        # First check current status
        response = requests.get(f"{FASTAPI_URL}/api/v1/session-rag/{session_id}/status")
        if response.status_code == 200:
            data = response.json()
            if data.get('rag_enabled', False):
                print(f"  ✓ Session {session_id}: RAG already enabled")
                return True
        
        # Try Express endpoint first
        response = requests.post(f"{EXPRESS_DB_URL}/api/rag/sessions/{session_id}/enable", 
                               json={"enabled_by": user_id}, timeout=10)
        
        if response.status_code == 201:
            print(f"  ✅ Session {session_id}: RAG enabled via Express")
            return True
        
        # If Express fails, try FastAPI
        response = requests.post(f"{FASTAPI_URL}/api/v1/session-rag/{session_id}/enable", 
                               data={"enabled_by": user_id}, timeout=10)
        
        if response.status_code == 200:
            print(f"  ✅ Session {session_id}: RAG enabled via FastAPI")
            return True
        else:
            print(f"  ❌ Session {session_id}: Failed to enable RAG - {response.status_code}")
            return False
            
    except Exception as e:
        print(f"  ❌ Session {session_id}: Error - {e}")
        return False

def enable_rag_for_all_sessions():
    """Enable RAG for all sessions."""
    
    print("🚀 Enabling RAG for All Sessions")
    print("=" * 50)
    
    # Get all sessions
    session_ids = get_all_sessions()
    
    if not session_ids:
        print("❌ No sessions found or unable to fetch sessions")
        return
    
    print(f"\n🔄 Enabling RAG for {len(session_ids)} sessions...")
    
    success_count = 0
    failed_count = 0
    
    for session_id in session_ids:
        if enable_rag_for_session(session_id):
            success_count += 1
        else:
            failed_count += 1
    
    print("\n" + "=" * 50)
    print("📊 Results Summary:")
    print(f"  ✅ Successfully enabled: {success_count}")
    print(f"  ❌ Failed to enable: {failed_count}")
    print(f"  📈 Success rate: {(success_count / len(session_ids) * 100):.1f}%")
    
    if success_count > 0:
        print(f"\n🎉 RAG is now enabled for {success_count} sessions!")
        print("💡 You can now use @paper for research-based AI responses in these sessions.")

def create_sql_script():
    """Create a SQL script to enable RAG for all sessions."""
    
    sql_script = """
-- Enable RAG for all existing sessions
-- This script will enable RAG for all sessions in the database

DO $$
DECLARE
    session_record RECORD;
    enabled_count INTEGER := 0;
BEGIN
    -- Loop through all sessions
    FOR session_record IN 
        SELECT session_id FROM sessions 
        ORDER BY session_id
    LOOP
        -- Enable RAG for each session
        INSERT INTO session_rag_status (session_id, is_rag_enabled, rag_enabled_at, enabled_by)
        VALUES (session_record.session_id, true, CURRENT_TIMESTAMP, 1)
        ON CONFLICT (session_id) 
        DO UPDATE SET 
            is_rag_enabled = true,
            rag_enabled_at = CURRENT_TIMESTAMP,
            enabled_by = 1
        WHERE session_rag_status.is_rag_enabled = false;
        
        enabled_count := enabled_count + 1;
        RAISE NOTICE 'Enabled RAG for session %', session_record.session_id;
    END LOOP;
    
    RAISE NOTICE 'RAG enabled for % sessions total', enabled_count;
END $$;

-- Verify the results
SELECT 
    s.session_id,
    s.title,
    COALESCE(srs.is_rag_enabled, false) as rag_enabled,
    srs.rag_enabled_at,
    srs.enabled_by
FROM sessions s
LEFT JOIN session_rag_status srs ON s.session_id = srs.session_id
ORDER BY s.session_id;
"""
    
    with open('/home/bharath/Documents/DBMS/project/Ai-Research-Assistant-local/enable_rag_all_sessions.sql', 'w') as f:
        f.write(sql_script)
    
    print("📄 Created SQL script: enable_rag_all_sessions.sql")
    print("💡 You can run this script directly in your database to enable RAG for all sessions")

def main():
    """Main function."""
    
    print("🔧 RAG Enabler for All Sessions")
    print("=" * 40)
    print("1. Enable RAG via API calls")
    print("2. Create SQL script for manual execution")
    print("3. Both")
    
    choice = input("Choose option (1, 2, or 3): ").strip()
    
    if choice in ['1', '3']:
        enable_rag_for_all_sessions()
    
    if choice in ['2', '3']:
        print("\n" + "=" * 50)
        create_sql_script()

if __name__ == "__main__":
    main()