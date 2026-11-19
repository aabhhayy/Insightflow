import pandas as pd
from app.core.utils import safe_float


def analyze_cleaning(df: pd.DataFrame):

    missing_values = df.isnull().sum()

    missing_summary = {
        str(column): int(count)
        for column, count in missing_values.items()
        if count > 0
    }

    try:
        duplicate_rows = int(df.duplicated().sum())
    except Exception:
        duplicate_rows = 0

    return {
        "missing_values": missing_summary,
        "total_missing_values": int(missing_values.sum()),
        "duplicate_rows": duplicate_rows
    }


def clean_dataset(df: pd.DataFrame):

    cleaned_df = df.copy()
    original_rows = len(cleaned_df)

    # Safely remove duplicate rows
    try:
        cleaned_df = cleaned_df.drop_duplicates()
        duplicates_removed = original_rows - len(cleaned_df)
    except Exception:
        duplicates_removed = 0

    # Classify all columns into numeric and non-numeric
    numeric_columns = cleaned_df.select_dtypes(include="number").columns
    non_numeric_columns = cleaned_df.select_dtypes(exclude="number").columns

    numeric_filled = 0
    categorical_filled = 0
    imputation_details = []

    # 1. Impute all numeric columns
    for column in numeric_columns:
        missing_count = int(cleaned_df[column].isnull().sum())

        if missing_count > 0:
            median_val = cleaned_df[column].median()
            fill_val = 0.0
            if not pd.isna(median_val):
                fill_val = safe_float(median_val)
                if fill_val is None:
                    fill_val = 0.0

            cleaned_df[column] = cleaned_df[column].fillna(fill_val)
            numeric_filled += missing_count

            imputation_details.append({
                "column": str(column),
                "type": "numeric",
                "missing_count": missing_count,
                "strategy": "Median Imputation",
                "fill_value": str(fill_val)
            })

    # 2. Impute all non-numeric columns (text, categories, booleans, dates)
    for column in non_numeric_columns:
        missing_count = int(cleaned_df[column].isnull().sum())

        if missing_count > 0:
            mode_series = cleaned_df[column].dropna().mode()

            fill_val = "Unknown"
            if not mode_series.empty and not pd.isna(mode_series.iloc[0]):
                fill_val = str(mode_series.iloc[0])

            cleaned_df[column] = cleaned_df[column].fillna(fill_val)
            categorical_filled += missing_count

            imputation_details.append({
                "column": str(column),
                "type": "categorical/other",
                "missing_count": missing_count,
                "strategy": "Mode Imputation",
                "fill_value": str(fill_val)
            })

    return cleaned_df, {
        "original_rows": original_rows,
        "final_rows": len(cleaned_df),
        "duplicates_removed": duplicates_removed,
        "numeric_missing_filled": numeric_filled,
        "categorical_missing_filled": categorical_filled,
        "imputation_details": imputation_details
    }