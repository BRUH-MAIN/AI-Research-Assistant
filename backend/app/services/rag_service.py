"""
Enhanced RAG Service module for AI Research Assistant.
Provides comprehensive document management and question-answering capabilities with research paper awareness.

This module consolidates all RAG functionality including:
- Document upload and processing with hierarchical chunking
- Vector store management with hybrid search
- Question-answering chain with research paper awareness
- Model initialization with caching
- Index management operations
"""

import os
import glob
import re
import traceback
from pathlib import Path
from typing import Optional, List, Dict, Any
from functools import lru_cache

from fastapi import UploadFile, HTTPException
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
from langchain_core.documents import Document

# Pinecone imports
from pinecone import Pinecone, ServerlessSpec
from pinecone_text.sparse import BM25Encoder

# Environment variables
from app.core.config import settings

# Express client for database operations
from app.services.express_client import express_db_client

# Configuration constants
INPUT_FOLDER = "data/input"
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

# Research paper parsing patterns
SECTION_PATTERNS = [
    r'^(Abstract)\s*$',
    r'^(Introduction)\s*$',
    r'^(Background|Related Work|Literature Review)\s*$',
    r'^(Methodology|Methods|Method)\s*$',
    r'^(Results|Experiments|Experimental Results)\s*$',
    r'^(Discussion)\s*$',
    r'^(Conclusion|Conclusions)\s*$',
    r'^(References|Bibliography)\s*$',
    r'^(\d+\.?\s*(Abstract|Introduction|Background|Related Work|Literature Review|Methodology|Methods|Method|Results|Experiments|Experimental Results|Discussion|Conclusion|Conclusions|References|Bibliography))'
]

CITATION_PATTERNS = [
    r'\(([A-Za-z]+(?:\s+et\s+al\.)?(?:,\s*\d{4}[a-z]?)?)\)',  # (Author, 2024)
    r'\(([A-Za-z]+(?:\s+et\s+al\.)?;\s*[A-Za-z]+(?:\s+et\s+al\.)?(?:,\s*\d{4}[a-z]?)?)\)',  # Multiple citations
    r'\[([A-Za-z]+(?:\s+et\s+al\.)?(?:,\s*\d{4}[a-z]?)?)\]',  # [Author, 2024]
]

FIGURE_TABLE_PATTERNS = [
    r'(Figure\s+\d+[\.:])([^\n]*)',
    r'(Table\s+\d+[\.:])([^\n]*)',
    r'(Fig\.\s+\d+[\.:])([^\n]*)',
]

# Global state for caching
_embeddings_cache = {}
_vector_store_cache = None
_qa_chain_cache = None
_bm25_encoder_cache = None

# Helper functions
def update_chunk_metadata(chunk, section_name=None, subsection=None, citations=None, 
                         figures_tables=None, chunk_type='section_content', paper_metadata=None):
    """
    Helper function to update chunk metadata consistently.
    
    Args:
        chunk: Document chunk to update
        section_name: Name of the section
        subsection: Name of subsection
        citations: List of citations
        figures_tables: List of figures/tables
        chunk_type: Type of chunk
        paper_metadata: Paper metadata to merge
    """
    metadata_updates = {
        'section': section_name or '',
        'subsection': subsection or '',
        'citations': citations or [],
        'figures_tables': figures_tables or [],
        'chunk_type': chunk_type
    }
    chunk.metadata.update(metadata_updates)
    if paper_metadata:
        chunk.metadata.update(paper_metadata)

def prepare_document_for_reranking(doc):
    """
    Helper function to prepare documents for reranking.
    
    Args:
        doc: Document to prepare
        
    Returns:
        Document: Clean document ready for reranking
    """
    if not (hasattr(doc, 'page_content') and doc.page_content.strip()):
        return None
        
    return Document(
        page_content=doc.page_content,
        metadata={
            'text': doc.page_content,
            'source': doc.metadata.get('source', 'unknown') if hasattr(doc, 'metadata') else 'unknown',
            'page': doc.metadata.get('page', 0) if hasattr(doc, 'metadata') else 0,
            'section': doc.metadata.get('section', '') if hasattr(doc, 'metadata') else '',
            'citations': doc.metadata.get('citations', []) if hasattr(doc, 'metadata') else [],
            'paper_id': doc.metadata.get('paper_id', '') if hasattr(doc, 'metadata') else ''
        }
    )


class RAGService:
    """
    Enhanced RAG (Retrieval-Augmented Generation) service for comprehensive document management and Q&A.
    
    Features:
    - Hierarchical document chunking with research paper awareness
    - Hybrid search with dense and sparse vectors
    - Citation and section extraction
    - Advanced metadata handling
    - Index management operations
    """
    
    def __init__(self, input_folder: str = INPUT_FOLDER):
        self.input_folder = input_folder
        self.ensure_input_folder()
    
    def ensure_input_folder(self):
        """Ensure the input folder exists."""
        os.makedirs(self.input_folder, exist_ok=True)
    
    @staticmethod
    def get_api_keys():
        """Get API keys from settings."""
        return {
            "PINECONE_API_KEY": getattr(settings, 'PINECONE_API_KEY', None),
            "GROQ_API_KEY": getattr(settings, 'GROQ_API_KEY', None),
            "COHERE_API_KEY": getattr(settings, 'COHERE_API_KEY', None),
            "GEMINI_API_KEY": getattr(settings, 'GEMINI_API_KEY', None),
        }
    
    @staticmethod
    def validate_api_keys():
        """
        Validate that required API keys are present and provide helpful error messages.
        
        Returns:
            Dict with validation status and missing keys
        """
        api_keys = RAGService.get_api_keys()
        missing_keys = []
        
        # Check required keys for basic RAG functionality
        required_keys = {
            'PINECONE_API_KEY': 'Pinecone vector database',
            'COHERE_API_KEY': 'Cohere embeddings and reranking',
            'GROQ_API_KEY': 'Groq LLM for question answering'
        }
        
        for key, description in required_keys.items():
            if not api_keys.get(key) or api_keys[key].strip() == "":
                missing_keys.append(f"{key} (for {description})")
        
        return {
            'valid': len(missing_keys) == 0,
            'missing_keys': missing_keys,
            'message': f"Missing required API keys: {', '.join(missing_keys)}" if missing_keys else "All required API keys are present"
        }
    
    @lru_cache(maxsize=1)
    def get_embeddings(self):
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
        
        api_keys = self.get_api_keys()
        cohere_api_key = api_keys["COHERE_API_KEY"]
        
        if not cohere_api_key:
            raise ValueError("COHERE_API_KEY not found in environment variables.")
        
        embeddings = CohereEmbeddings(
            model=EMBEDDING_MODEL,  # embed-english-v3.0
            cohere_api_key=cohere_api_key
        )
        
        _embeddings_cache["cohere"] = embeddings
        return embeddings
    
    def validate_index_for_hybrid_search(self, index):
        """
        Validate that the current index configuration supports hybrid search with sparse vectors.
        
        Args:
            index: Pinecone index instance
        
        Returns:
            bool: True if index supports hybrid search, False otherwise
        """
        try:
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
    
    def get_bm25_encoder(self):
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
    
    def initialize_pinecone_index(self):
        """
        Initialize or connect to Pinecone index.
        
        Returns:
            Pinecone index instance
            
        Raises:
            ValueError: If PINECONE_API_KEY is not found
        """
        api_keys = self.get_api_keys()
        pinecone_api_key = api_keys["PINECONE_API_KEY"]
        
        if not pinecone_api_key:
            raise ValueError("PINECONE_API_KEY not found in environment variables.")
        
        print("Initializing Pinecone...")
        pc = Pinecone(api_key=pinecone_api_key)
        
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
    
    def get_vector_store(self):
        """
        Get or initialize vector store with caching.
        
        Returns:
            Configured vector store instance
        """
        global _vector_store_cache
        if _vector_store_cache is not None:
            return _vector_store_cache
        
        embeddings = self.get_embeddings()
        index = self.initialize_pinecone_index()
        
        # Enable BM25 encoder for hybrid search
        bm25_encoder = self.get_bm25_encoder()
        
        # Validate if index supports hybrid search
        supports_hybrid = self.validate_index_for_hybrid_search(index) if bm25_encoder else False
        
        # Use hybrid retrieval if BM25 encoder is available and index supports it
        vectorstore = PineconeVectorStore(index=index, embedding=embeddings)
        
        if bm25_encoder and supports_hybrid:
            print("Creating hybrid retriever with BM25 encoder...")
            try:
                # Note: PineconeHybridSearchRetriever expects the text content to be stored
                # under a specific key in metadata. Let's use 'text_content' to match our storage
                retriever = PineconeHybridSearchRetriever(
                    embeddings=embeddings,
                    sparse_encoder=bm25_encoder,
                    index=index,
                    top_k=TOP_K,
                    alpha=0.5,  # Balance between dense (0) and sparse (1) retrieval
                    text_key="text_content"  # Use 'text_content' as the key for text content in metadata
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
    
    @staticmethod
    def detect_paper_sections(text: str) -> List[Dict[str, Any]]:
        """
        Detect academic paper sections using regex patterns.
        
        Args:
            text: Full text of the document
            
        Returns:
            List of detected sections with their positions
        """
        sections = []
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
                
            for pattern in SECTION_PATTERNS:
                match = re.match(pattern, line, re.IGNORECASE)
                if match:
                    section_name = match.group(1) if match.groups() else line
                    sections.append({
                        'name': section_name.strip(),
                        'line_number': i,
                        'text': line
                    })
                    break
        
        return sections
    
    @staticmethod
    def extract_citations(text: str) -> List[str]:
        """
        Extract citations from text using regex patterns.
        
        Args:
            text: Text to extract citations from
            
        Returns:
            List of extracted citations
        """
        citations = []
        
        for pattern in CITATION_PATTERNS:
            matches = re.findall(pattern, text)
            citations.extend(matches)
        
        return list(set(citations))  # Remove duplicates
    
    @staticmethod
    def extract_figures_tables(text: str) -> List[Dict[str, str]]:
        """
        Extract figure and table captions from text.
        
        Args:
            text: Text to extract captions from
            
        Returns:
            List of figure/table information
        """
        figures_tables = []
        
        for pattern in FIGURE_TABLE_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if len(match) == 2:
                    figures_tables.append({
                        'type': 'figure' if 'fig' in match[0].lower() else 'table',
                        'label': match[0].strip(),
                        'caption': match[1].strip()
                    })
        
        return figures_tables
    
    @staticmethod
    def extract_paper_metadata(text: str, source_path: str) -> Dict[str, Any]:
        """
        Extract paper metadata including title, authors, venue, year.
        
        Args:
            text: Full text of the document
            source_path: Path to the source file
            
        Returns:
            Dictionary containing paper metadata
        """
        metadata = {
            'paper_id': os.path.basename(source_path).replace('.pdf', ''),
            'title': '',
            'authors': [],
            'year': None,
            'venue': ''
        }
        
        # Extract title (usually the first significant line)
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if lines:
            # Look for title in first few lines
            for line in lines[:5]:
                if len(line) > 20 and not line.startswith('arXiv:'):
                    metadata['title'] = line
                    break
        
        # Extract year from text
        year_match = re.search(r'\b(19|20)\d{2}\b', text[:2000])
        if year_match:
            metadata['year'] = int(year_match.group())
        
        # Detect arXiv papers
        if 'arxiv' in text.lower()[:1000]:
            metadata['venue'] = 'arXiv'
        
        return metadata
    
    @staticmethod
    def extract_arxiv_id(text: str, source_path: str) -> Optional[str]:
        """
        Extract arXiv ID from document text or filename.
        
        Args:
            text: Full text of the document
            source_path: Path to the source file
            
        Returns:
            arXiv ID if found, None otherwise
        """
        # Common arXiv ID patterns
        arxiv_patterns = [
            r'arXiv:([0-9]{4}\.[0-9]{4,5}v?[0-9]*)',  # New format: arXiv:2301.12345
            r'arXiv:([a-z-]+(?:\.[A-Z]{2})?/[0-9]{7}v?[0-9]*)',  # Old format: arXiv:cs.AI/0123456
            r'(?:^|\s)([0-9]{4}\.[0-9]{4,5}v?[0-9]*)(?:$|\s)',  # Just the ID: 2301.12345
            r'(?:^|\s)([a-z-]+(?:\.[A-Z]{2})?/[0-9]{7}v?[0-9]*)(?:$|\s)'  # Just the old ID: cs.AI/0123456
        ]
        
        # First check the text (first 3000 characters for performance)
        search_text = text[:3000]
        for pattern in arxiv_patterns:
            match = re.search(pattern, search_text, re.IGNORECASE)
            if match:
                return match.group(1)
        
        # Check filename
        filename = os.path.basename(source_path)
        for pattern in arxiv_patterns:
            match = re.search(pattern, filename, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    @staticmethod
    def extract_abstract_from_text(text: str) -> str:
        """
        Extract abstract from paper text.
        
        Args:
            text: Full text of the document
            
        Returns:
            Abstract text if found, empty string otherwise
        """
        # Look for abstract section
        abstract_patterns = [
            r'\bAbstract[\s\n]+([^\n]+(?:\n[^\n]+)*?)(?:\n\s*\n|\n\s*(?:1\.|Introduction|Keywords))',
            r'\bABSTRACT[\s\n]+([^\n]+(?:\n[^\n]+)*?)(?:\n\s*\n|\n\s*(?:1\.|INTRODUCTION|KEYWORDS))',
            r'\bAbstract[-\s]*[:.][\s\n]+([^\n]+(?:\n[^\n]+)*?)(?:\n\s*\n|\n\s*(?:1\.|Introduction|Keywords))'
        ]
        
        for pattern in abstract_patterns:
            match = re.search(pattern, text[:5000], re.IGNORECASE | re.DOTALL)
            if match:
                abstract = match.group(1).strip()
                # Clean up the abstract (remove extra whitespace, line breaks)
                abstract = re.sub(r'\s+', ' ', abstract)
                return abstract[:500]  # Limit length
        
        return ""
    
    @staticmethod
    def extract_arxiv_categories(text: str) -> List[str]:
        """
        Extract arXiv categories from paper text.
        
        Args:
            text: Full text of the document
            
        Returns:
            List of arXiv categories
        """
        categories = []
        
        # Common arXiv category patterns
        category_patterns = [
            r'Subject[\s-]*[Cc]lasses?[:\s]+([a-z-]+(?:\.[A-Z]{2})?(?:,\s*[a-z-]+(?:\.[A-Z]{2})?)*)',
            r'Categories?[:\s]+([a-z-]+(?:\.[A-Z]{2})?(?:,\s*[a-z-]+(?:\.[A-Z]{2})?)*)',
            r'MSC[:\s]*[0-9]+[A-Z][0-9]+',  # MSC classifications
        ]
        
        search_text = text[:2000]  # Search in first part of document
        
        for pattern in category_patterns:
            matches = re.findall(pattern, search_text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, str):
                    # Split by comma and clean
                    cats = [cat.strip() for cat in match.split(',')]
                    categories.extend([cat for cat in cats if cat and len(cat) > 2])
        
        # Look for common CS/AI related keywords and map to categories
        keyword_to_category = {
            'artificial intelligence': 'cs.AI',
            'machine learning': 'cs.LG',
            'natural language processing': 'cs.CL',
            'computer vision': 'cs.CV',
            'deep learning': 'cs.LG',
            'neural network': 'cs.LG',
            'physics': 'physics'
        }
        
        text_lower = search_text.lower()
        for keyword, category in keyword_to_category.items():
            if keyword in text_lower and category not in categories:
                categories.append(category)
        
        return list(set(categories))  # Remove duplicates
    
    def hierarchical_chunk_documents(self, documents, paper_metadata=None):
        """
        Split documents using hierarchical chunking strategy with section awareness.
        
        Args:
            documents: List of documents to split
            paper_metadata: Optional paper metadata
            
        Returns:
            List of enhanced document chunks
        """
        if not documents:
            print("No documents to split.")
            return []
        
        enhanced_chunks = []
        
        for doc in documents:
            text = doc.page_content
            
            # Detect sections
            sections = self.detect_paper_sections(text)
            citations = self.extract_citations(text)
            figures_tables = self.extract_figures_tables(text)
            
            # If no sections detected, fall back to standard chunking
            if not sections:
                print(f"No sections detected in document, using standard chunking")
                text_splitter = RecursiveCharacterTextSplitter(
                    chunk_size=CHUNK_SIZE,
                    chunk_overlap=CHUNK_OVERLAP
                )
                chunks = text_splitter.split_documents([doc])
                for chunk in chunks:
                    # Add basic research metadata using helper function
                    update_chunk_metadata(chunk, '', '', citations, figures_tables, 
                                         'content', paper_metadata)
                enhanced_chunks.extend(chunks)
                continue
            
            # Create section-based chunks
            text_lines = text.split('\n')
            current_section = None
            current_subsection = None
            
            for i, section in enumerate(sections):
                # Determine section boundaries
                start_line = section['line_number']
                end_line = sections[i + 1]['line_number'] if i + 1 < len(sections) else len(text_lines)
                
                section_text = '\n'.join(text_lines[start_line:end_line])
                section_name = section['name']
                
                # Further split large sections
                if len(section_text) > 1200:
                    text_splitter = RecursiveCharacterTextSplitter(
                        chunk_size=800,
                        chunk_overlap=150
                    )
                    temp_doc = type(doc)(page_content=section_text, metadata=doc.metadata.copy())
                    section_chunks = text_splitter.split_documents([temp_doc])
                    
                    for chunk in section_chunks:
                        # Prepend section context
                        chunk.page_content = f"[Section: {section_name}]\n{chunk.page_content}"
                        # Enhanced metadata using helper function
                        update_chunk_metadata(chunk, section_name, current_subsection, 
                                             citations, figures_tables, 'section_content', paper_metadata)
                        
                    enhanced_chunks.extend(section_chunks)
                else:
                    # Small section, keep as single chunk
                    enhanced_doc = type(doc)(
                        page_content=f"[Section: {section_name}]\n{section_text}",
                        metadata=doc.metadata.copy()
                    )
                    # Enhanced metadata using helper function
                    update_chunk_metadata(enhanced_doc, section_name, current_subsection, 
                                         citations, figures_tables, 'section_content', paper_metadata)
                    
                    enhanced_chunks.append(enhanced_doc)
            
            # Add figure/table chunks
            for fig_table in figures_tables:
                fig_doc = type(doc)(
                    page_content=f"[{fig_table['type'].title()}: {fig_table['label']}] {fig_table['caption']}",
                    metadata=doc.metadata.copy()
                )
                # Enhanced metadata using helper function  
                update_chunk_metadata(fig_doc, 'Figures/Tables', '', citations, 
                                     figures_tables, fig_table['type'], paper_metadata)
                fig_doc.metadata['figure_label'] = fig_table['label']
                
                enhanced_chunks.append(fig_doc)
        
        print(f"Enhanced chunking created {len(enhanced_chunks)} chunks with section awareness.")
        return enhanced_chunks
    
    @staticmethod
    def clean_metadata_for_pinecone(metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Clean metadata to ensure compatibility with Pinecone requirements.
        Pinecone only accepts strings, numbers, booleans, or lists of strings.
        
        Args:
            metadata: Original metadata dictionary
            
        Returns:
            Cleaned metadata dictionary compatible with Pinecone
        """
        cleaned = {}
        for key, value in metadata.items():
            if value is None:
                # Skip null values entirely
                continue
            elif isinstance(value, (str, int, float, bool)):
                cleaned[str(key)] = value
            elif isinstance(value, list):
                # Convert list items to strings and filter out None values
                string_list = [str(item) for item in value if item is not None]
                if string_list:  # Only add if list is not empty
                    cleaned[str(key)] = string_list
            elif isinstance(value, dict):
                # Convert dict to string representation
                cleaned[str(key)] = str(value)
            else:
                # Convert other types to string
                cleaned[str(key)] = str(value)
        
        return cleaned
    
    @staticmethod
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
    
    def get_qa_chain(self):
        """
        Get or initialize Q&A chain with research paper awareness and citation attribution.
        
        Returns:
            Configured RAG chain for question answering
            
        Raises:
            ValueError: If required API keys are not found
        """
        global _qa_chain_cache
        if _qa_chain_cache is not None:
            return _qa_chain_cache
        
        api_keys = self.get_api_keys()
        groq_api_key = api_keys["GROQ_API_KEY"]
        cohere_api_key = api_keys["COHERE_API_KEY"]
        
        if not groq_api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables.")
        
        llm = ChatGroq(
            model=LLM_MODEL,
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS
        )
        
        if not cohere_api_key:
            raise ValueError("COHERE_API_KEY not found in environment variables.")
        
        reranker = CohereRerank(model=RERANK_MODEL)
        
        vector_store = self.get_vector_store()
        retriever = vector_store["retriever"]

        # Enhanced prompt template with section and citation awareness
        custom_prompt_template = """You are an enterprise-grade research paper RAG agent designed to answer questions based on academic paper content.

Use the following pieces of context from research papers to answer the question at the end. Pay special attention to:
- Section information (e.g., Abstract, Methodology, Results, etc.)
- Citations and references mentioned in the text
- Figure and table captions when relevant

When answering:
1. If the information comes from a specific section, mention it (e.g., "According to the Methodology section...")
2. Include relevant citations mentioned in the context
3. Reference figures or tables when they support your answer
4. If you don't know the answer, just say that you don't know, don't try to make up an answer

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
    
    async def upload_document(self, file: UploadFile, upsert_to_index: bool = True, paper_id: Optional[int] = None) -> Dict[str, Any]:
        """Upload and process a PDF document."""
        try:
            # Save uploaded file
            upload_dir = Path(self.input_folder)
            upload_dir.mkdir(parents=True, exist_ok=True)

            dest = upload_dir / file.filename
            with dest.open("wb") as f:
                f.write(await file.read())

            # Load and process the document
            loader = PyPDFLoader(str(dest))
            pages = loader.load()
            
            # Extract paper metadata from full text
            full_text = "\n".join([page.page_content for page in pages])
            paper_metadata = self.extract_paper_metadata(full_text, str(dest))
            
            # Check if this is an arXiv paper and store metadata
            arxiv_stored = False
            if paper_metadata.get('venue') == 'arXiv' or 'arxiv' in full_text.lower()[:2000]:
                try:
                    # Extract arXiv ID from text or filename
                    arxiv_id = self.extract_arxiv_id(full_text, str(dest))
                    
                    if arxiv_id or paper_metadata.get('title'):
                        # Prepare arXiv metadata for storage
                        arxiv_data = {
                            'title': paper_metadata.get('title', file.filename.replace('.pdf', '')),
                            'authors': paper_metadata.get('authors', []),
                            'abstract': self.extract_abstract_from_text(full_text),
                            'arxiv_id': arxiv_id,
                            'categories': self.extract_arxiv_categories(full_text),
                            'published_at': None,  # Could be extracted from arXiv text
                            'source_url': f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else None,
                            'pdf_url': f"https://arxiv.org/pdf/{arxiv_id}.pdf" if arxiv_id else None,
                            'comment': f"Processed from file: {file.filename}"
                        }
                        
                        # Store arXiv metadata via Express client
                        if paper_id:
                            # Update existing paper with arXiv metadata
                            await express_db_client.update_paper_with_arxiv_metadata(paper_id, arxiv_data)
                        else:
                            # Create new arXiv paper entry
                            await express_db_client.create_arxiv_paper(arxiv_data)
                        
                        arxiv_stored = True
                        print(f"✅ Stored arXiv metadata for: {paper_metadata.get('title', file.filename)}")
                        
                except Exception as arxiv_error:
                    print(f"⚠️ Failed to store arXiv metadata: {arxiv_error}")
                    # Don't fail the entire process if arXiv storage fails
            
            # Add paper metadata to pages
            for page in pages:
                page.metadata.update(paper_metadata)
            
            # Use enhanced hierarchical chunking
            chunks = self.hierarchical_chunk_documents(pages, paper_metadata)

            response = {
                "message": f"{file.filename} processed successfully with research paper awareness",
                "filename": file.filename,
                "path": str(dest),
                "pages": len(pages),
                "chunks": len(chunks),
                "upserted": False,
                "chunks_upserted": 0,
                "paper_metadata": paper_metadata,
                "arxiv_stored": arxiv_stored
            }

            # Optionally upsert to vector store
            if upsert_to_index and chunks:
                try:
                    chunks_added = self.upsert_documents_to_index(chunks)
                    response.update({
                        "upserted": True,
                        "chunks_upserted": chunks_added,
                    })
                    
                except Exception as e:
                    response["upsert_error"] = str(e)

            return self.clean_metadata_for_json(response)

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")
    
    def upsert_documents_to_index(self, chunks):
        """
        Upsert document chunks to the vector index.
        
        Args:
            chunks: List of document chunks to upsert
            
        Returns:
            Number of chunks upserted
        """
        if not chunks:
            return 0
        
        vector_store = self.get_vector_store()
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
                    bm25_encoder.fit(all_texts)
                    bm25_encoder._fitted = True
                    print("BM25 encoder fitted successfully with current documents.")
                except Exception as e:
                    print(f"Warning: Failed to fit BM25 encoder: {e}")
                    print("Continuing with dense vectors only...")
        
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
                metadata['text_content'] = chunk.page_content
                metadata['text'] = chunk.page_content
                
                # Clean metadata for Pinecone compatibility
                cleaned_metadata = self.clean_metadata_for_pinecone(metadata)
                metadata_list.append(cleaned_metadata)
            
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
                
                vectors_to_upsert.append(vector_data)
            
            # Upsert to Pinecone with error handling
            try:
                index.upsert(vectors=vectors_to_upsert)
                upserted_count += len(batch_chunks)
            except Exception as e:
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
    
    async def ask_question(self, request: QuestionRequest) -> QuestionResponse:
        """Ask a question using the RAG system."""
        try:
            print(f"Processing research paper query: '{request.question}'")
            
            qa_chain_data = self.get_qa_chain()
            qa_chain = qa_chain_data["chain"]
            reranker = qa_chain_data["reranker"]
            
            # Get initial result
            result = qa_chain.invoke({"input": request.question})
            
            # Extract context documents
            reranked_docs = []
            if isinstance(result, dict):
                for context_key in ['context', 'source_documents', 'documents', 'retrieved_documents']:
                    if context_key in result:
                        reranked_docs = result[context_key]
                        print(f"Found context under key: {context_key}")
                        break
            
            # Apply reranking
            if reranked_docs and reranker:
                try:
                    valid_documents = []
                    for doc in reranked_docs:
                        clean_doc = prepare_document_for_reranking(doc)
                        if clean_doc:
                            valid_documents.append(clean_doc)
                    
                    if valid_documents:
                        reranked_docs = reranker.compress_documents(
                            documents=valid_documents,
                            query=request.question
                        )
                        print(f"Reranking successful: {len(reranked_docs)} documents returned")
                        
                except Exception as e:
                    print(f"Reranking failed with error: {e}")
            
            # Format sources with enhanced research paper metadata
            sources = []
            for i, doc in enumerate(reranked_docs[:5]):
                source_info = {
                    "rank": i + 1,
                    "content": doc.page_content[:500] + "..." if len(doc.page_content) > 500 else doc.page_content,
                    "metadata": self.clean_metadata_for_json(doc.metadata),
                    "relevance_score": doc.metadata.get('relevance_score', None)
                }
                
                # Add research paper specific information
                if hasattr(doc, 'metadata'):
                    for key in ['section', 'subsection', 'citations', 'paper_id', 'title', 'chunk_type']:
                        if doc.metadata.get(key):
                            source_info[key] = doc.metadata[key]
                
                sources.append(source_info)
            
            # Collect unique sections and citations from all sources
            all_sections = set()
            all_citations = set()
            all_papers = set()
            
            for doc in reranked_docs:
                if hasattr(doc, 'metadata'):
                    if doc.metadata.get('section'):
                        all_sections.add(doc.metadata['section'])
                    if doc.metadata.get('citations'):
                        all_citations.update(doc.metadata['citations'])
                    if doc.metadata.get('paper_id'):
                        all_papers.add(doc.metadata['paper_id'])
            
            return QuestionResponse(
                question=request.question,
                answer=result.get('answer', 'No answer generated'),
                sources=sources,
                metadata={
                    "total_sources": len(reranked_docs),
                    "model_used": LLM_MODEL,
                    "reranked": reranker is not None,
                    "sections_referenced": list(all_sections),
                    "citations_found": list(all_citations),
                    "papers_referenced": list(all_papers),
                    "research_paper_aware": True
                }
            )
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")
    
    async def ask_question_session_scoped(self, request: QuestionRequest, session_files: List[str]) -> QuestionResponse:
        """Ask a question using session-scoped RAG that only searches specific documents."""
        try:
            print(f"Processing session-scoped research paper query: '{request.question}'")
            print(f"Session files to search: {session_files}")
            
            qa_chain_data = self.get_qa_chain()
            qa_chain = qa_chain_data["chain"]
            reranker = qa_chain_data["reranker"]
            
            # Get vector store components for manual filtering
            vector_store = self.get_vector_store()
            index = vector_store["index"]
            embeddings = vector_store["embeddings"]
            
            # Generate query embedding
            query_embedding = embeddings.embed_query(request.question)
            
            # Create metadata filter for session files
            filter_conditions = []
            for file_name in session_files:
                filter_conditions.append({"source": {"$eq": f"data/input/{file_name}"}})
            
            # If no filter conditions, return empty result
            if not filter_conditions:
                print("No session files to search - returning empty result")
                return QuestionResponse(
                    question=request.question,
                    answer="I couldn't find any processed papers in this session. Please add and process some papers first.",
                    sources=[],
                    metadata={
                        "total_sources": 0,
                        "model_used": LLM_MODEL,
                        "session_scoped": True,
                        "session_files_searched": session_files,
                        "research_paper_aware": True
                    }
                )
            
            metadata_filter = {"$or": filter_conditions}
            print(f"Session-scoped RAG query for {len(session_files)} files")
            
            # Query Pinecone with filtering
            try:
                query_result = index.query(
                    vector=query_embedding,
                    top_k=10,  # Get top 10 relevant chunks
                    include_metadata=True,
                    filter=metadata_filter
                )
            except Exception as query_error:
                print(f"Error querying Pinecone with filter: {query_error}")
                # Fallback: try without filter if filter fails
                try:
                    query_result = index.query(
                        vector=query_embedding,
                        top_k=10,
                        include_metadata=True
                    )
                    print("Fallback query without filter succeeded")
                except Exception as fallback_error:
                    raise HTTPException(status_code=500, detail=f"Failed to query vector store: {str(fallback_error)}")
            
            print(f"Found {len(query_result.matches)} session-scoped matches")
            
            if not query_result.matches:
                return QuestionResponse(
                    question=request.question,
                    answer="I couldn't find any relevant information in the papers from this session. Please make sure the papers are properly processed for RAG.",
                    sources=[],
                    metadata={
                        "total_sources": 0,
                        "model_used": LLM_MODEL,
                        "session_scoped": True,
                        "session_files_searched": session_files,
                        "research_paper_aware": True
                    }
                )
            
            # Convert Pinecone matches to documents
            retrieved_docs = []
            for match in query_result.matches:
                doc_content = match.metadata.get('text', match.metadata.get('text_content', ''))
                if doc_content:
                    from langchain.schema import Document
                    doc = Document(
                        page_content=doc_content,
                        metadata=match.metadata
                    )
                    # Store relevance score in metadata instead of as attribute
                    doc.metadata['relevance_score'] = match.score
                    retrieved_docs.append(doc)
            
            # Apply reranking if available
            reranked_docs = retrieved_docs
            if reranked_docs and reranker:
                try:
                    valid_documents = []
                    for doc in retrieved_docs:
                        clean_doc = prepare_document_for_reranking(doc)
                        if clean_doc:
                            valid_documents.append(clean_doc)
                    
                    if valid_documents:
                        reranked_docs = reranker.compress_documents(
                            documents=valid_documents,
                            query=request.question
                        )
                        print(f"Session-scoped reranking successful: {len(reranked_docs)} documents returned")
                        
                except Exception as e:
                    print(f"Session-scoped reranking failed with error: {e}")
            
            # Generate answer using the context
            context = "\n\n".join([doc.page_content for doc in reranked_docs[:5]])
            
            # Use the LLM to generate an answer
            try:
                api_keys = self.get_api_keys()
                from langchain_groq import ChatGroq
                llm = ChatGroq(
                    model=LLM_MODEL,
                    temperature=TEMPERATURE,
                    max_tokens=MAX_TOKENS,
                    api_key=api_keys["GROQ_API_KEY"]
                )
                
                prompt = f"""You are an enterprise-grade research paper RAG agent designed to answer questions based on academic paper content.

Use the following pieces of context from research papers to answer the question at the end. Pay special attention to:
- Section information (e.g., Abstract, Methodology, Results, etc.)
- Citations and references mentioned in the text
- Figure and table captions when relevant

When answering:
1. If the information comes from a specific section, mention it (e.g., "According to the Methodology section...")
2. Include relevant citations mentioned in the context
3. Reference figures or tables when they support your answer
4. If you don't know the answer, just say that you don't know, don't try to make up an answer

Context:
{context}

Question: {request.question}
Answer:"""

                response = llm.invoke(prompt)
                answer = response.content if hasattr(response, 'content') else str(response)
                
            except Exception as llm_error:
                print(f"Error generating LLM response: {llm_error}")
                answer = f"I found relevant information in the session papers, but encountered an error generating a response. Please try rephrasing your question. Error: {str(llm_error)}"
            
            # Format sources with enhanced research paper metadata
            sources = []
            all_sections = set()
            all_citations = set()
            all_papers = set()
            
            for i, doc in enumerate(reranked_docs[:5]):
                source_info = {
                    "rank": i + 1,
                    "content": doc.page_content[:500] + "..." if len(doc.page_content) > 500 else doc.page_content,
                    "metadata": self.clean_metadata_for_json(doc.metadata),
                    "relevance_score": doc.metadata.get('relevance_score', None)
                }
                
                # Enhanced source attribution for research papers
                if 'source' in doc.metadata:
                    source_info["source"] = os.path.basename(doc.metadata['source'])
                if 'section' in doc.metadata:
                    source_info["section"] = doc.metadata['section']
                    all_sections.add(doc.metadata['section'])
                if 'page' in doc.metadata:
                    source_info["page"] = doc.metadata['page']
                if 'paper_id' in doc.metadata:
                    source_info["paper_id"] = doc.metadata['paper_id']
                    all_papers.add(doc.metadata['paper_id'])
                
                sources.append(source_info)
                
                # Collect metadata for overall response
                if doc.metadata.get('citations'):
                    all_citations.update(doc.metadata['citations'])
                if doc.metadata.get('paper_id'):
                    all_papers.add(doc.metadata['paper_id'])
            
            return QuestionResponse(
                question=request.question,
                answer=answer,
                sources=sources,
                metadata={
                    "total_sources": len(reranked_docs),
                    "model_used": LLM_MODEL,
                    "reranked": reranker is not None,
                    "sections_referenced": list(all_sections),
                    "citations_found": list(all_citations),
                    "papers_referenced": list(all_papers),
                    "session_scoped": True,
                    "session_files_searched": session_files,
                    "research_paper_aware": True
                }
            )
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Error processing session-scoped question: {str(e)}")

    def get_index_stats(self):
        """Get current vector index statistics."""
        vector_store = self.get_vector_store()
        index = vector_store["index"]
        stats = index.describe_index_stats()
        
        try:
            result = {
                "total_vector_count": getattr(stats, 'total_vector_count', 0),
                "dimension": getattr(stats, 'dimension', 0),
                "index_fullness": getattr(stats, 'index_fullness', 0.0)
            }
            
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
            return {
                "total_vector_count": 0,
                "dimension": PINECONE_DIMENSION,
                "index_fullness": 0.0,
                "namespaces": {},
                "error": f"Stats serialization failed: {str(e)}"
            }
    
    def remove_document_chunks(self, document_name: str) -> int:
        """
        Remove all chunks of a specific document from the vector index.
        
        Args:
            document_name: Name of the document to remove
            
        Returns:
            Number of chunks removed
        """
        vector_store = self.get_vector_store()
        index = vector_store["index"]
        
        # First, get all vectors to find matching documents
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