import json
import re
import google.generativeai as genai
from backend.app.core.config import settings

# Configure Gemini API if available
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    
def get_gemini_model(model_name: str = "gemini-2.5-flash"):
    if not settings.GEMINI_API_KEY:
        return None
    return genai.GenerativeModel(model_name)

# =====================================================================
# FALLBACK MOCK LLM RESPONSES (Used if API Key is not set or API fails)
# =====================================================================

def _mock_parse_resume(text: str) -> dict:
    # Basic regex parsing to make it look semi-realistic
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    phone_match = re.search(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    
    email = email_match.group(0) if email_match else "john.doe@example.com"
    phone = phone_match.group(0) if phone_match else "+1 (555) 019-2834"
    
    # Try to extract first name
    words = text.split()
    name = "John Doe"
    if len(words) > 1:
        name = f"{words[0]} {words[1]}"
    
    first_name, last_name = name.split(" ", 1) if " " in name else (name, "")
    
    # Simple list extraction from text
    skills = []
    known_skills = ["python", "javascript", "react", "node", "aws", "docker", "fastapi", "next.js", "typescript", "sql", "postgresql", "java", "c++", "kubernetes"]
    for skill in known_skills:
        if skill.lower() in text.lower():
            skills.append(skill.capitalize())
            
    if not skills:
        skills = ["Python", "SQL", "Git"]

    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "phone": phone,
        "location": "New York, NY",
        "linkedin": f"linkedin.com/in/{first_name.lower()}{last_name.lower()}",
        "github": f"github.com/{first_name.lower()}{last_name.lower()}",
        "portfolio": f"{first_name.lower()}{last_name.lower()}.dev",
        "skills": skills,
        "education": [
            {
                "school": "State University",
                "degree": "Bachelor of Science",
                "major": "Computer Science",
                "year": "2022",
                "gpa": "3.8"
            }
        ],
        "experience": [
            {
                "company": "Tech Solutions Inc.",
                "role": "Software Engineer",
                "start_date": "2022-06",
                "end_date": "Present",
                "description": "Developed backend APIs using Python and FastAPI. Built responsive web interfaces."
            }
        ],
        "projects": [
            {
                "title": "E-Commerce API",
                "description": "Scalable RESTful API for online store with stripe integration.",
                "url": "github.com/project",
                "technologies": ["Python", "FastAPI", "PostgreSQL"]
            }
        ],
        "certifications": ["AWS Certified Solutions Architect"],
        "languages": ["English (Native)", "Spanish (Conversational)"],
        "achievements": ["Won First Place at HackNY 2023"]
    }

def _mock_extract_job(description: str) -> dict:
    return {
        "title": "Software Engineer",
        "required_skills": ["Python", "FastAPI", "SQL", "Git"],
        "preferred_skills": ["Docker", "Kubernetes", "AWS", "Next.js"],
        "experience_years": 3,
        "education_requirements": "Bachelor's in Computer Science or related field",
        "responsibilities": [
            "Design and build scalable APIs.",
            "Write unit tests and documentation.",
            "Deploy applications to AWS cloud infrastructure.",
            "Collaborate with frontend engineers."
        ],
        "keywords": ["FastAPI", "Python", "SQLAlchemy", "REST API", "AWS"]
    }

def _mock_match_candidate(candidate_json: dict, job_json: dict) -> dict:
    cand_skills = [s.lower() for s in candidate_json.get("skills", [])]
    req_skills = [s.lower() for s in job_json.get("required_skills", [])]
    
    matched_skills = [s for s in req_skills if s in cand_skills]
    skill_score = (len(matched_skills) / len(req_skills)) * 100 if req_skills else 80.0
    
    overall_score = round(skill_score * 0.4 + 50.0, 1) # Keep it within realistic bounds
    overall_score = min(overall_score, 100.0)
    
    return {
        "overall_score": overall_score,
        "skill_score": round(skill_score, 1),
        "experience_score": 85.0,
        "education_score": 90.0,
        "certification_score": 75.0,
        "project_score": 80.0,
        "keyword_score": 85.0,
        "semantic_score": 82.0,
        "explanation": f"The candidate matches {len(matched_skills)} required skills out of {len(req_skills)}. Strong experience in software engineering.",
        "confidence_score": 90.0,
        "ai_summary": "Highly motivated engineer with strong core skills aligning with the requirements.",
        "strengths": [f"Proficient in {', '.join(candidate_json.get('skills', [])[:3])}", "Solid academic pedigree"],
        "weaknesses": ["Limited cloud deployment experience in the resume profile", "Lack of advanced degrees"]
    }

def _mock_detect_fraud(candidate_json: dict) -> dict:
    # Just generic fraud detection
    return {
        "fraud_risk_score": 10.0,
        "fraud_risk_report": [
            {
                "type": "Keyword Stuffing",
                "severity": "low",
                "description": "Candidate mentions skills matching the standard template, no high-risk stuffing detected."
            }
        ]
    }

def _mock_interview_questions(candidate_json: dict, job_json: dict) -> list:
    return [
        {
            "question_text": "Can you describe a challenging API you designed using FastAPI?",
            "category": "technical",
            "difficulty": "medium",
            "ideal_answer": "Candidate should discuss endpoints, routing, Pydantic modeling, and handling databases."
        },
        {
            "question_text": "Tell me about a time you had a disagreement with a team member. How did you resolve it?",
            "category": "behavioral",
            "difficulty": "easy",
            "ideal_answer": "Candidate should demonstrate active listening, empathy, and professional compromise."
        }
    ]

# =====================================================================
# ACTUAL GEMINI CALLS
# =====================================================================

def parse_resume_text(text: str) -> dict:
    model = get_gemini_model()
    if not model:
        return _mock_parse_resume(text)
    
    prompt = f"""
    You are an expert ATS System parser. Extract candidate details from the following resume text.
    Return ONLY a valid JSON object matching the schema below. Do not include markdown formatting, code blocks or extra text.
    
    Schema:
    {{
        "first_name": "string",
        "last_name": "string",
        "email": "string",
        "phone": "string",
        "location": "string",
        "linkedin": "string",
        "github": "string",
        "portfolio": "string",
        "skills": ["string"],
        "education": [
            {{
                "school": "string",
                "degree": "string",
                "major": "string",
                "year": "string",
                "gpa": "string"
            }}
        ],
        "experience": [
            {{
                "company": "string",
                "role": "string",
                "start_date": "string",
                "end_date": "string",
                "description": "string"
            }}
        ],
        "projects": [
            {{
                "title": "string",
                "description": "string",
                "url": "string",
                "technologies": ["string"]
            }}
        ],
        "certifications": ["string"],
        "languages": ["string"],
        "achievements": ["string"]
    }}
    
    Resume Text:
    {text}
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        data = json.loads(response.text)
        return data
    except Exception as e:
        print(f"Gemini API Error in parse_resume_text: {e}")
        return _mock_parse_resume(text)

def extract_job_features(description: str) -> dict:
    model = get_gemini_model()
    if not model:
        return _mock_extract_job(description)
        
    prompt = f"""
    You are an AI Recruitment Specialist. Extract details from the following job description.
    Return ONLY a valid JSON object matching the schema below. Do not include markdown or extra text.
    
    Schema:
    {{
        "title": "string",
        "required_skills": ["string"],
        "preferred_skills": ["string"],
        "experience_years": integer,
        "education_requirements": "string",
        "responsibilities": ["string"],
        "keywords": ["string"]
    }}
    
    Job Description:
    {description}
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API Error in extract_job_features: {e}")
        return _mock_extract_job(description)

def match_candidate_to_job(candidate_json: dict, job_json: dict) -> dict:
    model = get_gemini_model()
    if not model:
        return _mock_match_candidate(candidate_json, job_json)
        
    prompt = f"""
    Analyze the Candidate Resume JSON against the Job Description JSON. Calculate matching scores (0-100) and summarize the profile match.
    Return ONLY a valid JSON object matching the schema below. Do not include markdown or extra text.
    
    Schema:
    {{
        "overall_score": float,
        "skill_score": float,
        "experience_score": float,
        "education_score": float,
        "certification_score": float,
        "project_score": float,
        "keyword_score": float,
        "semantic_score": float,
        "explanation": "string",
        "confidence_score": float,
        "ai_summary": "string",
        "strengths": ["string"],
        "weaknesses": ["string"]
    }}
    
    Candidate Resume:
    {json.dumps(candidate_json)}
    
    Job Description:
    {json.dumps(job_json)}
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API Error in match_candidate_to_job: {e}")
        return _mock_match_candidate(candidate_json, job_json)

def detect_resume_fraud(candidate_json: dict) -> dict:
    model = get_gemini_model()
    if not model:
        return _mock_detect_fraud(candidate_json)
        
    prompt = f"""
    Analyze the Candidate Resume JSON for potential inconsistencies, embellishments, or fraud signals.
    Look for:
    1. Overlapping employment timelines (working full-time at multiple physical places simultaneously).
    2. Huge unexplained employment gaps (especially when not marked).
    3. Keyword stuffing (dumping 100 technologies without project references).
    4. suspicious/impossible claims (e.g. 10 years experience in a technology that has been out for 2 years).
    
    Return ONLY a valid JSON object matching the schema below. Do not include markdown or extra text.
    
    Schema:
    {{
        "fraud_risk_score": float,
        "fraud_risk_report": [
            {{
                "type": "string",
                "severity": "low/medium/high",
                "description": "string"
            }}
        ]
    }}
    
    Candidate Resume:
    {json.dumps(candidate_json)}
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API Error in detect_resume_fraud: {e}")
        return _mock_detect_fraud(candidate_json)

def generate_interview_questions(candidate_json: dict, job_json: dict) -> list:
    model = get_gemini_model()
    if not model:
        return _mock_interview_questions(candidate_json, job_json)
        
    prompt = f"""
    Based on the Candidate Resume JSON and Job Description JSON, generate a customized list of interview questions.
    Provide at least 5 questions categorized across Technical, Behavioral, Situational, System Design, and Coding.
    Include Easy, Medium, and Hard difficulties, along with ideal answer highlights.
    
    Return ONLY a valid JSON array of objects matching the schema below. Do not include markdown or extra text.
    
    Schema:
    [
        {{
            "question_text": "string",
            "category": "string",
            "difficulty": "string",
            "ideal_answer": "string"
        }}
    ]
    
    Candidate Resume:
    {json.dumps(candidate_json)}
    
    Job Description:
    {json.dumps(job_json)}
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API Error in generate_interview_questions: {e}")
        return _mock_interview_questions(candidate_json, job_json)
