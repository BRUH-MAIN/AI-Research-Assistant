# RAG Upload Instructions

## Problem Identified
Your session 11 has a paper (ID: 4) but it only contains metadata - no actual PDF file. 
RAG requires the actual PDF content to create embeddings and enable @paper commands.

## Solution: Upload PDF file

### Method 1: Through Frontend (Recommended)
1. Go to your session in the browser
2. Use the paper upload feature
3. Select and upload a PDF file
4. The system will automatically:
   - Create a RAG document entry
   - Process the PDF into chunks
   - Generate embeddings
   - Update the status to "completed"

### Method 2: Manual API Upload (For Testing)
If you want to test with the sample PDF file:

```bash
# Upload the sample PDF to session 11, paper 4
curl -X POST "http://localhost:8000/api/v1/session-rag/11/papers/upload" \
  -F "paper_id=4" \
  -F "file=@/home/bharath/Documents/DBMS/project/Ai-Research-Assistant-local/data/input/paper_3_Intersymbolic_AI_Interlinking_Symbolic_AI_and_Subs.pdf"

# Then process it
curl -X POST "http://localhost:8000/api/v1/session-rag/11/papers/4/process"

# Check status
curl "http://localhost:3001/api/rag/sessions/11/status" | jq .
```

## Expected Result
After uploading and processing a PDF:
- `total_papers`: 1
- `processed_papers`: 1  
- Paper status will show: `"has_rag": true, "rag_status": "completed"`
- @paper commands will become available in chat

## Current Status
- Session 11: RAG enabled ✓
- Papers in session: 1 ✓  
- PDF files: 0 ✗ (This is the issue)
- Processed papers: 0 ✗ (Because no PDF to process)