import asyncio
import os
import google.generativeai as genai
from .gemini_service import resolve_gemini_model, is_unavailable_model_error, parse_gemini_json

class EvaluatorService:
    @staticmethod
    async def evaluate(assessment_data: dict, candidate_answers: dict) -> dict:
        total_score = 0
        max_score = 0
        details = []

        descriptive_questions = []

        # MCQ and Yes/No exact match evaluation
        for section in assessment_data.get("sections", []):
            sec_type = section.get("type", "mcq")
            weight = section.get("weight_percent", 0)
            
            for q in section.get("questions", []):
                q_id = str(q.get("id"))
                ans = candidate_answers.get(q_id, "")
                
                # Assign 1 point per question, weighted later or just simple sum for now
                max_score += 1

                if sec_type in ["mcq", "yes_no"]:
                    correct = q.get("correct_answer", "").strip().lower()
                    if ans and ans.strip().lower() == correct:
                        total_score += 1
                        details.append({
                            "question_id": q_id,
                            "type": sec_type,
                            "score": 1,
                            "max": 1,
                            "feedback": "Correct"
                        })
                    else:
                        details.append({
                            "question_id": q_id,
                            "type": sec_type,
                            "score": 0,
                            "max": 1,
                            "feedback": f"Incorrect. Exepcted: {correct}"
                        })
                else:
                    # Collect descriptive for LLM eval
                    descriptive_questions.append({
                        "id": q_id,
                        "question": q.get("question"),
                        "candidate_answer": ans,
                        "model_answer": q.get("model_answer", "")
                    })

        # LLM Evaluation for descriptive
        if descriptive_questions:
            llm_results = await EvaluatorService._evaluate_descriptive_with_llm(descriptive_questions)
            for res in llm_results:
                max_score += 1
                total_score += res.get("score", 0)
                details.append({
                    "question_id": str(res.get("id")),
                    "type": "descriptive",
                    "score": res.get("score", 0),
                    "max": 1,
                    "feedback": res.get("feedback", "")
                })

        # Calculate percentage
        percentage_score = round((total_score / max_score * 100), 2) if max_score > 0 else 0

        return {
            "total_score": total_score,
            "max_score": max_score,
            "percentage": percentage_score,
            "breakdown": details
        }

    @staticmethod
    async def _evaluate_descriptive_with_llm(questions: list) -> list:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
             # Fallback if no API key
             return [{"id": q["id"], "score": 0.5, "feedback": "Manual review required (AI evaluation disabled)."} for q in questions]

        genai.configure(api_key=api_key)
        
        prompt = "You are an expert ATS and HR evaluation engine matching the high standards of modern powerful assessment recruiter platforms.\n"
        prompt += "Evaluate the following candidate descriptive answers against the model answers.\n"
        prompt += "Score each on a scale of 0.0 to 1.0 (float) based on semantic similarity, keyword matching, and depth of reasoning.\n\n"
        
        for q in questions:
            prompt += f"Question ID: {q['id']}\n"
            prompt += f"Question Text: {q['question']}\n"
            prompt += f"Model Answer (Expected Context/Keywords): {q['model_answer']}\n"
            prompt += f"Candidate Answer: {q['candidate_answer']}\n"
            prompt += "---\n"
            
        prompt += """\nReturn ONLY a JSON array of objects with this exact structure:
        [
          {
            "id": "1",
            "score": 0.8,
            "feedback": "Concise 1-2 sentence feedback explaining the score."
          }
        ]"""

        try:
            model_name = resolve_gemini_model()
            model = genai.GenerativeModel(model_name)
            generation_config = genai.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json",
            )
            response = await asyncio.to_thread(
                model.generate_content,
                prompt,
                generation_config=generation_config
            )
            raw = (response.text or "").strip()
            parsed = parse_gemini_json(raw)
            if isinstance(parsed, list):
                return parsed
            elif isinstance(parsed, dict) and "results" in parsed:
                return parsed["results"]
            return []
        except Exception as e:
            print("LLM Eval failed:", e)
            return [{"id": q["id"], "score": 0, "feedback": f"Evaluation error: {str(e)}"} for q in questions]
