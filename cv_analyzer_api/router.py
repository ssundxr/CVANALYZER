import io
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from .service import CVAnalysisService
import pdfplumber

router = APIRouter(prefix="/api/cv", tags=["cv_analyzer"])

@router.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    job_title: str = Form("Senior Role")
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    try:
        content = await file.read()
        pdf_file = io.BytesIO(content)
        
        raw_text = ""
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    raw_text += text + "\n"
                    
        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF.")
            
        analysis_results = await CVAnalysisService.analyze_resume_data(raw_text, job_title)
        return analysis_results
        
    except Exception as e:
        print(f"Error processing CV: {e}")
        raise HTTPException(status_code=500, detail=str(e))
