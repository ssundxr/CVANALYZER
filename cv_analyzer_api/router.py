import io
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from .service import CVAnalysisService
import pdfplumber
import docx

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
        file_stream = io.BytesIO(content)
        
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
