from fastapi import APIRouter, UploadFile, File, HTTPException
from app.analytics.profiler import profile_dataset
from app.analytics.cleaner import analyze_cleaning, clean_dataset
from app.analytics.eda import generate_eda
from app.core.utils import sanitize_for_json, robust_read_file

router = APIRouter()


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected."
        )

    file_extension = file.filename.lower().split(".")[-1]

    if file_extension not in ["csv", "xlsx", "xls", "txt"]:
        raise HTTPException(
            status_code=400,
            detail="Only CSV and Excel (.xlsx, .xls) files are supported."
        )

    contents = await file.read()

    if not contents or len(contents) == 0:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty. Please upload a file with data."
        )

    try:
        df = robust_read_file(contents, file.filename)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to parse dataset: {str(e)}"
        )

    if len(df) == 0:
        raise HTTPException(
            status_code=400,
            detail="The uploaded dataset has headers but contains 0 data rows."
        )

    profile = profile_dataset(df)
    cleaning_analysis = analyze_cleaning(df)
    cleaned_df, cleaning_summary = clean_dataset(df)
    eda = generate_eda(cleaned_df)

    # Convert cleaned dataframe to CSV string for direct export/download
    cleaned_csv_str = cleaned_df.to_csv(index=False)

    # Sample rows (up to 100 rows) for charts and dashboard visualization
    sample_records = cleaned_df.head(100).to_dict(orient="records")

    response_payload = {
        "filename": file.filename,
        "columns": [str(c) for c in cleaned_df.columns],
        "profile": profile,
        "cleaning_analysis": cleaning_analysis,
        "cleaning_summary": cleaning_summary,
        "eda": eda,
        "sample_data": sample_records,
        "cleaned_csv": cleaned_csv_str,
    }

    return sanitize_for_json(response_payload)