import argparse
from lib.db_manager import Qdrant_manager
from lib.pdf_loader import load_pdf,split_Document

def main():
    qdrant_manager = Qdrant_manager()
    file_path = 'Docker.pdf'
    collection_name = "gemini_embeddings"
    
    # Check if the database should be cleared (using the --clear flag).
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Reset the database.")
    args = parser.parse_args()
    if args.reset:
        print("✨ Clearing Database")
        qdrant_manager.clear_database(collection_name)

    # Create (or update) the data store.
    documents = load_pdf(file_path)
    chunks = split_Document(documents)
    qdrant_manager.add_to_qdrant(chunks, collection_name)
    
    usr_in = input("Do you want to clear the database(y/n): ")
    if usr_in.lower() == 'y':
        qdrant_manager.clear_database(collection_name)
    # add_to_chroma(chunks)

if __name__ == "__main__":
    main()