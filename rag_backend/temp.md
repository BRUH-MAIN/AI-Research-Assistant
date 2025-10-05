---

# 📘 Instructions: Extending RAG Backend for Research Papers

This document extends the existing **FastAPI-based RAG backend** to make it **research-paper–aware**.
The modifications ensure that uploaded academic PDFs (e.g., arXiv papers) are indexed and retrieved with awareness of **sections, citations, and figures**, improving Q&A accuracy.

---

## 1. Parsing Enhancements

### a. Section & Subsection Detection

* Extend current **PyPDFLoader pipeline** with regex-based header parsing:

  * Abstract, Introduction, Background/Related Work, Methodology, Results/Experiments, Discussion, Conclusion, References.
* Store detected sections/subsections in metadata:

  ```json
  {
    "section": "Methodology",
    "subsection": "Layer Importance in Knowledge Tasks"
  }
  ```

### b. Citation Extraction

* Extract inline citations `(Author, Year)` using regex.
* Map to full reference entry (from References section).
* Store in metadata as `citations` and `references`.

### c. Figure/Table Captions

* Detect figure/table captions (`"Figure X:"`, `"Table Y:"`).
* Store captions as standalone chunks with `type="figure"` or `type="table"`.

---

## 2. Chunking Strategy

Replace current `RecursiveCharacterTextSplitter` (1000 chars, 200 overlap) with **hierarchical chunking**:

1. **Primary Split** → by section/subsection boundaries.
2. **Secondary Split** → within each section, chunk into ~800–1000 tokens with 150 overlap.
3. **Preserve Section Context** → prepend chunk with section/subsection label during embedding.

**Example stored text:**

```
[Section: Methodology > Retrieval Tasks]  
We evaluate LLaMA-3.1-8B on the KV Retrieval task…
```

---

## 3. Metadata Schema Update

Modify Pinecone upserts to include enriched metadata:

```json
{
  "id": "paper1_page_3_chunk_2",
  "text": "chunk text…",
  "metadata": {
    "paper_id": "paper1",
    "title": "Demystifying the Roles of LLM Layers in Retrieval",
    "authors": ["Xinyuan Song", "Keyu Wang", "Pengxiang Li", "Lu Yin", "Shiwei Liu"],
    "year": 2025,
    "venue": "arXiv",
    "section": "Results",
    "subsection": "Math Problem Solving",
    "citations": ["(Cobbe et al., 2021a)", "(Srivastava et al., 2022)"],
    "references": ["Full reference string from References section"],
    "figures": ["Figure 4: Layer pruning results of LLaMA-3.1-8B on the MathQA dataset"]
  }
}
```

---

## 4. Retrieval Enhancements

### a. Hybrid Search (Dense + Sparse + Section Bias)

* Keep current **PineconeHybridSearchRetriever** (alpha=0.5).
* Add **section-aware scoring adjustment**:

  * Abstract & Conclusion → boost for *summary/contribution queries*.
  * Methodology → boost for *how/experimental setup queries*.
  * Results/Discussion → boost for *findings/outcomes queries*.

### b. Citation-Aware Retrieval

* If query contains `"according to X"` or citation pattern, bias towards chunks containing **citations/references metadata**.

### c. Re-Ranking

* Keep Cohere Rerank → add `section` as a feature in reranking (e.g., weight Abstract higher if query asks for summary).

---

## 5. Answer Generation Workflow

Modify current QA chain to include **section + citation attribution**:

* Answer template includes:

  * Section/Subsection label:
    *“According to the Methodology → Retrieval Tasks section…”*
  * Full reference if citation is included:
    *“(Cobbe et al., 2021a; Srivastava et al., 2022)”*.
* Figures/Tables: If chunk is a figure/table, add:
  *“As shown in Figure 4 (caption: …)”*.

---

## 6. API Updates

### `/documents/upload`

* After chunking, add **section/citation/figure enrichment** before embedding.

### `/qa/ask`

* Extend query pipeline:

  1. Detect query intent (summary, methods, results, citation lookup).
  2. Apply section bias in retrieval.
  3. Rerank with section-aware features.
  4. Generate answer with attribution.

---

## 7. Error Handling & Resilience (Extended)

* If section parsing fails → fallback to standard chunking (current implementation).
* If citation extraction fails → still store text, skip citation metadata.
* Figures with missing captions → ignore silently (no crash).

---

## 8. Extended Workflow Diagram

```mermaid
flowchart TD
    A[PDF Upload] --> B[Parser: sections + citations + figures]
    B --> C[Hierarchical Chunking]
    C --> D[Dense Embeddings (Cohere) + Sparse BM25]
    D --> E[Pinecone Hybrid Index]
    E --> F[Query]
    F --> G[Hybrid Retriever + Section Bias]
    G --> H[Reranker (Cohere)]
    H --> I[LLM Answer Generator (Groq)]
    I --> J[Answer with section attribution + citations + figures]
```

---

