# RAG Backend - AI Coding Agent Instructions

## Project Overview
This is a unified RAG (Retrieval-Augmented Generation) backend built with FastAPI that combines document management and Q&A capabilities. The system uses Pinecone for vector storage with hybrid search (dense + sparse vectors), Cohere for embeddings/reranking, and Groq for LLM inference.

## Architecture Patterns

### Core Components
- **`rag_module.py`**: Single-file monolithic architecture containing all functionality
- **`input/`**: PDF document storage directory (auto-created)
- **Jupyter notebooks**: Used for analysis and experimentation (see `analysis.ipynb`)

### Key Design Decisions
- **Hybrid Search Strategy**: Combines dense vectors (Cohere embeddings) with sparse vectors (BM25) for improved retrieval
- **Graceful Degradation**: Falls back to dense-only search if BM25 encoder fails or index doesn't support sparse vectors
- **Global Caching**: Uses module-level caches (`_embeddings_cache`, `_vector_store_cache`, etc.) with `@lru_cache` decorators
- **Batch Processing**: Documents processed in configurable batches (`BATCH_SIZE = 100`) to handle memory constraints

### Critical Configuration Constants
```python
CHUNK_SIZE = 1000           # Document chunking size
CHUNK_OVERLAP = 200         # Overlap between chunks
PINECONE_DIMENSION = 1024   # Cohere embed-english-v3.0 dimensions
PINECONE_METRIC = "dotproduct"  # Required for hybrid search
TOP_K = 20                  # Default retrieval count
```

## Development Workflows

### Starting the Server
```bash
# Direct execution
python rag_module.py

# Or with uvicorn (both run on 0.0.0.0:8000)
uvicorn rag_module:app --host 0.0.0.0 --port 8000
```

### Environment Setup
- **Required**: Copy `.env` file with API keys for Pinecone, Cohere, Groq, and optional Gemini/LangSmith
- **Dependencies**: Managed via `pyproject.toml` with uv lock file
- **Python**: Requires >=3.12.2

### Testing Endpoints
```bash
# Health check
curl http://localhost:8000/health

# Index statistics
curl http://localhost:8000/index/stats | jq

# Upload document
curl -X POST -F "file=@input/Resume.pdf" http://localhost:8000/documents/upload

# Ask question
curl -X POST -H "Content-Type: application/json" \
  -d '{"question": "What is the main topic?"}' \
  http://localhost:8000/qa/ask
```

## Project-Specific Conventions

### Error Handling Pattern
- **Hybrid Search Fallback**: Always attempt dense-only retrieval if hybrid fails
- **Metadata Cleaning**: Use `clean_metadata_for_json()` for API responses
- **Graceful Cache Failures**: Continue operation even if caching components fail

### Document Processing Flow
1. **Upload** → PDF saved to `input/` folder
2. **Load** → PyPDFLoader extracts pages
3. **Split** → RecursiveCharacterTextSplitter creates chunks
4. **Embed** → Cohere generates dense vectors + BM25 sparse vectors
5. **Upsert** → Batch upload to Pinecone with metadata including `text_content`

### API Design Patterns
- **Consistent Models**: All endpoints use Pydantic models for request/response
- **Metadata Enrichment**: Store both `text` and `text_content` fields for compatibility
- **Unique IDs**: Format: `{filename}_page_{page}_chunk_{index}`
- **Batch Operations**: All vector operations use configurable batch sizes

### Q&A Chain Architecture
```python
# Standard LangChain pattern with custom prompt
retriever → documents → stuff_documents_chain → retrieval_chain
```

### Critical Integration Points
- **Pinecone Index**: Must support sparse vectors (serverless spec with dotproduct metric)
- **BM25 Encoder**: Requires fitting with document corpus before use
- **Model Compatibility**: Hardcoded to Cohere embed-english-v3.0 (1024 dimensions)

### Memory Management
- **Global Caches**: Persist throughout application lifecycle
- **LRU Caching**: Applied to expensive initialization functions
- **Batch Processing**: Prevents memory overflow on large document sets

## File Structure Expectations
```
/
├── rag_module.py          # Main application (1365 lines)
├── pyproject.toml         # uv dependency management
├── .env                   # API keys (required)
├── input/                 # PDF storage (auto-created)
│   └── *.pdf             # Source documents
├── analysis.ipynb        # Research/experimentation
└── .github/
    └── copilot-instructions.md
```

## Common Operations
- **Debug retrieval**: Check `/index/stats` for vector counts and metadata
- **Reset index**: Use `/index/clear` (removes vectors) or `/index/delete` (removes index)
- **Fix metadata**: `/index/fix-metadata` updates all vectors with text content
- **Document management**: Upload via `/documents/upload`, remove via `/documents/remove`

### Jupyter Development Pattern
- Use `analysis.ipynb` for PDF analysis and experimentation
- Variables persist in kernel for iterative analysis
- Common imports: PyPDF2, pdfplumber, pandas, matplotlib, seaborn, wordcloud"""
Unified RAG module with FastAPI endpoints for document management and Q&A.

This module consolidates all RAG functionality including:
- Document upload and processing
- Vector store management 
- Question-answering chain
- Model initialization with caching
"""

import asyncio
import hashlib
import os
import glob
from pathlib import Path
from typing import Annotated, Optional, List, Dict, Any
from functools import lru_cache

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from tqdm.auto import tqdm

# LangChain imports
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_cohere import CohereEmbeddings, CohereRerank
from langchain_groq import ChatGroq
from langchain_community.retrievers import PineconeHybridSearchRetriever
from langchain_pinecone import PineconeVectorStore
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate

# Pinecone imports
from pinecone import Pinecone, ServerlessSpec
from pinecone_text.sparse import BM25Encoder

# Environment variables
from dotenv import load_dotenv

load_dotenv()

# Configuration constants
INPUT_FOLDER = "input"
INDEX_NAME = "langchain-test-index"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
BATCH_SIZE = 100
TOP_K = 20
TEMPERATURE = 0.2
MAX_TOKENS = 32000
PINECONE_DIMENSION = 1024  # Cohere embed-english-v3.0 uses 1024 dimensions
PINECONE_METRIC = "dotproduct"  # dotproduct metric supports both dense and sparse vectors for hybrid search
PINECONE_CLOUD = "aws"
PINECONE_REGION = "us-east-1"

# API Keys
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Models
EMBEDDING_MODEL = "embed-english-v3.0"
LLM_MODEL = "openai/gpt-oss-20b"
RERANK_MODEL = "rerank-english-v3.0"

# Pydantic models
class DocumentRemovalRequest(BaseModel):
    """Request model for document removal."""
    document_name: str
    use_metadata: Optional[bool] = False

class DocumentRemovalResponse(BaseModel):
    """Response model for document removal."""
    success: bool
    message: str
    chunks_removed: int
    document_name: str
    file_deleted: bool
    file_path: Optional[str] = None

class QuestionRequest(BaseModel):
    """Request model for Q&A queries."""
    question: str
    top_k: Optional[int] = TOP_K

class QuestionResponse(BaseModel):
    """Response model for Q&A queries."""
    question: str
    answer: str
    sources: List[Dict[str, Any]]
    metadata: Dict[str, Any]

# Global state for caching
_embeddings_cache = {}
_vector_store_cache = None
_qa_chain_cache = None
_bm25_encoder_cache = None

# FastAPI app
app = FastAPI(
    title="RAG Backend API",
    description="Unified RAG backend with document management and Q&A capabilities",
    version="1.0.0"
)

@lru_cache(maxsize=1)
def get_embeddings():
    """
    Initialize and return Cohere embedding model with caching to prevent redundant downloads.
    Uses Cohere embed-english-v3.0 model exclusively.
    
    Returns:
        CohereEmbeddings instance
        
    Raises:
        ValueError: If COHERE_API_KEY is not found
    """
    global _embeddings_cache
    
    if "cohere" in _embeddings_cache:
        return _embeddings_cache["cohere"]
    
    if not COHERE_API_KEY:
        raise ValueError("COHERE_API_KEY not found in environment variables.")
    
    embeddings = CohereEmbeddings(
        model=EMBEDDING_MODEL,  # embed-english-v3.0
        cohere_api_key=COHERE_API_KEY
    )
    
    _embeddings_cache["cohere"] = embeddings
    return embeddings

@lru_cache(maxsize=1)
def validate_index_for_hybrid_search():
    """
    Validate that the current index configuration supports hybrid search with sparse vectors.
    
    Returns:
        bool: True if index supports hybrid search, False otherwise
    """
    try:
        vector_store = get_vector_store()
        index = vector_store["index"]
        
        # Check index description to ensure it supports sparse vectors
        index_description = index.describe_index_stats()
        
        # Test if we can perform a hybrid query (this will fail if not supported)
        test_query_vector = [0.1] * PINECONE_DIMENSION
        test_sparse_vector = {'indices': [0, 1], 'values': [0.5, 0.3]}
        
        try:
            # Try a test query with sparse values
            result = index.query(
                vector=test_query_vector,
                sparse_vector=test_sparse_vector,
                top_k=1,
                include_metadata=False
            )
            print("Index validation successful: Hybrid search supported")
            return True
        except Exception as e:
            print(f"Index validation failed: Hybrid search not supported - {e}")
            return False
            
    except Exception as e:
        print(f"Error validating index: {e}")
        return False

def get_bm25_encoder():
    """
    Initialize BM25 encoder with caching.
    
    Returns:
        BM25Encoder instance or None if initialization fails
    """
    global _bm25_encoder_cache
    if _bm25_encoder_cache is not None:
        return _bm25_encoder_cache
    
    print("Initializing BM25 encoder...")
    try:
        _bm25_encoder_cache = BM25Encoder()
        print("BM25 encoder initialized successfully.")
        return _bm25_encoder_cache
    except Exception as e:
        print(f"Warning: Could not initialize BM25 encoder: {e}")
        _bm25_encoder_cache = None
        return None

def initialize_pinecone_index():
    """
    Initialize or connect to Pinecone index.
    
    Returns:
        Pinecone index instance
        
    Raises:
        ValueError: If PINECONE_API_KEY is not found
    """
    if not PINECONE_API_KEY:
        raise ValueError("PINECONE_API_KEY not found in environment variables.")
    
    print("Initializing Pinecone...")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    
    if INDEX_NAME not in pc.list_indexes().names():
        print(f"Creating index '{INDEX_NAME}'...")
        pc.create_index(
            name=INDEX_NAME,
            dimension=PINECONE_DIMENSION,
            metric=PINECONE_METRIC,
            spec=ServerlessSpec(cloud=PINECONE_CLOUD, region=PINECONE_REGION)
        )
        print(f"Index '{INDEX_NAME}' created successfully.")
    else:
        print(f"Index '{INDEX_NAME}' already exists.")
    
    index = pc.Index(INDEX_NAME)
    return index

def get_vector_store():
    """
    Get or initialize vector store with caching.
    
    Returns:
        Configured vector store instance
    """
    global _vector_store_cache
    if _vector_store_cache is not None:
        return _vector_store_cache
    
    embeddings = get_embeddings()
    index = initialize_pinecone_index()
    
    # Enable BM25 encoder for hybrid search
    bm25_encoder = get_bm25_encoder()
    
    # Validate if index supports hybrid search
    supports_hybrid = validate_index_for_hybrid_search() if bm25_encoder else False
    
    # Use hybrid retrieval if BM25 encoder is available and index supports it
    vectorstore = PineconeVectorStore(index=index, embedding=embeddings)
    
    if bm25_encoder and supports_hybrid:
        print("Creating hybrid retriever with BM25 encoder...")
        try:
            retriever = PineconeHybridSearchRetriever(
                embeddings=embeddings,
                sparse_encoder=bm25_encoder,
                index=index,
                top_k=TOP_K,
                alpha=0.5  # Balance between dense (0) and sparse (1) retrieval
            )
        except Exception as e:
            print(f"Failed to create hybrid retriever: {e}")
            print("Falling back to dense retrieval only...")
            retriever = vectorstore.as_retriever(search_kwargs={"k": TOP_K})
            bm25_encoder = None  # Disable BM25 for this session
    else:
        if bm25_encoder and not supports_hybrid:
            print("Index doesn't support hybrid search, using dense retrieval only...")
        else:
            print("BM25 encoder not available, using dense retrieval only...")
        retriever = vectorstore.as_retriever(search_kwargs={"k": TOP_K})
        bm25_encoder = None  # Disable BM25 for this session
    
    _vector_store_cache = {
        "index": index,
        "retriever": retriever,
        "embeddings": embeddings,
        "bm25_encoder": bm25_encoder
    }
    
    return _vector_store_cache

def ensure_bm25_fitted():
    """
    Ensure BM25 encoder is fitted with existing documents in the index.
    This function should be called before using the retriever for queries.
    """
    vector_store = get_vector_store()
    bm25_encoder = vector_store["bm25_encoder"]
    index = vector_store["index"]
    
    if not bm25_encoder or hasattr(bm25_encoder, '_fitted'):
        return  # No BM25 encoder or already fitted
    
    print("BM25 encoder not fitted. Attempting to fit with existing documents...")
    
    try:
        # Query some existing vectors to get their text content
        # This is a workaround since we can't directly get all texts from Pinecone
        stats = index.describe_index_stats()
        total_vectors = stats.total_vector_count
        
        if total_vectors == 0:
            print("No documents in index to fit BM25 encoder.")
            return
        
        # Query for some sample vectors to get text content
        # Use a dummy query to get some existing documents
        dummy_vector = [0.0] * PINECONE_DIMENSION
        query_result = index.query(
            vector=dummy_vector,
            top_k=min(100, int(total_vectors)),  # Get up to 100 samples
            include_metadata=True
        )
        
        if not query_result.matches:
            print("No documents found to fit BM25 encoder.")
            return
        
        # Extract text content from metadata
        sample_texts = []
        for match in query_result.matches:
            if match.metadata and 'text_content' in match.metadata:
                sample_texts.append(match.metadata['text_content'])
            elif match.metadata and 'text' in match.metadata:
                sample_texts.append(match.metadata['text'])
            elif match.metadata and 'content' in match.metadata:
                sample_texts.append(match.metadata['content'])
            else:
                # Use a generic text as fallback
                sample_texts.append("sample document text")
        
        if sample_texts:
            print(f"Fitting BM25 encoder with {len(sample_texts)} sample documents...")
            bm25_encoder.fit(sample_texts)
            bm25_encoder._fitted = True
            print("BM25 encoder fitted successfully with existing documents.")
        else:
            print("No text content found in existing documents for BM25 fitting.")
            
    except Exception as e:
        print(f"Warning: Could not fit BM25 encoder with existing documents: {e}")
        print("BM25 encoder will be disabled for this session.")

def get_qa_chain():
    """
    Get or initialize Q&A chain with caching.
    
    Returns:
        Configured RAG chain for question answering
        
    Raises:
        ValueError: If required API keys are not found
    """
    global _qa_chain_cache
    if _qa_chain_cache is not None:
        return _qa_chain_cache
    
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not found in environment variables.")
    
    llm = ChatGroq(
        model=LLM_MODEL,
        temperature=TEMPERATURE,
        max_tokens=MAX_TOKENS
    )
    
    if not COHERE_API_KEY:
        raise ValueError("COHERE_API_KEY not found in environment variables.")
    
    reranker = CohereRerank(model=RERANK_MODEL)
    
    vector_store = get_vector_store()
    retriever = vector_store["retriever"]

    custom_prompt_template = """You are an enterprise-grade RAG agent designed to answer questions based on provided context.

Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.

Context:
{context}

Question: {input}

Answer: """
    
    custom_prompt = ChatPromptTemplate.from_template(custom_prompt_template)
    
    doc_chain = create_stuff_documents_chain(llm=llm, prompt=custom_prompt)
    qa_chain = create_retrieval_chain(retriever=retriever, combine_docs_chain=doc_chain)
    
    _qa_chain_cache = {
        "chain": qa_chain,
        "reranker": reranker,
        "llm": llm
    }

    return _qa_chain_cache

def load_documents_from_folder(folder_path: str = INPUT_FOLDER) -> List:
    """
    Load all PDF documents from the specified folder.
    
    Args:
        folder_path: Path to the folder containing PDF files
        
    Returns:
        List of loaded documents
    """
    os.makedirs(folder_path, exist_ok=True)
    
    print(f"Loading documents from '{folder_path}' folder...")
    pdf_files = glob.glob(os.path.join(folder_path, "*.pdf"))

    if not pdf_files:
        print(f"No PDF files found in '{folder_path}' folder.")
        return []
    
    print(f"Found {len(pdf_files)} PDF files:")
    for pdf_file in pdf_files:
        print(f"  - {os.path.basename(pdf_file)}")
    
    documents = []
    for pdf_file in tqdm(pdf_files, desc="Loading PDFs"):
        loader = PyPDFLoader(pdf_file)
        docs = loader.load()
        documents.extend(docs)
    
    print(f"Loaded {len(documents)} pages from {len(pdf_files)} PDF files.")
    return documents

def split_documents(documents, chunk_size: int = CHUNK_SIZE, chunk_overlap: int = CHUNK_OVERLAP):
    """
    Split documents into chunks for processing.
    
    Args:
        documents: List of documents to split
        chunk_size: Size of each chunk
        chunk_overlap: Overlap between chunks
        
    Returns:
        List of document chunks
    """
    if not documents:
        print("No documents to split.")
        return []
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, 
        chunk_overlap=chunk_overlap
    )
    docs = text_splitter.split_documents(documents)
    print(f"Split documents into {len(docs)} chunks.")
    return docs

def upsert_documents_to_index(chunks):
    """
    Upsert document chunks to the vector index.
    
    Args:
        chunks: List of document chunks to upsert
        
    Returns:
        Number of chunks upserted
    """
    if not chunks:
        return 0
    
    vector_store = get_vector_store()
    index = vector_store["index"]
    embeddings = vector_store["embeddings"]
    bm25_encoder = vector_store["bm25_encoder"]
    
    print(f"Upserting {len(chunks)} chunks to Pinecone...")
    
    # Extract texts for BM25 fitting
    all_texts = [chunk.page_content for chunk in chunks]
    
    # Ensure BM25 encoder is fitted
    if bm25_encoder:
        if not hasattr(bm25_encoder, '_fitted'):
            print("Fitting BM25 encoder with document corpus...")
            try:
                # First try to fit with existing documents in the index
                ensure_bm25_fitted()
                
                # If still not fitted, fit with current documents
                if not hasattr(bm25_encoder, '_fitted'):
                    print("No existing documents found, fitting BM25 with current batch...")
                    bm25_encoder.fit(all_texts)
                    bm25_encoder._fitted = True
                    print("BM25 encoder fitted successfully with current documents.")
                
            except Exception as e:
                print(f"Warning: Failed to fit BM25 encoder: {e}")
                print("Continuing with dense vectors only...")
        else:
            print("BM25 encoder already fitted, proceeding with hybrid search...")
    
    # Process in batches
    upserted_count = 0
    for i in tqdm(range(0, len(chunks), BATCH_SIZE), desc="Upserting chunks"):
        batch_chunks = chunks[i:i + BATCH_SIZE]
        
        # Generate embeddings and IDs
        texts = [chunk.page_content for chunk in batch_chunks]
        metadata_list = []
        
        # Add text content to metadata for BM25 fitting later
        for chunk in batch_chunks:
            metadata = chunk.metadata.copy()
            metadata['text_content'] = chunk.page_content  # Store text for BM25 fitting
            metadata['text'] = chunk.page_content  # Also store as 'text' for PineconeVectorStore
            metadata_list.append(metadata)
        
        # Create unique IDs
        ids = []
        for j, chunk in enumerate(batch_chunks):
            source = chunk.metadata.get('source', 'unknown')
            page = chunk.metadata.get('page', 0)
            unique_id = f"{os.path.basename(source)}_page_{page}_chunk_{i+j}"
            ids.append(unique_id)
        
        # Generate embeddings
        vectors = embeddings.embed_documents(texts)
        
        # Generate sparse vectors if BM25 encoder is available
        sparse_vectors = None
        if bm25_encoder and hasattr(bm25_encoder, '_fitted'):
            try:
                sparse_vectors = bm25_encoder.encode_documents(texts)
                print(f"Generated sparse vectors for batch {i//BATCH_SIZE + 1}")
            except Exception as e:
                print(f"Warning: Failed to generate sparse vectors for batch {i//BATCH_SIZE + 1}: {e}")
                print("Continuing with dense vectors only for this batch...")
                sparse_vectors = None
        
        # Prepare vectors for upsert
        vectors_to_upsert = []
        for j in range(len(batch_chunks)):
            vector_data = {
                'id': ids[j],
                'values': vectors[j],
                'metadata': metadata_list[j]
            }
            
            # Add sparse values if available
            if sparse_vectors and j < len(sparse_vectors):
                try:
                    vector_data['sparse_values'] = sparse_vectors[j]
                except Exception as e:
                    print(f"Warning: Failed to add sparse values for vector {j}: {e}")
                    # Continue without sparse values for this vector
                
            vectors_to_upsert.append(vector_data)
        
        # Upsert to Pinecone with error handling
        try:
            index.upsert(vectors=vectors_to_upsert)
            upserted_count += len(batch_chunks)
        except Exception as e:
            # If hybrid upsert fails, try with dense vectors only
            print(f"Warning: Hybrid upsert failed: {e}")
            print("Retrying with dense vectors only...")
            
            dense_vectors_only = [
                (ids[j], vectors[j], metadata_list[j])
                for j in range(len(batch_chunks))
            ]
            
            try:
                index.upsert(vectors=dense_vectors_only)
                upserted_count += len(batch_chunks)
                print("Dense-only upsert successful")
            except Exception as e2:
                print(f"Error: Both hybrid and dense upsert failed: {e2}")
                raise e2
    
    print(f"Successfully upserted {upserted_count} chunks.")
    return upserted_count

def clean_metadata_for_json(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clean metadata to ensure it's JSON serializable.
    
    Args:
        metadata: Original metadata dictionary
        
    Returns:
        Cleaned metadata dictionary
    """
    def serialize_value(value, depth=0):
        # Prevent infinite recursion
        if depth > 5:
            return str(value)
            
        if isinstance(value, (str, int, float, bool, type(None))):
            return value
        elif isinstance(value, (list, tuple)):
            return [serialize_value(item, depth + 1) for item in value]
        elif isinstance(value, dict):
            return {str(k): serialize_value(v, depth + 1) for k, v in value.items()}
        else:
            return str(value)
    
    cleaned = {}
    for key, value in metadata.items():
        try:
            cleaned[str(key)] = serialize_value(value)
        except Exception as e:
            cleaned[str(key)] = f"<serialization_error: {str(e)}>"
    return cleaned

def safe_serialize_pinecone_stats(stats):
    """
    Safely serialize Pinecone stats object to prevent JSON encoding issues.
    
    Args:
        stats: Pinecone index stats object
        
    Returns:
        JSON-serializable dictionary
    """
    try:
        result = {
            "total_vector_count": getattr(stats, 'total_vector_count', 0),
            "dimension": getattr(stats, 'dimension', 0),
            "index_fullness": getattr(stats, 'index_fullness', 0.0)
        }
        
        # Handle namespaces carefully
        if hasattr(stats, 'namespaces') and stats.namespaces:
            namespaces = {}
            for ns_name, ns_stats in stats.namespaces.items():
                try:
                    if hasattr(ns_stats, 'vector_count'):
                        namespaces[str(ns_name)] = {
                            "vector_count": getattr(ns_stats, 'vector_count', 0)
                        }
                    else:
                        namespaces[str(ns_name)] = str(ns_stats)
                except Exception:
                    namespaces[str(ns_name)] = "<namespace_serialization_error>"
            result["namespaces"] = namespaces
        else:
            result["namespaces"] = {}
            
        return result
        
    except Exception as e:
        # Fallback to basic stats
        return {
            "total_vector_count": 0,
            "dimension": PINECONE_DIMENSION,
            "index_fullness": 0.0,
            "namespaces": {},
            "error": f"Stats serialization failed: {str(e)}"
        }

def get_index_stats():
    """
    Get current vector index statistics.
    
    Returns:
        Dictionary containing index statistics
    """
    vector_store = get_vector_store()
    index = vector_store["index"]
    stats = index.describe_index_stats()
    
    # Use safe serialization to prevent JSON encoding issues
    return safe_serialize_pinecone_stats(stats)

def fix_existing_document_metadata():
    """
    Fix existing documents in Pinecone by adding the missing 'text' key to their metadata.
    This function updates documents that have 'text_content' but not 'text' key.
    
    Returns:
        Number of documents updated
    """
    vector_store = get_vector_store()
    index = vector_store["index"]
    
    print("Checking and fixing existing document metadata...")
    
    # Query for all existing vectors
    try:
        dummy_vector = [0.0] * PINECONE_DIMENSION
        query_result = index.query(
            vector=dummy_vector,
            top_k=10000,  # Get all documents
            include_metadata=True
        )
        
        if not query_result.matches:
            print("No documents found in index.")
            return 0
        
        print(f"Found {len(query_result.matches)} documents to check")
        
        # Find documents that need fixing
        documents_to_fix = []
        for match in query_result.matches:
            if (match.metadata and 
                'text_content' in match.metadata and 
                'text' not in match.metadata):
                documents_to_fix.append(match)
        
        print(f"Found {len(documents_to_fix)} documents that need fixing")
        
        if not documents_to_fix:
            print("All documents already have the 'text' key.")
            return 0
        
        # Update documents in batches
        updated_count = 0
        for i in range(0, len(documents_to_fix), BATCH_SIZE):
            batch = documents_to_fix[i:i + BATCH_SIZE]
            
            # Update each document individually
            for match in batch:
                try:
                    # Create updated metadata with 'text' key
                    updated_metadata = match.metadata.copy()
                    updated_metadata['text'] = match.metadata['text_content']
                    
                    # Update the document
                    index.update(
                        id=match.id,
                        set_metadata=updated_metadata
                    )
                    updated_count += 1
                    
                except Exception as e:
                    print(f"Error updating document {match.id}: {e}")
            
            print(f"Updated batch of {len(batch)} documents (total: {updated_count})")
        
        print(f"Successfully updated {updated_count} documents with 'text' key")
        return updated_count
        
    except Exception as e:
        print(f"Error fixing document metadata: {e}")
        import traceback
        traceback.print_exc()
        return 0

@app.post("/index/fix-metadata")
async def fix_metadata():
    """
    Fix existing documents in Pinecone by adding missing 'text' keys to metadata.
    
    Returns:
        Result of the metadata fix operation
    """
    try:
        updated_count = fix_existing_document_metadata()
        return {
            "success": True,
            "message": f"Updated {updated_count} documents with missing 'text' key",
            "documents_updated": updated_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fixing metadata: {str(e)}")

def remove_document_chunks(document_name: str) -> int:
    """
    Remove all chunks of a specific document from the vector index.
    
    Args:
        document_name: Name of the document to remove
        
    Returns:
        Number of chunks removed
    """
    vector_store = get_vector_store()
    index = vector_store["index"]
    
    # First, get all vectors to find matching documents
    # Since Pinecone doesn't support $glob, we need to fetch and filter manually
    all_ids = []
    
    # Query all vectors in batches to find matching source metadata
    try:
        # Get index stats to understand the scale
        stats = index.describe_index_stats()
        total_vectors = stats.total_vector_count if hasattr(stats, 'total_vector_count') else 10000
        
        # Query in chunks to get all vectors
        query_result = index.query(
            vector=[0] * PINECONE_DIMENSION,  # Dummy vector
            top_k=min(10000, int(total_vectors)),  # Get as many as possible
            include_metadata=True
        )
        
        # Filter matches based on document name in source metadata
        matching_ids = []
        for match in query_result.matches:
            if (match.metadata and 
                'source' in match.metadata and 
                document_name in match.metadata['source']):
                matching_ids.append(match.id)
        
        if not matching_ids:
            return 0
        
        # Delete in batches
        deleted_count = 0
        for i in range(0, len(matching_ids), BATCH_SIZE):
            batch_ids = matching_ids[i:i + BATCH_SIZE]
            index.delete(ids=batch_ids)
            deleted_count += len(batch_ids)
        
        return deleted_count
        
    except Exception as e:
        print(f"Error in remove_document_chunks: {e}")
        # Fallback: try direct metadata-based deletion using namespace or alternative approach
        try:
            # Alternative approach: delete by metadata filter without $glob
            # Use exact source matching if possible
            index.delete(filter={"source": {"$eq": document_name}})
            return 1  # Return 1 as we can't count exact deletions with this method
        except Exception as fallback_error:
            print(f"Fallback deletion also failed: {fallback_error}")
            raise e

# FastAPI endpoints

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
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



@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    upsert_to_index: bool = Query(True, description="Whether to upsert chunks to vector index")
):
    """
    Upload a PDF document, process it into chunks, and optionally upsert to vector store.
    
    Args:
        file: PDF file to upload
        upsert_to_index: Whether to add chunks to vector index
        
    Returns:
        Processing results with optional indexing information
    """
    try:
        # Upload the document
        upload_dir = Path(INPUT_FOLDER)
        upload_dir.mkdir(parents=True, exist_ok=True)

        dest = upload_dir / file.filename
        with dest.open("wb") as f:
            f.write(await file.read())

        # Load and process the document
        loader = PyPDFLoader(str(dest))
        pages = loader.load()
        chunks = split_documents(pages)

        response = {
            "message": f"{file.filename} processed successfully",
            "filename": file.filename,
            "path": str(dest),
            "pages": len(pages),
            "chunks": len(chunks),
            "upserted": False,
            "chunks_upserted": 0
        }

        # Optionally upsert to vector store
        if upsert_to_index and chunks:
            try:
                initial_stats = get_index_stats()
                chunks_added = upsert_documents_to_index(chunks)
                final_stats = get_index_stats()
                
                response.update({
                    "upserted": True,
                    "chunks_upserted": chunks_added,
                    "index_stats": final_stats
                })
                
            except Exception as e:
                response["upsert_error"] = str(e)

        # Ensure the response is JSON serializable
        try:
            # Use our safe serialization function on the entire response
            return clean_metadata_for_json(response)
        except Exception as e:
            # Fallback to basic response if serialization fails
            return {
                "message": f"{file.filename} processed successfully",
                "filename": file.filename,
                "path": str(dest),
                "pages": len(pages),
                "chunks": len(chunks),
                "upserted": upsert_to_index and chunks,
                "chunks_upserted": response.get("chunks_upserted", 0),
                "serialization_warning": f"Full response serialization failed: {str(e)}"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

def get_documents_list():
    """
    Get a list of all documents in the vector index with their details.
    
    Returns:
        Dictionary containing document information grouped by source
    """
    vector_store = get_vector_store()
    index = vector_store["index"]
    
    try:
        # Query all vectors to get document information
        dummy_vector = [0.0] * PINECONE_DIMENSION
        query_result = index.query(
            vector=dummy_vector,
            top_k=10000,  # Get as many documents as possible
            include_metadata=True
        )
        
        if not query_result.matches:
            return {}
        
        # Group documents by source
        documents = {}
        for match in query_result.matches:
            if match.metadata and 'source' in match.metadata:
                source = match.metadata['source']
                # Extract just the filename from the full path
                doc_name = os.path.basename(source)
                
                if doc_name not in documents:
                    documents[doc_name] = {
                        "name": doc_name,
                        "source_path": source,
                        "chunk_count": 0,
                        "pages": set(),
                        "chunk_ids": []
                    }
                
                # Count chunks and track pages
                documents[doc_name]["chunk_count"] += 1
                documents[doc_name]["chunk_ids"].append(match.id)
                
                # Track pages if available
                if 'page' in match.metadata:
                    documents[doc_name]["pages"].add(match.metadata['page'])
        
        # Convert sets to counts and clean up
        for doc_name in documents:
            documents[doc_name]["page_count"] = len(documents[doc_name]["pages"])
            del documents[doc_name]["pages"]  # Remove the set, keep only count
            del documents[doc_name]["chunk_ids"]  # Remove IDs from response for cleaner output
        
        return documents
        
    except Exception as e:
        print(f"Error in get_documents_list: {e}")
        return {}

@app.get("/documents/list")
async def list_documents():
    """
    List all documents currently in the vector index with detailed information.
    
    Returns:
        List of documents with names, chunk counts, and other statistics
    """
    try:
        documents = get_documents_list()
        index_stats = get_index_stats()
        
        # Convert to list format for easier consumption
        documents_list = list(documents.values())
        
        return {
            "success": True,
            "total_documents": len(documents),
            "total_chunks": index_stats.get('total_vector_count', 0),
            "documents": documents_list,
            "summary": {
                "total_documents": len(documents),
                "total_chunks": sum(doc["chunk_count"] for doc in documents.values()),
                "avg_chunks_per_document": round(sum(doc["chunk_count"] for doc in documents.values()) / len(documents), 2) if documents else 0
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")

@app.delete("/documents/remove")
async def remove_document(request: DocumentRemovalRequest):
    """
    Remove all chunks of a specific document from the vector index and delete the file from input directory.
    
    Args:
        request: Document removal request
        
    Returns:
        Removal confirmation with count and file deletion status
    """
    try:
        # Remove chunks from vector index
        chunks_removed = remove_document_chunks(request.document_name)
        
        # Attempt to delete the file from input directory
        file_deleted = False
        file_path = None
        try:
            # Construct the file path
            file_path = os.path.join(INPUT_FOLDER, request.document_name)
            
            if os.path.exists(file_path):
                os.remove(file_path)
                file_deleted = True
                print(f"Deleted file: {file_path}")
            else:
                print(f"File not found in input directory: {file_path}")
                
        except Exception as file_error:
            print(f"Error deleting file {file_path}: {file_error}")
            file_deleted = False
        
        # Determine overall success
        success = chunks_removed > 0 or file_deleted
        
        # Create appropriate message
        messages = []
        if chunks_removed > 0:
            messages.append(f"removed {chunks_removed} chunks from vector index")
        if file_deleted:
            messages.append(f"deleted file from input directory")
        
        if not messages:
            message = f"No chunks found in vector index and no file found in input directory for '{request.document_name}'"
        else:
            message = f"Successfully {' and '.join(messages)} for '{request.document_name}'"
        
        return DocumentRemovalResponse(
            success=success,
            message=message,
            chunks_removed=chunks_removed,
            document_name=request.document_name,
            file_deleted=file_deleted,
            file_path=file_path if file_deleted else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing document: {str(e)}")



@app.get("/index/stats")
async def get_index_statistics():
    """
    Get current vector index statistics.
    
    Returns:
        Index statistics and metadata
    """
    try:
        stats = get_index_stats()
        return {
            "success": True,
            "stats": stats,
            "total_vectors": stats.get('total_vector_count', 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting index stats: {str(e)}")

@app.delete("/index/clear")
async def clear_index():
    """
    Clear all vectors from the index (DANGEROUS - use with caution).
    
    Returns:
        Confirmation of index clearing
    """
    try:
        vector_store = get_vector_store()
        index = vector_store["index"]
        index.delete(delete_all=True)
        return {
            "success": True,
            "message": "Index cleared successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing index: {str(e)}")

@app.delete("/index/delete")
async def delete_index():
    """
    Delete the entire Pinecone index (VERY DANGEROUS - use with extreme caution).
    This will permanently destroy the index and all its data.
    
    Returns:
        Confirmation of index deletion
    """
    try:
        if not PINECONE_API_KEY:
            raise ValueError("PINECONE_API_KEY not found in environment variables.")
        
        pc = Pinecone(api_key=PINECONE_API_KEY)
        
        # Check if index exists
        existing_indexes = pc.list_indexes().names()
        if INDEX_NAME not in existing_indexes:
            return {
                "success": False,
                "message": f"Index '{INDEX_NAME}' does not exist"
            }
        
        # Delete the index
        pc.delete_index(INDEX_NAME)
        
        # Clear cached vector store since index no longer exists
        global _vector_store_cache
        _vector_store_cache = None
        
        return {
            "success": True,
            "message": f"Index '{INDEX_NAME}' deleted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting index: {str(e)}")

@app.post("/index/recreate")
async def recreate_index_with_dotproduct():
    """
    Delete the current index and create a new one with dotproduct metric.
    This will permanently destroy all existing data in the index.
    
    Returns:
        Confirmation of index recreation
    """
    try:
        if not PINECONE_API_KEY:
            raise ValueError("PINECONE_API_KEY not found in environment variables.")
        
        pc = Pinecone(api_key=PINECONE_API_KEY)
        
        # Check if index exists and delete it
        existing_indexes = pc.list_indexes().names()
        if INDEX_NAME in existing_indexes:
            print(f"Deleting existing index '{INDEX_NAME}'...")
            pc.delete_index(INDEX_NAME)
            print(f"Index '{INDEX_NAME}' deleted successfully.")
        else:
            print(f"Index '{INDEX_NAME}' does not exist, proceeding to create new one.")
        
        # Clear cached vector store since index no longer exists
        global _vector_store_cache
        _vector_store_cache = None
        
        # Create new index with dotproduct metric
        print(f"Creating new index '{INDEX_NAME}' with dotproduct metric...")
        pc.create_index(
            name=INDEX_NAME,
            dimension=PINECONE_DIMENSION,
            metric=PINECONE_METRIC,  # This will now be "dotproduct"
            spec=ServerlessSpec(cloud=PINECONE_CLOUD, region=PINECONE_REGION)
        )
        print(f"Index '{INDEX_NAME}' created successfully with dotproduct metric.")
        
        return {
            "success": True,
            "message": f"Index '{INDEX_NAME}' recreated successfully with dotproduct metric",
            "metric": PINECONE_METRIC
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error recreating index: {str(e)}")

@app.post("/qa/ask", response_model=QuestionResponse)
async def ask_question(request: QuestionRequest):
    """
    Ask a question using the RAG system.
    
    Args:
        request: Question request with query and optional parameters
        
    Returns:
        Answer with sources and metadata
    """
    try:
        # Ensure BM25 encoder is fitted with existing documents
        ensure_bm25_fitted()
        
        qa_chain_data = get_qa_chain()
        qa_chain = qa_chain_data["chain"]
        reranker = qa_chain_data["reranker"]
        
        # Debug: Test the retriever directly before using the full chain
        vector_store = get_vector_store()
        retriever = vector_store["retriever"]
        index = vector_store["index"]
        
        print(f"Testing retriever directly with question: '{request.question}'")
        
        # Debug: Check what's actually in Pinecone
        print("=== DEBUG: Checking Pinecone index contents ===")
        try:
            # Query Pinecone directly to see document structure
            dummy_vector = [0.0] * PINECONE_DIMENSION
            query_result = index.query(
                vector=dummy_vector,
                top_k=3,
                include_metadata=True
            )
            
            print(f"Found {len(query_result.matches)} documents in Pinecone")
            for i, match in enumerate(query_result.matches[:2]):
                print(f"Document {i}:")
                print(f"  ID: {match.id}")
                print(f"  Score: {match.score}")
                print(f"  Metadata keys: {list(match.metadata.keys()) if match.metadata else 'No metadata'}")
                if match.metadata:
                    if 'text' in match.metadata:
                        print(f"  Text content length: {len(match.metadata['text'])}")
                    elif 'text_content' in match.metadata:
                        print(f"  Text_content length: {len(match.metadata['text_content'])}")
                    else:
                        print(f"  No 'text' or 'text_content' key found")
                        
        except Exception as e:
            print(f"Error querying Pinecone directly: {e}")
        
        print("=== DEBUG: Testing retriever ===")
        try:
            direct_docs = retriever.invoke(request.question)
            print(f"Direct retriever returned: {len(direct_docs)} documents")
            for i, doc in enumerate(direct_docs[:2]):
                print(f"Direct doc {i}: content length={len(doc.page_content) if hasattr(doc, 'page_content') else 'N/A'}")
        except Exception as e:
            print(f"Direct retriever failed: {e}")
            import traceback
            traceback.print_exc()
        
        # Get initial result
        print(f"Invoking full QA chain with question: '{request.question}'")
        result = qa_chain.invoke({"input": request.question})
        print(f"QA chain result keys: {list(result.keys()) if isinstance(result, dict) else 'Not a dict'}")
        
        # Apply reranking to improve document relevance
        reranked_docs = result.get('context', [])
        
        # Debug: Check if we have context documents
        print(f"Retrieved documents from chain: {len(reranked_docs)}")
        for i, doc in enumerate(reranked_docs[:2]):
            print(f"Doc {i}: content length={len(doc.page_content) if hasattr(doc, 'page_content') else 'N/A'}")
        
        # Apply reranking with improved document handling
        if result.get('context') and reranker:
            try:
                print(f"Number of documents to rerank: {len(result['context'])}")
                
                # Prepare documents for reranking with robust approach
                valid_documents = []
                for doc in result['context']:
                    if hasattr(doc, 'page_content') and doc.page_content.strip():
                        # Create a clean document format that Cohere expects
                        from langchain_core.documents import Document
                        clean_doc = Document(
                            page_content=doc.page_content,
                            metadata={
                                'text': doc.page_content,  # Explicit text key
                                'source': doc.metadata.get('source', 'unknown') if hasattr(doc, 'metadata') else 'unknown',
                                'page': doc.metadata.get('page', 0) if hasattr(doc, 'metadata') else 0
                            }
                        )
                        valid_documents.append(clean_doc)
                
                print(f"Valid documents for reranking: {len(valid_documents)}")
                
                if valid_documents:
                    reranked_docs = reranker.compress_documents(
                        documents=valid_documents,
                        query=request.question
                    )
                    print(f"Reranking successful: {len(reranked_docs)} documents returned")
                else:
                    print("No valid documents for reranking")
                    reranked_docs = result.get('context', [])
                    
            except Exception as e:
                print(f"Reranking failed with error: {e}")
                print(f"Error type: {type(e)}")
                import traceback
                traceback.print_exc()
                # If reranking fails, just use the original documents
                reranked_docs = result.get('context', [])
        else:
            print("Reranker not available or no context documents to rerank")
        
        # Format sources
        sources = []
        for i, doc in enumerate(reranked_docs[:5]):  # Top 5 sources
            sources.append({
                "rank": i + 1,
                "content": doc.page_content[:500] + "..." if len(doc.page_content) > 500 else doc.page_content,
                "metadata": clean_metadata_for_json(doc.metadata),
                "relevance_score": getattr(doc, 'relevance_score', None)
            })
        
        return QuestionResponse(
            question=request.question,
            answer=result.get('answer', 'No answer generated'),
            sources=sources,
            metadata={
                "total_sources": len(reranked_docs),
                "model_used": LLM_MODEL,
                "reranked": reranker is not None
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        Health status of the service
    """
    try:
        # Check if we can get basic stats
        get_index_stats()
        return {
            "status": "healthy",
            "embeddings_cached": len(_embeddings_cache) > 0,
            "vector_store_initialized": _vector_store_cache is not None,
            "qa_chain_initialized": _qa_chain_cache is not None
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)