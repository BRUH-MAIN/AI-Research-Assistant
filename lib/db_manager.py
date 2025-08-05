from langchain_core.documents import Document
import os
from dotenv import load_dotenv
from lib.pdf_loader import get_embedding_function
from qdrant_client.models import VectorParams, Distance, PointStruct
from qdrant_client import QdrantClient
import uuid

load_dotenv()

class Qdrant_manager:
    def __init__(self):
        self.qdrant_api_key = os.getenv("QDRANT_API_KEY")
        if not self.qdrant_api_key:
            raise ValueError("QDRANT_API_KEY is not set in the environment variables.")
        
        self.qdrant_client = QdrantClient(
            url="https://d5a5f5ce-ffe6-4b64-b58e-361b6ec60509.us-west-2-0.aws.cloud.qdrant.io",
            api_key=self.qdrant_api_key,
        )
        self.embeddings = get_embedding_function()

    def add_to_qdrant(self, chunks: list[Document], collection_name="gemini_embeddings"):
        # Create collection if it doesn't exist
        try:
            self.qdrant_client.get_collection(collection_name)
            print(f"Collection '{collection_name}' already exists.")
        except Exception:
            self.qdrant_client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=768, distance=Distance.COSINE)
            )
            print(f"Collection '{collection_name}' created successfully.")

        # Prepare points for bulk upload
        print(f"Preparing {len(chunks)} documents for upload...")
        
        # Extract texts and generate embeddings in batch
        texts = [chunk.page_content for chunk in chunks]
        vectors = self.embeddings.embed_documents(texts)
        
        # Create points with metadata
        points = []
        for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
            point_id = str(uuid.uuid4())  # Use UUID for unique IDs
            
            # Prepare metadata
            metadata = dict(chunk.metadata)
            metadata['content'] = chunk.page_content
            
            points.append(PointStruct(
                id=point_id,
                vector=vector,
                payload=metadata
            ))

        # Bulk upload all points at once
        print(f"Uploading {len(points)} points to Qdrant...")
        self.qdrant_client.upsert(
            collection_name=collection_name,
            points=points
        )
        print(f"✅ Successfully uploaded all documents to collection '{collection_name}'")

    def clear_database(self, collection_name="gemini_embeddings"):
        try:
            self.qdrant_client.delete_collection(collection_name=collection_name)
            print(f"✨ Successfully deleted collection '{collection_name}'")
        except Exception as e:
            print(f"❌ Failed to delete collection '{collection_name}': {e}")

    def search_similar(self, query: str, collection_name="gemini_embeddings", limit=5):
        """Search for similar documents"""
        query_vector = self.embeddings.embed_query(query)
        
        results = self.qdrant_client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=limit
        )
        
        return [(result.payload, result.score) for result in results]