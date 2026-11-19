import pandas as pd
from app.core.utils import safe_float


def generate_eda(df: pd.DataFrame):

    numeric_columns = df.select_dtypes(
        include="number"
    ).columns.tolist()

    categorical_columns = df.select_dtypes(
        exclude="number"
    ).columns.tolist()

    numerical_analysis = {}

    for column in numeric_columns:
        col_series = pd.to_numeric(df[column], errors="coerce").dropna()
        if len(col_series) > 0:
            numerical_analysis[column] = {
                "mean": safe_float(col_series.mean()),
                "median": safe_float(col_series.median()),
                "min": safe_float(col_series.min()),
                "max": safe_float(col_series.max())
            }
        else:
            numerical_analysis[column] = {
                "mean": 0.0,
                "median": 0.0,
                "min": 0.0,
                "max": 0.0
            }

    categorical_analysis = {}

    for column in categorical_columns:
        try:
            counts = df[column].astype(str).value_counts().head(10)
            categorical_analysis[column] = {
                str(value): int(count)
                for value, count in counts.items()
            }
        except Exception:
            categorical_analysis[column] = {}

    correlation = {}

    corr_cols = numeric_columns[:25]
    if len(corr_cols) >= 2:
        try:
            corr_df = df[corr_cols].corr().round(3)
            correlation = {
                str(col): {
                    str(other_col): safe_float(val)
                    for other_col, val in row.items()
                }
                for col, row in corr_df.to_dict().items()
            }
        except Exception:
            correlation = {}

    return {
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
        "numerical_analysis": numerical_analysis,
        "categorical_analysis": categorical_analysis,
        "correlation": correlation
    }