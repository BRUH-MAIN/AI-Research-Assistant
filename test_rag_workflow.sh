#!/bin/bash

# Test RAG workflow with sample PDF
echo "Testing RAG workflow with sample PDF..."

SESSION_ID=11
PDF_PATH="/home/bharath/Documents/DBMS/project/Ai-Research-Assistant-local/data/input/paper_3_Intersymbolic_AI_Interlinking_Symbolic_AI_and_Subs.pdf"

echo "1. Creating a test paper entry..."
# First create a paper entry manually for testing
PAPER_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/papers" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Intersymbolic AI: Interlinking Symbolic AI and Subsymbolic AI",
    "abstract": "Test paper for RAG functionality",
    "authors": "Test Author"
  }')

echo "Paper response: $PAPER_RESPONSE"

# Extract paper ID (this would need proper JSON parsing in real scenario)
PAPER_ID=$(echo "$PAPER_RESPONSE" | grep -o '"paper_id":[0-9]*' | cut -d':' -f2)
echo "Created paper ID: $PAPER_ID"

if [ -z "$PAPER_ID" ]; then
  echo "Failed to create paper, testing with existing paper ID 4"
  PAPER_ID=4
fi

echo "2. Adding paper to session $SESSION_ID..."
curl -s -X POST "http://localhost:3001/api/sessions/$SESSION_ID/papers" \
  -H "Content-Type: application/json" \
  -d "{\"paper_id\": $PAPER_ID}"

echo "3. Uploading PDF to FastAPI RAG service..."
curl -s -X POST "http://localhost:8000/api/v1/session-rag/$SESSION_ID/papers/upload" \
  -F "paper_id=$PAPER_ID" \
  -F "file=@$PDF_PATH"

echo "4. Processing paper for RAG..."
curl -s -X POST "http://localhost:8000/api/v1/session-rag/$SESSION_ID/papers/$PAPER_ID/process"

echo "5. Checking RAG status..."
curl -s "http://localhost:3001/api/rag/sessions/$SESSION_ID/status" | jq .

echo "6. Checking session papers..."
curl -s "http://localhost:3001/api/rag/sessions/$SESSION_ID/papers" | jq .