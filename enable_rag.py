#!/usr/bin/env python3
"""
Quick script to enable RAG for a session
"""

try:
    import requests
except ImportError:
    print("❌ requests module not found. Installing...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

import json

# Configuration
EXPRESS_DB_URL = "http://localhost:3001"

def enable_rag_for_session(session_id, user_id):
    """Enable RAG for a specific session."""
    
    print(f"🔄 Enabling RAG for session {session_id}...")
    
    try:
        response = requests.post(f"{EXPRESS_DB_URL}/api/rag/sessions/{session_id}/enable", 
                               json={"enabled_by": user_id}, timeout=10)
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ RAG enabled successfully for session {session_id}")
            print(f"   Enabled by user: {user_id}")
            print(f"   Details: {result}")
            return True
        else:
            print(f"❌ Failed to enable RAG: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to Express DB server at {EXPRESS_DB_URL}")
        print("   Make sure the services are running with: ./start.sh")
        return False
    except Exception as e:
        print(f"❌ Error enabling RAG: {e}")
        return False

def check_rag_status(session_id):
    """Check RAG status for a session."""
    
    print(f"🔍 Checking RAG status for session {session_id}...")
    
    try:
        response = requests.get(f"{EXPRESS_DB_URL}/api/rag/sessions/{session_id}/status", timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ RAG Status:")
            print(f"   Enabled: {result.get('is_rag_enabled', False)}")
            print(f"   Enabled by: {result.get('enabled_by_name', 'Unknown')}")
            print(f"   Enabled at: {result.get('rag_enabled_at', 'Unknown')}")
            print(f"   Total papers: {result.get('total_papers', 0)}")
            print(f"   Processed papers: {result.get('processed_papers', 0)}")
            return result
        else:
            print(f"❌ Failed to check status: {response.status_code} - {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to Express DB server at {EXPRESS_DB_URL}")
        print("   Make sure the services are running with: ./start.sh")
        return None
    except Exception as e:
        print(f"❌ Error checking status: {e}")
        return None

def enable_rag_for_all_existing_sessions(user_id=1):
    """Enable RAG for all existing sessions."""
    
    print("🚀 Enabling RAG for all existing sessions...")
    
    # Common session IDs to try (1-20)
    session_ids_to_try = list(range(1, 21))
    
    success_count = 0
    for session_id in session_ids_to_try:
        # First check if session exists by checking its status
        try:
            status_response = requests.get(f"{EXPRESS_DB_URL}/api/rag/sessions/{session_id}/status", timeout=5)
            if status_response.status_code == 200:
                status_data = status_response.json()
                if status_data.get('is_rag_enabled', False):
                    print(f"  ✓ Session {session_id}: RAG already enabled")
                    success_count += 1
                else:
                    # Try to enable RAG
                    if enable_rag_for_session(session_id, user_id):
                        success_count += 1
            # If status check fails, session probably doesn't exist, so skip silently
        except Exception:
            # Skip sessions that don't exist or have other issues
            continue
    
    print(f"\n📊 Results: Successfully enabled RAG for {success_count} sessions")
    return success_count

def main():
    """Main function."""
    
    print("🚀 RAG Enable/Disable Tool")
    print("=" * 40)
    
    print("\nWhat would you like to do?")
    print("1. Enable RAG for a specific session")
    print("2. Check RAG status for a specific session")
    print("3. Enable RAG for ALL existing sessions")
    
    choice = input("Enter choice (1, 2, or 3): ").strip()
    
    if choice == "1":
        session_input = input("Enter session ID (default 1): ").strip()
        session_id = int(session_input) if session_input else 1
        
        user_input = input("Enter user ID (default 1): ").strip()
        user_id = int(user_input) if user_input else 1
        
        enable_rag_for_session(session_id, user_id)
        
    elif choice == "2":
        session_input = input("Enter session ID (default 1): ").strip()
        session_id = int(session_input) if session_input else 1
        
        check_rag_status(session_id)
        
    elif choice == "3":
        user_input = input("Enter user ID (default 1): ").strip()
        user_id = int(user_input) if user_input else 1
        
        confirm = input("This will enable RAG for all existing sessions. Continue? (y/N): ").strip().lower()
        if confirm == 'y':
            enable_rag_for_all_existing_sessions(user_id)
        else:
            print("Operation cancelled.")
    else:
        print("Invalid choice. Checking status for session 1 by default...")
        check_rag_status(1)

if __name__ == "__main__":
    main()