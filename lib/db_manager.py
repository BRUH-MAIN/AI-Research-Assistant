from langchain_core.documents import Document
#from langchain_chroma import Chroma
from langchain.vectorstores import Qdrant
import os
import shutil
from dotenv import load_dotenv
from lib.pdf_loader import get_embedding_function
from qdrant_client.models import VectorParams, Distance
from qdrant_client import QdrantClient

load_dotenv()
'''CHROMA_PATH = "chroma"
DATA_PATH = "data'''

def add_to_qdrant(chunks: list[Document]):
    qdrant_api_key = os.getenv("QDRANT_API_KEY")
    if not qdrant_api_key:
        raise ValueError("QDRANT_API_KEY is not set in the environment variables.")
    qdrant_client = QdrantClient(
        url="https://d5a5f5ce-ffe6-4b64-b58e-361b6ec60509.us-west-2-0.aws.cloud.qdrant.io",
        api_key=qdrant_api_key,
    )
    collection_name = "gemini_embeddings"
    try:
        collection_info = qdrant_client.get_collection(collection_name)
        print(f"Collection '{collection_name}' already exists.")
    except Exception:
        qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=768, distance=Distance.COSINE)
        )
        print(f"Collection '{collection_name}' created successfully.")
    chunks_with_ids = calculate_chunk_ids(chunks)
    embeddings = get_embedding_function()
    vector_store = Qdrant(
        client=qdrant_client,
        collection_name=collection_name,
        embeddings=embeddings,
    )
    vector_store.add_documents(chunks_with_ids)
    print(f"Added {len(chunks_with_ids)} documents to Qdrant.")

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

def calculate_chunk_ids(chunks):

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


'''def clear_database():
    if os.path.exists(CHROMA_PATH):
        shutil.rmtree(CHROMA_PATH)'''


