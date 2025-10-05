# RAG Backend API Documentation

## Overview

The RAG (Retrieval-Augmented Generation) Backend API is a unified FastAPI service that provides document management and question-answering capabilities with research paper awareness. It uses hybrid search (dense + sparse vectors), Cohere embeddings, and Groq LLM for intelligent document processing and retrieval.

**Base URL**: `http://localhost:8000`

---

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

---

## Endpoints

### 1. Root Information

**GET** `/`

#### Description
Returns basic API information and available endpoints.

#### Request
No parameters required.

#### Response
```json
{
  "message": "Unified RAG Backend API",
  "version": "1.0.0",
  "endpoints": {
    "upload": "POST /documents/upload",
    "list_documents": "GET /documents/list",
    "remove_document": "DELETE /documents/remove",
    "index_stats": "GET /index/stats",
    "clear_index": "DELETE /index/clear",
    "delete_index": "DELETE /index/delete",
    "recreate_index": "POST /index/recreate",
    "ask_question": "POST /qa/ask"
  }
}
```

---

### 2. Health Check

**GET** `/health`

#### Description
Returns the health status of the service and initialization state of components.

#### Request
No parameters required.

#### Response
```json
{
  "status": "healthy|unhealthy",
  "embeddings_cached": boolean,
  "vector_store_initialized": boolean,
  "qa_chain_initialized": boolean
}
```

#### Response Fields
- `status`: Overall health status
- `embeddings_cached`: Whether embedding models are loaded
- `vector_store_initialized`: Whether vector store is ready
- `qa_chain_initialized`: Whether Q&A chain is ready

---

## Document Management

### 3. Upload Document

**POST** `/documents/upload`

#### Description
Upload a PDF document, process it with research paper awareness, and optionally add to vector index.

#### Request
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: PDF file (required)
  - `upsert_to_index`: Boolean query parameter (optional, default: true)

#### cURL Example
```bash
curl -X POST \
  -F "file=@research_paper.pdf" \
  "http://localhost:8000/documents/upload?upsert_to_index=true"
```

#### Response
```json
{
  "message": "research_paper.pdf processed successfully with research paper awareness",
  "filename": "research_paper.pdf",
  "path": "input/research_paper.pdf",
  "pages": 18,
  "chunks": 53,
  "upserted": true,
  "chunks_upserted": 53,
  "paper_metadata": {
    "paper_id": "research_paper",
    "title": "Evaluation Protocol Matters: Layer Importance in Transformer Models",
    "authors": [],
    "year": 2024,
    "venue": "arXiv"
  },
  "index_stats": {
    "total_vector_count": 53,
    "dimension": 1024,
    "index_fullness": 0.0,
    "namespaces": {
      "": {
        "vector_count": 53
      }
    }
  }
}
```

#### Response Fields
- `filename`: Name of uploaded file
- `path`: Local storage path
- `pages`: Number of PDF pages processed
- `chunks`: Number of text chunks created
- `upserted`: Whether chunks were added to vector index
- `chunks_upserted`: Number of chunks successfully indexed
- `paper_metadata`: Extracted research paper metadata
- `index_stats`: Current vector index statistics (if upserted)

#### Error Responses
```json
{
  "detail": "Error processing document: <error_message>"
}
```

---

### 4. List Documents

**GET** `/documents/list`

#### Description
List all documents currently indexed in the vector store with detailed statistics.

#### Request
No parameters required.

#### Response
```json
{
  "success": true,
  "total_documents": 1,
  "total_chunks": 53,
  "documents": [
    {
      "name": "research_paper.pdf",
      "source_path": "input/research_paper.pdf",
      "chunk_count": 53,
      "page_count": 18
    }
  ],
  "summary": {
    "total_documents": 1,
    "total_chunks": 53,
    "avg_chunks_per_document": 53.0
  }
}
```

#### Response Fields
- `total_documents`: Total number of indexed documents
- `total_chunks`: Total number of text chunks across all documents
- `documents`: Array of document information
- `summary`: Aggregated statistics

---

### 5. Remove Document

**DELETE** `/documents/remove`

#### Description
Remove all chunks of a specific document from vector index and delete the file from input directory.

#### Request Body
```json
{
  "document_name": "research_paper.pdf",
  "use_metadata": false
}
```

#### Request Fields
- `document_name`: Name of document to remove (required)
- `use_metadata`: Whether to use metadata for removal (optional, default: false)

#### cURL Example
```bash
curl -X DELETE \
  -H "Content-Type: application/json" \
  -d '{"document_name": "research_paper.pdf"}' \
  http://localhost:8000/documents/remove
```

#### Response
```json
{
  "success": true,
  "message": "Successfully removed 53 chunks from vector index and deleted file from input directory for 'research_paper.pdf'",
  "chunks_removed": 53,
  "document_name": "research_paper.pdf",
  "file_deleted": true,
  "file_path": "input/research_paper.pdf"
}
```

#### Response Fields
- `success`: Whether operation succeeded
- `message`: Detailed operation result
- `chunks_removed`: Number of chunks removed from index
- `document_name`: Name of removed document
- `file_deleted`: Whether local file was deleted
- `file_path`: Path of deleted file (if applicable)

---

## Vector Index Management

### 6. Index Statistics

**GET** `/index/stats`

#### Description
Get current vector index statistics and metadata.

#### Request
No parameters required.

#### Response
```json
{
  "success": true,
  "stats": {
    "total_vector_count": 53,
    "dimension": 1024,
    "index_fullness": 0.0,
    "namespaces": {
      "": {
        "vector_count": 53
      }
    }
  },
  "total_vectors": 53
}
```

#### Response Fields
- `total_vector_count`: Total vectors in index
- `dimension`: Vector dimensionality (1024 for Cohere embeddings)
- `index_fullness`: Index capacity usage (0.0-1.0)
- `namespaces`: Vector count per namespace

---

### 7. Clear Index

**DELETE** `/index/clear`

#### Description
⚠️ **DANGEROUS**: Clear all vectors from index and delete all files from input directory.

#### Request
No parameters required.

#### Response
```json
{
  "success": true,
  "message": "Index cleared successfully and 1 files deleted from input directory",
  "vectors_cleared": true,
  "files_deleted": 1
}
```

#### Response Fields
- `vectors_cleared`: Whether vector index was cleared
- `files_deleted`: Number of files deleted from input directory

---

### 8. Delete Index

**DELETE** `/index/delete`

#### Description
⚠️ **VERY DANGEROUS**: Permanently delete the entire Pinecone index.

#### Request
No parameters required.

#### Response
```json
{
  "success": true,
  "message": "Index 'langchain-test-index' deleted successfully"
}
```

---

### 9. Recreate Index

**POST** `/index/recreate`

#### Description
⚠️ **DANGEROUS**: Delete current index and create new one with dotproduct metric.

#### Request
No parameters required.

#### Response
```json
{
  "success": true,
  "message": "Index 'langchain-test-index' recreated successfully with dotproduct metric",
  "metric": "dotproduct"
}
```

---

### 10. Fix Metadata

**POST** `/index/fix-metadata`

#### Description
Fix existing documents by adding missing 'text' keys to metadata.

#### Request
No parameters required.

#### Response
```json
{
  "success": true,
  "message": "Updated 53 documents with missing 'text' key",
  "documents_updated": 53
}
```

---

## Question & Answer

### 11. Ask Question

**POST** `/qa/ask`

#### Description
Ask a question using the RAG system with research paper awareness, section detection, and citation extraction.

#### Request Body
```json
{
  "question": "What is the main methodology used in this paper?",
  "top_k": 20
}
```

#### Request Fields
- `question`: Question to ask (required)
- `top_k`: Number of top documents to retrieve (optional, default: 20)

#### cURL Example
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the main methodology used in this paper?"}' \
  http://localhost:8000/qa/ask
```

#### Response
```json
{
  "question": "What is the main methodology used in this paper?",
  "answer": "**Main methodology**\n\nThe paper conducts a *systematic layer‑pruning study* to quantify how each transformer layer contributes to performance under different evaluation settings...",
  "sources": [
    {
      "rank": 1,
      "content": "We evaluateLLaMA-3.1-8Bon theHellaSwag(Zellers et al., 2019) commonsense dataset under alayer\npruningsetting. Three evaluation metrics are considered...",
      "metadata": {
        "text": "We evaluateLLaMA-3.1-8Bon theHellaSwag...",
        "source": "input/paper.pdf",
        "page": 3.0,
        "section": "",
        "citations": ["acc", "Zellers et al., 2019"],
        "paper_id": "paper"
      },
      "relevance_score": 0.001477943,
      "citations": ["acc", "Zellers et al., 2019"],
      "paper_id": "paper"
    }
  ],
  "metadata": {
    "total_sources": 3,
    "model_used": "openai/gpt-oss-20b",
    "reranked": true,
    "sections_referenced": ["Methodology", "Results"],
    "citations_found": ["Zellers et al., 2019", "Hendrycks et al., 2021"],
    "papers_referenced": ["paper"],
    "research_paper_aware": true
  }
}
```

#### Response Fields
- `question`: Original question
- `answer`: Generated answer with markdown formatting
- `sources`: Array of relevant source chunks
  - `rank`: Source ranking (1-5)
  - `content`: Relevant text excerpt (truncated to 500 chars)
  - `metadata`: Rich metadata including citations, sections, paper info
  - `relevance_score`: Relevance score from reranker
- `metadata`: Answer metadata
  - `total_sources`: Total number of sources considered
  - `model_used`: LLM model used for generation
  - `reranked`: Whether Cohere reranker was applied
  - `sections_referenced`: Academic paper sections referenced
  - `citations_found`: Citations extracted from sources
  - `papers_referenced`: Paper IDs referenced
  - `research_paper_aware`: Indicates enhanced research paper processing

---

## Data Models

### Research Paper Metadata
```json
{
  "paper_id": "string",
  "title": "string",
  "authors": ["string"],
  "year": integer,
  "venue": "string"
}
```

### Document Chunk Metadata
```json
{
  "source": "string",
  "page": number,
  "section": "string",
  "subsection": "string", 
  "citations": ["string"],
  "figures_tables": [
    {
      "type": "figure|table",
      "label": "string",
      "caption": "string"
    }
  ],
  "chunk_type": "section_content|figure|table|content",
  "text": "string",
  "text_content": "string"
}
```

---

## Error Handling

All endpoints return HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `422`: Unprocessable Entity (validation error)
- `500`: Internal Server Error

Error responses follow this format:
```json
{
  "detail": "Error description"
}
```

---

## Configuration

### Environment Variables Required
- `PINECONE_API_KEY`: Pinecone vector database API key
- `COHERE_API_KEY`: Cohere embeddings and reranking API key  
- `GROQ_API_KEY`: Groq LLM API key
- `GEMINI_API_KEY`: Optional Gemini API key

### Key Configuration Constants
- `CHUNK_SIZE`: 1000 (document chunk size)
- `CHUNK_OVERLAP`: 200 (overlap between chunks)
- `PINECONE_DIMENSION`: 1024 (Cohere embed-english-v3.0)
- `TOP_K`: 20 (default retrieval count)
- `BATCH_SIZE`: 100 (processing batch size)

---

## Features

### Research Paper Awareness
- Automatic section detection (Abstract, Introduction, Methodology, etc.)
- Citation extraction and tracking
- Figure/table caption processing
- Paper metadata extraction (title, authors, year, venue)

### Hybrid Search
- Dense vectors (semantic similarity via Cohere embeddings)
- Sparse vectors (keyword matching via BM25)
- Automatic fallback to dense-only if hybrid unsupported

### Advanced Processing
- Hierarchical document chunking
- Section-aware chunk labeling
- Citation and reference tracking
- Automatic metadata enhancement

### Caching & Performance
- Global component caching (embeddings, vector store, QA chain)
- Batch processing for large documents
- LRU caching for expensive operations
- Graceful degradation on component failures