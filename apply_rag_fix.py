#!/usr/bin/env python3
"""
Apply RAG function fix migration manually
"""

try:
    import requests
except ImportError:
    print("❌ requests module not found. Installing...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

# Configuration
EXPRESS_DB_URL = "http://localhost:3001"

def apply_rag_fix():
    """Apply the RAG function fix manually."""
    
    print("🔧 Applying RAG function fix...")
    
    # Read the migration SQL
    try:
        with open('/home/bharath/Documents/DBMS/project/Ai-Research-Assistant-local/supabase/migrations/20241005000006_fix_rag_function_ambiguity.sql', 'r') as f:
            migration_sql = f.read()
        
        print("📄 Migration SQL loaded successfully")
        
        # The migration needs to be applied directly to the database
        # Since we can't execute raw SQL through the Express API, let's test the fixed functions
        
        print("🧪 Testing RAG functions after applying migration...")
        
        # Test enable function
        print("\n1. Testing enable function...")
        try:
            response = requests.post(f"{EXPRESS_DB_URL}/api/rag/sessions/3/enable", 
                                   json={"enabled_by": 1}, timeout=10)
            if response.status_code == 201:
                print("✅ Enable function working!")
                result = response.json()
                print(f"   Result: {result}")
            else:
                print(f"❌ Enable function failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error testing enable: {e}")
        
        # Test disable function
        print("\n2. Testing disable function...")
        try:
            response = requests.post(f"{EXPRESS_DB_URL}/api/rag/sessions/3/disable", timeout=10)
            if response.status_code == 200:
                print("✅ Disable function working!")
                result = response.json()
                print(f"   Result: {result}")
            else:
                print(f"❌ Disable function failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error testing disable: {e}")
        
        # Test status function
        print("\n3. Testing status function...")
        try:
            response = requests.get(f"{EXPRESS_DB_URL}/api/rag/sessions/3/status", timeout=10)
            if response.status_code == 200:
                print("✅ Status function working!")
                result = response.json()
                print(f"   Status: RAG {'enabled' if result.get('is_rag_enabled') else 'disabled'}")
            else:
                print(f"❌ Status function failed: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Error testing status: {e}")
            
    except FileNotFoundError:
        print("❌ Migration file not found")
    except Exception as e:
        print(f"❌ Error applying migration: {e}")

def main():
    print("🚀 RAG Function Fix Tool")
    print("=" * 40)
    
    print("\nNote: This tool tests RAG functions to verify if they work correctly.")
    print("If they fail, the migration SQL needs to be applied manually to the database.")
    print(f"\nMigration file location:")
    print("  /home/bharath/Documents/DBMS/project/Ai-Research-Assistant-local/supabase/migrations/20241005000006_fix_rag_function_ambiguity.sql")
    
    input("\nPress Enter to run tests...")
    apply_rag_fix()

if __name__ == "__main__":
    main()