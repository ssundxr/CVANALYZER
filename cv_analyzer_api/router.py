from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from .service import CVAnalysisService
router = APIRouter(prefix="/api/cv", tags=["cv_analyzer"])

@router.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    job_title: str = Form("Senior Role"),
    target_countries: str = Form(""),
    relocate_anywhere: bool = Form(False)
):
    filename = file.filename.lower()
    if not (filename.endswith(".pdf") or filename.endswith(".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")
        
    try:
        content = await file.read()
        raw_text = CVAnalysisService.extract_text_from_file(content, filename)
        
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from file.")
            
        analysis_results = await CVAnalysisService.analyze_resume_data(
            raw_text, 
            {
                "title": job_title,
                "target_countries": [c.strip() for c in target_countries.split(",") if c.strip()],
                "anywhere": relocate_anywhere
            }
        )
        return analysis_results
        
    except Exception as e:
        print(f"Error processing CV: {e}")
        raise HTTPException(status_code=500, detail=str(e))
