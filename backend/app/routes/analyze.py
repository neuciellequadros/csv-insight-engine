from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import numpy as np

router = APIRouter()

@router.post("/analyze")
async def analyze_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Envie um arquivo .csv")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio")

    try:
        text = content.decode("utf-8")
    except Exception:
        text = content.decode("latin-1")

    sep = ";" if text.count(";") > text.count(",") else ","

    try:
        from io import StringIO
        df = pd.read_csv(StringIO(text), sep=sep)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao ler CSV: {str(e)}")

    numeric_cols = df.select_dtypes(include=["number"]).columns.tolist()

    stats = {}
    for col in numeric_cols:
        stats[col] = {
            "count": int(df[col].count()),
            "min": float(df[col].min()),
            "max": float(df[col].max()),
            "mean": float(df[col].mean()),
            "sum": float(df[col].sum()),
        }

    preview = df.head(20).fillna("").to_dict(orient="records")

    return {
        "filename": file.filename,
        "rows": len(df),
        "cols": len(df.columns),
        "numericColumns": numeric_cols,
        "stats": stats,
        "preview": preview,
    }
