import os
import logging
from typing import List, Dict, Any
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# Try importing real ChromaDB and SentenceTransformers, but prepare fallbacks
CHROMA_AVAILABLE = False
SENTENCE_TRANSFORMERS_AVAILABLE = False

try:
    import chromadb
    CHROMA_AVAILABLE = True
except ImportError:
    logger.warning("chromadb package not available. Falling back to in-memory vector store.")

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    logger.warning("sentence-transformers package not available. Falling back to simple keyword-based embeddings.")

# ==========================================
# VECTOR STORE IMPLEMENTATION
# ==========================================

class RAGService:
    def __init__(self):
        self.chroma_client = None
        self.collection = None
        self.encoder = None
        
        # Fallback local data index
        self.in_memory_docs = [] # List of dict: {"id": candidate_id, "text": resume_text, "meta": candidate_meta}

        if CHROMA_AVAILABLE:
            try:
                # Ensure directory exists
                os.makedirs(settings.CHROMA_DB_DIR, exist_ok=True)
                self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_DB_DIR)
                self.collection = self.chroma_client.get_or_create_collection(
                    name="candidate_resumes"
                )
                logger.info("ChromaDB initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize ChromaDB: {e}. Using in-memory fallback.")
                self.chroma_client = None
                
        if SENTENCE_TRANSFORMERS_AVAILABLE and settings.GEMINI_API_KEY: # Or if we want to run locally
            try:
                # Run lightweight model
                self.encoder = SentenceTransformer("all-MiniLM-L6-v2")
                logger.info("SentenceTransformer model loaded.")
            except Exception as e:
                logger.error(f"Failed to load SentenceTransformer: {e}. Using text fallback.")
                self.encoder = None

    def index_candidate(self, candidate_id: int, resume_text: str, candidate_meta: Dict[str, Any]):
        """
        Indexes a candidate resume for search.
        """
        # Save to memory list in all cases
        clean_text = resume_text if resume_text else ""
        doc_entry = {
            "id": str(candidate_id),
            "text": clean_text,
            "meta": candidate_meta
        }
        # Check if already exists in fallback list and update
        self.in_memory_docs = [doc for doc in self.in_memory_docs if doc["id"] != str(candidate_id)]
        self.in_memory_docs.append(doc_entry)
        
        if self.collection:
            try:
                # Index in ChromaDB
                metadata = {
                    "first_name": candidate_meta.get("first_name", "") or "",
                    "last_name": candidate_meta.get("last_name", "") or "",
                    "email": candidate_meta.get("email", "") or "",
                    "skills": ",".join(candidate_meta.get("skills", []) or []),
                    "experience_years": str(candidate_meta.get("experience_years", 0))
                }
                
                # If encoder exists, we generate embeddings, otherwise Chroma handles it or we use raw documents
                if self.encoder:
                    embedding = self.encoder.encode(clean_text).tolist()
                    self.collection.upsert(
                        ids=[str(candidate_id)],
                        embeddings=[embedding],
                        documents=[clean_text],
                        metadatas=[metadata]
                    )
                else:
                    self.collection.upsert(
                        ids=[str(candidate_id)],
                        documents=[clean_text],
                        metadatas=[metadata]
                    )
                logger.info(f"Indexed candidate {candidate_id} in ChromaDB.")
            except Exception as e:
                logger.error(f"ChromaDB indexing error for candidate {candidate_id}: {e}")

    def search_candidates(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Searches candidate resumes for similarity.
        """
        if self.collection:
            try:
                if self.encoder:
                    query_embedding = self.encoder.encode(query).tolist()
                    results = self.collection.query(
                        query_embeddings=[query_embedding],
                        n_results=limit
                    )
                else:
                    results = self.collection.query(
                        query_texts=[query],
                        n_results=limit
                    )
                
                formatted_results = []
                if results and 'ids' in results and len(results['ids']) > 0:
                    for i in range(len(results['ids'][0])):
                        formatted_results.append({
                            "candidate_id": int(results['ids'][0][i]),
                            "text": results['documents'][0][i] if 'documents' in results else "",
                            "score": results['distances'][0][i] if 'distances' in results else 1.0,
                            "metadata": results['metadatas'][0][i] if 'metadatas' in results else {}
                        })
                return formatted_results
            except Exception as e:
                logger.error(f"ChromaDB search failed: {e}. Falling back to keyword search.")
        
        # Fallback keyword match search
        matches = []
        query_words = query.lower().split()
        for doc in self.in_memory_docs:
            score = 0
            text_lower = doc["text"].lower()
            for word in query_words:
                if word in text_lower:
                    score += 1
            if score > 0 or not query_words:
                matches.append({
                    "candidate_id": int(doc["id"]),
                    "text": doc["text"][:300],
                    "score": float(score),
                    "metadata": doc["meta"]
                })
        # Sort by score descending
        matches.sort(key=lambda x: x["score"], reverse=True)
        return matches[:limit]

    def answer_query(self, query: str, job_id: int = None, chat_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Uses LLM + Retrieved candidates to answer recruiter copilot queries.
        """
        # Step 1: Retrieve relevant resumes
        search_results = self.search_candidates(query, limit=5)
        
        # Format context
        context_items = []
        suggested_candidates = []
        for res in search_results:
            c_id = res["candidate_id"]
            meta = res["metadata"]
            name = f"{meta.get('first_name', '')} {meta.get('last_name', '')}".strip() or f"Candidate #{c_id}"
            skills = meta.get("skills", "")
            context_items.append(f"Candidate ID: {c_id}\nName: {name}\nSkills: {skills}\nDetails: {res['text'][:800]}")
            
            suggested_candidates.append({
                "id": c_id,
                "name": name,
                "skills": [s.strip() for s in skills.split(",") if s.strip()] if isinstance(skills, str) else skills
            })
            
        context = "\n\n---\n\n".join(context_items)
        
        # Step 2: Query LLM
        from backend.app.services.gemini_service import get_gemini_model
        model = get_gemini_model()
        
        system_prompt = """You are a Recruiting Intelligence Copilot. Help the recruiter find candidates, compare profiles, and analyze resumes.
Use the candidate context below to answer the user's questions. 
If the context is empty, let the recruiter know there are no indexed candidates yet.
Keep your answer clear, structured, professional, and friendly."""

        history_str = ""
        if chat_history:
            history_str = "\n".join([f"{msg['role'].capitalize()}: {msg['content']}" for msg in chat_history[-5:]])
            
        prompt = f"""
        {system_prompt}
        
        Retrieved Candidates Context:
        {context}
        
        Chat History:
        {history_str}
        
        User Question: {query}
        
        Answer:
        """
        
        if model:
            try:
                response = model.generate_content(prompt)
                answer = response.text
            except Exception as e:
                logger.error(f"Gemini error in RAG answer: {e}")
                answer = self._generate_fallback_answer(query, suggested_candidates)
        else:
            answer = self._generate_fallback_answer(query, suggested_candidates)
            
        return {
            "answer": answer,
            "suggested_candidates": suggested_candidates
        }

    def _generate_fallback_answer(self, query: str, candidates: List[Dict[str, Any]]) -> str:
        """
        Provides helpful offline matching descriptions when Gemini is unavailable.
        """
        if not candidates:
            return "No candidates match your query in the current search directory. Please upload more resumes or clarify the criteria."
        
        resp = f"I scanned the candidate base for '{query}' and found {len(candidates)} relevant profiles:\n\n"
        for c in candidates:
            resp += f"- **{c['name']}** (Candidate #{c['id']}) who has skills: {', '.join(c['skills'][:6]) if isinstance(c['skills'], list) else c['skills']}\n"
        resp += "\nYou can click on their profiles above to view full resumes and match analyses."
        return resp

# Singleton instance
rag_service = RAGService()
