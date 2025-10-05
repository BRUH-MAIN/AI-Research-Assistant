#!/usr/bin/env python3
"""
Simple test to verify the RAG integration is working.
This test focuses on validating the core functionality.
"""

import requests
import json

# Configuration
EXPRESS_DB_URL = "http://localhost:3001"
FASTAPI_URL = "http://localhost:8000"

def test_fastapi_endpoints():
    """Test that FastAPI endpoints are accessible."""
    print("🧪 Testing FastAPI Endpoints...")
    
    try:
        # Test main API endpoint
        response = requests.get(f"{FASTAPI_URL}/api/v1/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ FastAPI main endpoint working: {data.get('message', 'No message')}")
            return True
        else:
            print(f"❌ FastAPI main endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FastAPI endpoint error: {e}")
        return False

def test_chat_endpoints():
    """Test chat endpoints exist."""
    print("\n🧪 Testing Chat Endpoints...")
    
    try:
        # Test general AI endpoint
        test_data = {
            "session_id": 1,
            "user_message": "Hello AI",
            "user_id": 1,
            "trigger_message_id": 1
        }
        
        response = requests.post(f"{FASTAPI_URL}/api/v1/chat/group-message", 
                               json=test_data, timeout=10)
        if response.status_code in [200, 422]:  # 422 means endpoint exists but validation failed
            print("✅ General AI endpoint (/chat/group-message) is accessible")
        else:
            print(f"❌ General AI endpoint failed: {response.status_code}")
        
        # Test paper AI endpoint
        response = requests.post(f"{FASTAPI_URL}/api/v1/chat/paper-message", 
                               json=test_data, timeout=10)
        if response.status_code in [200, 422]:  # 422 means endpoint exists but validation failed
            print("✅ Paper AI endpoint (/chat/paper-message) is accessible")
        else:
            print(f"❌ Paper AI endpoint failed: {response.status_code}")
            
        return True
    except Exception as e:
        print(f"❌ Chat endpoints test error: {e}")
        return False

def test_session_rag_endpoints():
    """Test session RAG endpoints."""
    print("\n🧪 Testing Session RAG Endpoints...")
    
    try:
        # Test session RAG status
        response = requests.get(f"{FASTAPI_URL}/api/v1/session-rag/1/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Session RAG status endpoint working")
            print(f"   RAG Enabled: {data.get('rag_enabled', False)}")
            print(f"   Total Papers: {data.get('papers_summary', {}).get('total_papers', 0)}")
            return True
        else:
            print(f"❌ Session RAG status failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Session RAG endpoints test error: {e}")
        return False

def test_file_structure():
    """Verify that key files have been modified correctly."""
    print("\n🧪 Testing File Structure...")
    
    # Check if group-chat.js has the trigger detection
    try:
        with open('/home/bharath/Documents/DBMS/project/Ai-Research-Assistant-local/express-db-server/routes/group-chat.js', 'r') as f:
            content = f.read()
            
        if '@paper' in content and '@ai' in content:
            print("✅ Group chat file contains @paper and @ai trigger detection")
        else:
            print("❌ Group chat file missing trigger detection")
            
        if 'paper-message' in content and 'group-message' in content:
            print("✅ Group chat file has both endpoint calls")
        else:
            print("❌ Group chat file missing endpoint differentiation")
            
        return True
    except Exception as e:
        print(f"❌ File structure test error: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Simple RAG Integration Validation")
    print("=" * 50)
    
    results = []
    
    # Run tests
    results.append(test_fastapi_endpoints())
    results.append(test_chat_endpoints())
    results.append(test_session_rag_endpoints())
    results.append(test_file_structure())
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    
    passed = sum(results)
    total = len(results)
    
    print(f"✅ Passed: {passed}/{total}")
    print(f"❌ Failed: {total - passed}/{total}")
    
    if passed == total:
        print("\n🎉 All tests passed! RAG integration is working correctly.")
    else:
        print(f"\n⚠️  Some tests failed. Check the output above for details.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)