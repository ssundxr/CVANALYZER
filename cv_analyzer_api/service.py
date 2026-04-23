import google.generativeai as genai
import json
import os
import asyncio
from dotenv import load_dotenv

# Try to use the app's resolver if available, otherwise fallback
try:
    from app.services.gemini_service import resolve_gemini_model
except ImportError:
    def resolve_gemini_model():
        return "gemini-3-flash-preview"

load_dotenv()

class CVAnalysisService:
    @staticmethod
    async def analyze_resume_data(raw_text: str, job_title: str = "Senior Role") -> dict:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return {"candidate_name": "Error: Missing API Key", "score": 0, "red_flags": [], "improvements": []}
            
        genai.configure(api_key=api_key)
        model_name = resolve_gemini_model()
        model = genai.GenerativeModel(model_name)
        
        prompt = f"""
        You are an expert ATS and Career Architect.
        INPUT DATA: {raw_text}
        TARGET ROLE: {job_title}

        TASK:
        1. Extract Candidate Name and Email.
        2. Identify Current Job Title.
        3. Calculate ATS Score (0-100).
        4. Provide 4 "Strategic Improvements" (issue and fix).
        5. List 3 "Verified Strengths".
        6. Identify 2-3 "Red Flags".
        7. Suggest 3 Courses.

        RESPOND ONLY WITH VALID JSON:
        {{
            "candidate_name": "Full Name",
            "candidate_email": "Email Address",
            "current_title": "Current Job Title",
            "score": 85,
            "suggested_summary": "High-impact summary...",
            "strengths": [],
            "improvements": [{{"issue": "...", "fix": "..."}}],
            "red_flags": [{{"type": "...", "description": "..."}}],
            "suggested_courses": []
        }}
        """
        try:
            # Run in a thread to prevent blocking the async event loop
            response = await asyncio.to_thread(model.generate_content, prompt)
            content = response.text.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].strip()
            return json.loads(content)
        except Exception as e:
            err_msg = str(e)
            print(f"CV Analysis Error: {err_msg}")
            if "quota" in err_msg.lower() or "429" in err_msg:
                return {"candidate_name": "Error: Quota Exceeded", "score": 0, "red_flags": [{"type": "System", "description": "Gemini API quota reached. Please try again in a minute."}], "improvements": []}
            return {"candidate_name": "Error analyzing resume", "score": 0, "red_flags": [], "improvements": []}
3