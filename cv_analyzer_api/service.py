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
        # Make sure settings is imported if not already. Actually I'll do this better.
        from app.config import settings
        api_key = settings.gemini_api_key
        if not api_key:
            return {"candidate_name": "Error: Missing API Key", "score": 0, "red_flags": [], "improvements": []}
            
        genai.configure(api_key=api_key)
        model_name = resolve_gemini_model()
        model = genai.GenerativeModel(model_name)
        
        target_countries_list = job_title.get('target_countries', []) if isinstance(job_title, dict) else []
        target_countries_str = ", ".join(target_countries_list) if target_countries_list else "Global (Infer from resume)"
        relocation_pref = "Ready to relocate anywhere" if isinstance(job_title, dict) and job_title.get('anywhere') else "Specific regions"
        real_job_title = job_title.get('title', 'Senior Role') if isinstance(job_title, dict) else job_title

        prompt = f"""
        You are a highly deterministic ATS and Career Architect.
        
        INPUT CONTEXT:
        - TARGET ROLE: {real_job_title}
        - MARKET_MODE: {"GLOBAL" if isinstance(job_title, dict) and job_title.get('anywhere') else "SPECIFIC"}
        - TARGET COUNTRIES: {target_countries_str}
        - RELOCATION PREFERENCE: {relocation_pref}
        - RESUME TEXT: {raw_text}

        TASK: Analyze the resume against the target role with HIGH RIGIDITY.
        
        SCORING RULES:
        1. ATS Score: Calculate exactly based on weights (0.3KS, 0.2SS, 0.2EX, 0.1ED, 0.1FS, 0.1AC).
        2. Percentile: Be consistent. Top 5% for industry experts, Top 15% for seniors, Top 40% for juniors.

        MARKET ANALYSIS RULES:
        - If MARKET_MODE is SPECIFIC:
            * set "target_market_used" to the EXACT TARGET COUNTRY name provided (e.g. {target_countries_str}).
            * Estimate salary ONLY in the local currency of that specific target region.
            * ALWAYS specify the frequency (e.g. /yr or /month) to avoid ambiguity.
            * DO NOT use the candidate's historical country (detected country) for this market analysis if a target is provided.
        - If MARKET_MODE is GLOBAL:
            * set "target_market_used" to "Global Markets".
            * Provide a 'Global Benchmark' in USD (Annual/yr).

        --- MANDATORY EXTRACTION PROTOCOL: CANDIDATE NAME ---
        The extraction of the name must follow these strict rules to ensure 0% error:
        1. SOURCE LOCATION: Look at the very first non-empty line of the RESUME_TEXT. In standard CV patterns, this is the name.
        2. VERBATIM REQUIREMENT (WITH INTELLIGENT RECONSTRUCTION): Extract the name EXACTLY as it appears in the raw text. 
           - EXCEPTION: If the text appears fragmented due to PDF parsing errors (e.g. stylized fonts causing "S S HYAM UNDER"), you MUST intelligently reconstruct the true human name (e.g. "SHYAM SUNDER").
           - DO NOT fix capitalization unnecessarily, but do fix obvious spacing/fragmentation errors.
           - DO NOT remove middle names or suffixes.
        3. STOP-LOGIC: If the first line contains common headers like "Curriculum Vitae" or "Resume", skip to the next line to find the proper noun.
        4. VALIDATION: Cross-reference the extracted name with the email address. If the email is 'alfredm@email.com', the name should likely contain 'Alfred'.
        5. FORBIDDEN: Do not assume a name based on the filename. Only use the text inside the document.

        STEP 1: GENERATE JD INTERNALLY
        STEP 2: SECTIONAL AUDIT (6 sections)
        STEP 3: GENERAL CAREER IMPROVEMENTS (5-7 strategic advice)
        STEP 4: INTERVIEW PREP (minimum 4-6 targeted questions based on gaps)
        STEP 5: RED FLAGS (minimum 4, critical alerts, but mention all that is noted)
        STEP 6: UPSKILLING COURSES (minimum of 5 high-quality, relevant courses)

        RESPOND ONLY WITH VALID JSON IN THIS EXACT STRUCTURE:
        {{
            "candidate_metadata": {{
                "name": "[Insert Exact Verbatim String]",
                "email": "Email Address",
                "current_title": "Current Job Title",
                "total_years_exp": 0.0,
                "relevant_years_exp": 0.0,
                "detected_country": "Detected Country",
                "target_region_fit": "Analysis..."
            }},
            "overall_ats_score": 85,
            "suggested_summary": "...",
            "sectional_report": {{
                "keyword_analysis": {{"score": 0, "feedback": "...", "actionable_fix": "..."}},
                "skills_audit": {{"score": 0, "feedback": "...", "missing_skills": [], "priority_skill_to_add": "..."}},
                "experience_logic": {{"score": 0, "relevance_summary": "...", "feedback": "...", "quantification_hack": "..."}},
                "formatting_structure": {{"score": 0, "pattern_detected": "...", "structural_advice": "...", "layout_optimization": "..."}},
                "achievements_impact": {{"score": 0, "feedback": "...", "detected_achievements": [], "impact_multiplier_advice": "..."}},
                "market_benchmarking": {{"score": 0, "percentile": 0, "market_demand": "...", "salary_estimate": "...", "regional_positioning_strategy": "..."}}
            }},
            "market_benchmarking": {{
                "target_market_used": "Match this to the analyzed region",
                "percentile": 0,
                "average_score_for_role": 0,
                "market_demand": "...",
                "salary_estimate": "...",
                "regional_positioning_strategy": "..."
            }},
            "strengths": [],
            "red_flags": [{{ "type": "...", "description": "..." }}],
            "general_career_improvements": [{{ "category": "...", "insight": "...", "action_step": "..." }}],
            "suggested_courses": [
                {{"name": "Course 1", "url": "..."}},
                {{"name": "Course 2", "url": "..."}},
                {{"name": "Course 3", "url": "..."}},
                {{"name": "Course 4", "url": "..."}},
                {{"name": "Course 5", "url": "..."}}
            ],
            "interview_prep": [
                {{"question": "Q1", "intent": "I1", "suggested_answer": "A1"}},
                {{"question": "Q2", "intent": "I2", "suggested_answer": "A2"}},
                {{"question": "Q3", "intent": "I3", "suggested_answer": "A3"}},
                {{"question": "Q4", "intent": "I4", "suggested_answer": "A4"}}
            ]
        }}
        """
        try:
            generation_config = { "temperature": 0.1, "top_p": 0.95, "top_k": 40, "max_output_tokens": 4096 }
            response = await asyncio.to_thread(model.generate_content, prompt, generation_config=generation_config)
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

    @staticmethod
    def extract_text_from_file(file_content: bytes, filename: str) -> str:
        import io
        import pdfplumber
        import docx
        file_stream = io.BytesIO(file_content)
        raw_text = ""
        
        if filename.endswith(".pdf"):
            with pdfplumber.open(file_stream) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        raw_text += text + "\n"
        elif filename.endswith(".docx"):
            doc = docx.Document(file_stream)
            raw_text = "\n".join([para.text for para in doc.paragraphs])
            
        return raw_text

