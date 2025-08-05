from langchain_core.documents import Document
#from langchain_chroma import Chroma
from langchain_qdrant import QdrantVectorStore as Qdrant
import os
import shutil
from dotenv import load_dotenv
from lib.pdf_loader import get_embedding_function
from qdrant_client.models import VectorParams, Distance
from qdrant_client import QdrantClient

load_dotenv()
'''CHROMA_PATH = "chroma"
DATA_PATH = "data"'''

class Qdrant_manager:
    def __init__(self):
        self.qdrant_api_key = os.getenv("QDRANT_API_KEY")
        if not self.qdrant_api_key:
            raise ValueError("QDRANT_API_KEY is not set in the environment variables.")
        self.qdrant_client = QdrantClient(
            url="https://d5a5f5ce-ffe6-4b64-b58e-361b6ec60509.us-west-2-0.aws.cloud.qdrant.io",
            api_key=self.qdrant_api_key,
        )



    def add_to_qdrant(self, chunks: list[Document], collection_name="gemini_embeddings", batch_size=10):
        try:
            collection_info = self.qdrant_client.get_collection(collection_name)
            print(f"Collection '{collection_name}' already exists.")
        except Exception:
            self.qdrant_client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=768, distance=Distance.COSINE)
            )
            print(f"Collection '{collection_name}' created successfully.")
        chunks_with_ids = self.calculate_chunk_ids(chunks)
        embeddings = get_embedding_function()
        vector_store = Qdrant(
            client=self.qdrant_client,
            collection_name=collection_name,
            embedding=embeddings,
        )

        # Batch upload with error handling
        print(f"Starting upload of {len(chunks_with_ids)} documents in batches of {batch_size}...")
        
        for i in range(0, len(chunks_with_ids), batch_size):
            batch = chunks_with_ids[i:i+batch_size]
            try:
                vector_store.add_documents(batch)
                print(f"✅ Added batch {i//batch_size + 1} ({len(batch)} docs) to Qdrant.")
            except Exception as e:
                print(f"❌ Failed to add batch {i//batch_size + 1}: {e}")
                # Try with smaller batch size
                if len(batch) > 1:
                    print(f"Retrying with individual documents...")
                    for j, doc in enumerate(batch):
                        try:
                            vector_store.add_documents([doc])
                            print(f"   ✅ Added document {i + j + 1}")
                        except Exception as doc_error:
                            print(f"   ❌ Failed to add document {i + j + 1}: {doc_error}")

        print(f"Completed upload process for Qdrant collection '{collection_name}'.")

    '''def add_to_chroma(chunks: list[Document]):
        # Load the existing database.
        db = Chroma(
            persist_directory=CHROMA_PATH, embedding_function=get_embedding_function()
        )

        # Calculate Page IDs.
        chunks_with_ids = calculate_chunk_ids(chunks)

        # Add or Update the documents.
        existing_items = db.get(include=[])  # IDs are always included by default
        existing_ids = set(existing_items["ids"])
        print(f"Number of existing documents in DB: {len(existing_ids)}")

        # Only add documents that don't exist in the DB.
        new_chunks = []
        for chunk in chunks_with_ids:
            if chunk.metadata["id"] not in existing_ids:
                new_chunks.append(chunk)

        if len(new_chunks):
            print(f"👉 Adding new documents: {len(new_chunks)}")
            new_chunk_ids = [chunk.metadata["id"] for chunk in new_chunks]
            db.add_documents(new_chunks, ids=new_chunk_ids)
        else:
            print("✅ No new documents to add")'''

    def calculate_chunk_ids(self,chunks):

        # This will create IDs like "data/monopoly.pdf:6:2"
        # Page Source : Page Number : Chunk Index

        last_page_id = None
        current_chunk_index = 0

        for chunk in chunks:
            source = chunk.metadata.get("source")
            page = chunk.metadata.get("page")
            current_page_id = f"{source}:{page}"

            # If the page ID is the same as the last one, increment the index.
            if current_page_id == last_page_id:
                current_chunk_index += 1
            else:
                current_chunk_index = 0

            # Calculate the chunk ID.
            chunk_id = f"{current_page_id}:{current_chunk_index}"
            last_page_id = current_page_id

            # Add it to the page meta-data.
            chunk.metadata["id"] = chunk_id

        return chunks


    def clear_database(self, collection_name="gemini_embeddings"):
        try:
            self.qdrant_client.delete_collection(collection_name=collection_name)
            print(f"✨ Successfully deleted collection '{collection_name}'")
        except Exception as e:
            print(f"❌ Failed to delete collection '{collection_name}': {e}")
