import pandas as pd
from app.core.utils import safe_float


def profile_dataset(df: pd.DataFrame):

    numeric_columns = df.select_dtypes(
        include="number"
    ).columns.tolist()

    categorical_columns = df.select_dtypes(
        exclude="number"
    ).columns.tolist()

    missing_values = df.isnull().sum()

    statistical_summary = {}

    for column in numeric_columns:
        col_series = pd.to_numeric(df[column], errors="coerce").dropna()
        if len(col_series) > 0:
            statistical_summary[column] = {
                "mean": safe_float(col_series.mean()),
                "median": safe_float(col_series.median()),
                "minimum": safe_float(col_series.min()),
                "maximum": safe_float(col_series.max()),
                "standard_deviation": safe_float(col_series.std()) if len(col_series) > 1 else 0.0
            }
        else:
            statistical_summary[column] = {
                "mean": 0.0,
                "median": 0.0,
                "minimum": 0.0,
                "maximum": 0.0,
                "standard_deviation": 0.0
            }

    outlier_summary = {}

    for column in numeric_columns:
        col_series = pd.to_numeric(df[column], errors="coerce").dropna()
        if len(col_series) > 3:
            Q1 = col_series.quantile(0.25)
            Q3 = col_series.quantile(0.75)
            IQR = Q3 - Q1

            lower_bound = Q1 - (1.5 * IQR)
            upper_bound = Q3 + (1.5 * IQR)

            outliers = col_series[
                (col_series < lower_bound) |
                (col_series > upper_bound)
            ]

            outlier_summary[column] = {
                "outlier_count": int(len(outliers)),
                "lower_bound": safe_float(lower_bound),
                "upper_bound": safe_float(upper_bound)
            }
        else:
            outlier_summary[column] = {
                "outlier_count": 0,
                "lower_bound": None,
                "upper_bound": None
            }

    correlation_matrix = {}

    # Limit correlation calculation to top 25 numeric columns for performance
    corr_numeric_cols = numeric_columns[:25]
    if len(corr_numeric_cols) >= 2:
        try:
            corr_df = df[corr_numeric_cols].corr().round(3)
            correlation_matrix = {
                str(col): {
                    str(other_col): safe_float(val)
                    for other_col, val in row.items()
                }
                for col, row in corr_df.to_dict().items()
            }
        except Exception:
            correlation_matrix = {}

    categorical_summary = {}

    for column in categorical_columns:
        try:
            # Take top 20 values for categorical summary to avoid giant payloads
            value_counts = df[column].astype(str).value_counts().head(20)
            categorical_summary[column] = {
                str(value): int(count)
                for value, count in value_counts.items()
            }
        except Exception:
            categorical_summary[column] = {}

    try:
        dup_count = int(df.duplicated().sum())
    except Exception:
        dup_count = 0

    return {
        "total_rows": len(df),
        "total_columns": len(df.columns),

        "columns": [str(c) for c in df.columns],

        "data_types": {
            str(column): str(df[column].dtype)
            for column in df.columns
        },

        "missing_values": {
            str(column): int(count)
            for column, count in missing_values.items()
            if count > 0
        },

        "duplicate_rows": dup_count,

        "numeric_columns": numeric_columns,

        "outlier_summary": outlier_summary,

        "correlation_matrix": correlation_matrix,

        "categorical_columns": categorical_columns,

        "statistical_summary": statistical_summary
    }