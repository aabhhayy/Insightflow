import math
from io import BytesIO
from typing import Any
import numpy as np
import pandas as pd


def safe_float(val: Any) -> float | None:
    if val is None or pd.isna(val):
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, 3)
    except (ValueError, TypeError):
        return None


def sanitize_for_json(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {str(k): sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, (float, np.floating)):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, (int, np.integer)):
        return int(obj)
    elif isinstance(obj, (bool, np.bool_)):
        return bool(obj)
    elif pd.isna(obj):
        return None
    return obj


def robust_read_file(contents: bytes, filename: str) -> pd.DataFrame:
    file_ext = filename.lower().split(".")[-1]

    if file_ext == "csv":
        encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252", "iso-8859-1"]
        df = None

        for enc in encodings:
            # 1. Try with python engine (auto-detects delimiter: comma, semicolon, tab, pipe)
            try:
                candidate = pd.read_csv(
                    BytesIO(contents),
                    encoding=enc,
                    sep=None,
                    engine="python",
                    on_bad_lines="skip"
                )
                if candidate is not None and len(candidate.columns) > 0:
                    df = candidate
                    break
            except Exception:
                pass

            # 2. Try standard comma separator
            try:
                candidate = pd.read_csv(
                    BytesIO(contents),
                    encoding=enc,
                    on_bad_lines="skip"
                )
                if candidate is not None and len(candidate.columns) > 0:
                    df = candidate
                    break
            except Exception:
                pass

        if df is None:
            # Fallback
            df = pd.read_csv(
                BytesIO(contents),
                encoding="latin-1",
                on_bad_lines="skip"
            )

    elif file_ext in ["xlsx", "xls"]:
        df = pd.read_excel(BytesIO(contents))
    else:
        raise ValueError("Unsupported format. Please upload a CSV or Excel (.xlsx) file.")

    if df is None or len(df.columns) == 0:
        raise ValueError("The uploaded file does not contain any readable columns or data.")

    # Sanitize and guarantee clean, unique string column headers
    cleaned_cols = []
    seen_cols: dict[str, int] = {}
    for i, col in enumerate(df.columns):
        c_name = str(col).strip()
        if not c_name or c_name.lower().startswith("unnamed:"):
            c_name = f"Column_{i+1}"
        if c_name in seen_cols:
            seen_cols[c_name] += 1
            c_name = f"{c_name}_{seen_cols[c_name]}"
        else:
            seen_cols[c_name] = 1
        cleaned_cols.append(c_name)

    df.columns = cleaned_cols
    return df
