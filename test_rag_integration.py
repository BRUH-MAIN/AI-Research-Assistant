#!/usr/bin/env python3
"""
Test script to verify the @paper vs @ai integration is working correctly.
This script tests the key components of the dual AI system.
"""

import requests
import json
import time
import sys

# Configuration
EXPRESS_DB_URL = "http://localhost:3001"  # Express DB server
FASTAPI_URL = "http://localhost:8000"     # FastAPI server

def test_group_chat_triggers():
    """Test that group chat handles both @ai and @paper triggers correctly."""
    
    print("🧪 Testing Group Chat Triggers...")
    
    # Test data
    test_session_id = 1
    test_user_id = 1
    
    # Test @ai trigger (general purpose)
    ai_message = {
        "message": "@ai What is artificial intelligence?",
        "session_id": test_session_id,
        "user_id": test_user_id
    }
    
    # Test @paper trigger (RAG-enabled)
    paper_message = {
        "message": "@paper What does this paper say about neural networks?",
        "session_id": test_session_id,
        "user_id": test_user_id
    }
    
    print("📝 Testing @ai trigger...")
    try:
        response = requests.post(f"{EXPRESS_DB_URL}/api/group-chat/sessions/{test_session_id}/messages", json=ai_message)
        if response.status_code == 201:
            result = response.json()
            print(f"✅ @ai trigger successful: {result.get('content', 'No content')[:100]}...")
        else:
            print(f"❌ @ai trigger failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ @ai trigger error: {e}")
    
    print("\n📝 Testing @paper trigger...")
    try:
        response = requests.post(f"{EXPRESS_DB_URL}/api/group-chat/sessions/{test_session_id}/messages", json=paper_message)
        if response.status_code == 201:
            result = response.json()
            print(f"✅ @paper trigger successful: {result.get('content', 'No content')[:100]}...")
        else:
            print(f"❌ @paper trigger failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ @paper trigger error: {e}")

def test_automatic_processing():
    """Test that adding papers to sessions triggers automatic RAG processing."""
    
    print("\n🔄 Testing Automatic Paper Processing...")
    
    # Test data
    test_session_id = 1
    test_paper_data = {
        "title": "Test Paper on AI",
        "authors": "Test Author",
        "publication_date": "2024-01-01",
        "url": "https://arxiv.org/pdf/1706.03762.pdf",  # Transformer paper
        "paper_type": "research"
    }
    
    print("📄 Creating test paper...")
    try:
        # Create paper
        paper_response = requests.post(f"{EXPRESS_DB_URL}/api/papers", json=test_paper_data)
        if paper_response.status_code != 201:
            print(f"❌ Failed to create paper: {paper_response.status_code} - {paper_response.text}")
            return
        
        paper_result = paper_response.json()
        paper_id = paper_result.get('paper', {}).get('id')
        print(f"✅ Paper created with ID: {paper_id}")
        
        # Add paper to session (this should trigger auto-processing)
        session_paper_data = {
            "session_id": test_session_id,
            "paper_id": paper_id
        }
        
        print("🔗 Adding paper to session (should trigger auto-processing)...")
        session_response = requests.post(f"{EXPRESS_DB_URL}/api/papers/sessions/{test_session_id}/{paper_id}", json=session_paper_data)
        
        if session_response.status_code == 201:
            session_result = session_response.json()
            print(f"✅ Paper added to session successfully")
            if session_result.get('rag_processing_triggered'):
                print(f"🤖 Auto-processing triggered: {session_result.get('rag_processing_triggered')}")
            else:
                print("ℹ️  Auto-processing was not triggered")
        else:
            print(f"❌ Failed to add paper to session: {session_response.status_code} - {session_response.text}")
            
    except Exception as e:
        print(f"❌ Automatic processing test error: {e}")

def test_session_rag_status():
    """Test session RAG status endpoint."""
    
    print("\n📊 Testing Session RAG Status...")
    
    test_session_id = 1
    
    try:
        response = requests.get(f"{FASTAPI_URL}/api/v1/session-rag/{test_session_id}/status")
        if response.status_code == 200:
            status = response.json()
            print(f"✅ Session RAG status retrieved successfully")
            print(f"   RAG Enabled: {status.get('rag_enabled', False)}")
            print(f"   Total Papers: {status.get('papers_summary', {}).get('total_papers', 0)}")
            print(f"   Processed Papers: {status.get('papers_summary', {}).get('processed_papers', 0)}")
        else:
            print(f"❌ Failed to get session status: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Session status test error: {e}")

def main():
    """Run all integration tests."""
    
    print("🚀 Starting RAG Integration Tests")
    print("=" * 50)
    
    # Check if services are running
    print("🔍 Checking service availability...")
    
    try:
        express_response = requests.get(f"{EXPRESS_DB_URL}/api/", timeout=5)
        if express_response.status_code in [200, 401]:  # 401 means server is running but needs auth
            print("✅ Express DB server is running")
        else:
            print("❌ Express DB server is not responding correctly")
            return
    except Exception:
        print("❌ Express DB server is not reachable")
        return
    
    try:
        fastapi_response = requests.get(f"{FASTAPI_URL}/api/v1/", timeout=5)
        if fastapi_response.status_code == 200:
            print("✅ FastAPI server is running")
        else:
            print("❌ FastAPI server is not responding correctly")
            return
    except Exception:
        print("❌ FastAPI server is not reachable")
        return
    
    print("\n" + "=" * 50)
    
    # Run tests
    test_group_chat_triggers()
    test_automatic_processing()
    test_session_rag_status()
    
    print("\n" + "=" * 50)
    print("🏁 RAG Integration Tests Complete")

if __name__ == "__main__":
    main()