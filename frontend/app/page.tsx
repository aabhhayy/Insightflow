"use client";

import { useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ScatterChart,
  Scatter,
} from "recharts";

type ImputationDetail = {
  column: string;
  type: "numeric" | "categorical";
  missing_count: number;
  strategy: string;
  fill_value: string;
};

type AnalysisResult = {
  filename: string;
  columns: string[];
  profile: {
    total_rows: number;
    total_columns: number;
    columns: string[];
    missing_values: Record<string, number>;
    duplicate_rows: number;
    numeric_columns: string[];
    categorical_columns: string[];
    statistical_summary: Record<string, Record<string, number | null>>;
    correlation_matrix: Record<string, Record<string, number | null>>;
  };
  cleaning_analysis: {
    missing_values: Record<string, number>;
    total_missing_values: number;
    duplicate_rows: number;
  };
  cleaning_summary: {
    original_rows: number;
    final_rows: number;
    duplicates_removed: number;
    numeric_missing_filled: number;
    categorical_missing_filled: number;
    imputation_details?: ImputationDetail[];
  };
  eda: {
    numeric_columns: string[];
    categorical_columns: string[];
    numerical_analysis: Record<string, Record<string, number | null>>;
    categorical_analysis: Record<string, Record<string, number>>;
    correlation: Record<string, Record<string, number | null>>;
  };
  sample_data?: Record<string, any>[];
  cleaned_csv?: string;
};

const CHART_COLORS = [
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#f97316", // orange
  "#84cc16", // lime
];

const navigation = [
  { id: "overview", name: "Overview", icon: "◫" },
  { id: "visualizations", name: "Charts & Visualizations", icon: "◔" },
  { id: "relations", name: "Row & Column Relations", icon: "☍" },
  { id: "cleaning", name: "Missing Values & Export", icon: "✓" },
  { id: "statistics", name: "Statistics Table", icon: "▥" },
];

export default function Home() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Interactive Chart Selectors
  const [selectedCatCol, setSelectedCatCol] = useState<string>("");
  const [selectedNumCol, setSelectedNumCol] = useState<string>("");
  const [scatterX, setScatterX] = useState<string>("");
  const [scatterY, setScatterY] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update default selectors when result changes
  useEffect(() => {
    if (result) {
      if (result.profile.categorical_columns.length > 0) {
        setSelectedCatCol(result.profile.categorical_columns[0]);
      }
      if (result.profile.numeric_columns.length > 0) {
        setSelectedNumCol(result.profile.numeric_columns[0]);
        setScatterX(result.profile.numeric_columns[0]);
        setScatterY(
          result.profile.numeric_columns[1] || result.profile.numeric_columns[0]
        );
      }
    }
  }, [result]);

  async function analyzeDataset() {
    if (!file) {
      setError("Please select a CSV or Excel file first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const apiHost =
        typeof window !== "undefined" && window.location.hostname
          ? window.location.hostname
          : "127.0.0.1";
      const response = await fetch(`http://${apiHost}:8000/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to analyze this file."
        );
      }

      setResult(data as AnalysisResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadCleanedCSV() {
    if (!result?.cleaned_csv) return;
    const blob = new Blob([result.cleaned_csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanFileName = result.filename
      ? `cleaned_${result.filename.replace(/\.[^/.]+$/, "")}.csv`
      : "cleaned_dataset.csv";
    link.setAttribute("download", cleanFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const profile = result?.profile;
  const missingCount = profile
    ? Object.values(profile.missing_values).reduce(
        (total, count) => total + count,
        0
      )
    : 0;

  // Pie chart data for selected categorical column
  const pieData =
    result && selectedCatCol && result.eda.categorical_analysis[selectedCatCol]
      ? Object.entries(result.eda.categorical_analysis[selectedCatCol]).map(
          ([name, value]) => ({
            name: String(name),
            value: Number(value),
          })
        )
      : [];

  // Line chart data for selected numeric column across sample rows
  const lineData =
    result && selectedNumCol && result.sample_data
      ? result.sample_data.slice(0, 50).map((row, idx) => ({
          row: `Row ${idx + 1}`,
          value:
            typeof row[selectedNumCol] === "number"
              ? Number(row[selectedNumCol])
              : 0,
        }))
      : [];

  // Missing values by column for Bar chart
  const missingBarData = profile
    ? Object.entries(profile.missing_values).map(([column, count]) => ({
        column: column.length > 14 ? column.slice(0, 12) + "…" : column,
        fullColumn: column,
        missing: count,
      }))
    : [];

  // Scatter plot data for Column X vs Column Y
  const scatterData =
    result && scatterX && scatterY && result.sample_data
      ? result.sample_data.slice(0, 100).map((row, idx) => ({
          index: idx + 1,
          x: typeof row[scatterX] === "number" ? Number(row[scatterX]) : 0,
          y: typeof row[scatterY] === "number" ? Number(row[scatterY]) : 0,
        }))
      : [];

  // Quality Donut Chart (Clean Cells vs Missing Cells)
  const totalCells = profile ? profile.total_rows * profile.total_columns : 0;
  const cleanCells = Math.max(0, totalCells - missingCount);
  const dataQualityPie = [
    { name: "Clean Cells", value: cleanCells, color: "#10b981" },
    { name: "Filled Missing Cells", value: missingCount, color: "#f59e0b" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800">
      {/* Sidebar Navigation */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-800 bg-[#111827] text-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-xl font-black text-slate-950">
            I
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">InsightFlow</h1>
            <p className="text-xs text-slate-400">Data intelligence platform</p>
          </div>
        </div>

        <div className="px-4 pt-8">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Navigation
          </p>

          <nav className="space-y-1.5">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  document
                    .getElementById(item.id)
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                  activeTab === item.id
                    ? "bg-cyan-400 font-semibold text-slate-950 shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        {result && (
          <div className="mx-4 mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
            <p className="text-xs font-semibold text-cyan-300">
              Cleaned CSV Ready
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {result.cleaning_summary.numeric_missing_filled +
                result.cleaning_summary.categorical_missing_filled}{" "}
              missing values imputed.
            </p>
            <button
              onClick={downloadCleanedCSV}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              <span>↓</span> Download Cleaned CSV
            </button>
          </div>
        )}

        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-xs font-semibold text-slate-200">
                Connected &amp; Ready
              </p>
            </div>
            <p className="text-xs leading-5 text-slate-400">
              FastAPI Analytics Engine on port 8000.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-h-screen lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur-md sm:px-8">
          <div>
            <p className="text-xs font-medium text-slate-500">
              WORKSPACE / ANALYTICS
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
              Data Analytics &amp; Visualizations Dashboard
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {result && (
              <button
                onClick={downloadCleanedCSV}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
              >
                <span>↓</span> Download Cleaned CSV
              </button>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">Analyst Workspace</p>
              <p className="text-xs text-slate-500">Local environment</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 font-bold text-cyan-300">
              IF
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-8 p-5 sm:p-8">
          {/* Hero Banner */}
          <section className="relative overflow-hidden rounded-3xl bg-[#0f172a] p-7 text-white sm:p-10">
            <div className="relative z-[1] max-w-2xl">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-cyan-400">
                Data Intelligence Platform
              </p>
              <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                Profile, Clean &amp; Visualize
                <span className="text-cyan-300"> Your Datasets Instantly.</span>
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                Upload CSV or Excel files. InsightFlow detects missing values,
                applies smart median/mode imputation, generates interactive
                charts, and lets you download the updated CSV.
              </p>
              <button
                onClick={() =>
                  document.getElementById("upload-box")?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                Upload &amp; Analyze Dataset <span>→</span>
              </button>
            </div>
            <div className="absolute -right-16 -top-24 h-80 w-80 rounded-full border border-cyan-300/20" />
            <div className="absolute -right-2 -top-12 h-60 w-60 rounded-full border border-cyan-300/20" />
            <div className="absolute -bottom-28 right-28 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          </section>

          {/* Upload Area */}
          <section
            id="upload-box"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
                  Step 1
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  Select Dataset
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Upload CSV or Excel file for automated cleaning, profiling,
                  and charting.
                </p>
              </div>
              {result && (
                <button
                  onClick={downloadCleanedCSV}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                >
                  <span>↓</span> Download Cleaned CSV
                </button>
              )}
            </div>

            <input
              ref={fileInput}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
                setError("");
                setResult(null);
              }}
            />

            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-cyan-500 hover:bg-cyan-50/40"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-2xl text-cyan-800">
                ↑
              </span>
              <span className="mt-4 font-semibold text-slate-800">
                {file ? file.name : "Choose a dataset to upload"}
              </span>
              <span className="mt-2 text-sm text-slate-500">
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB · Click to change file`
                  : "Click to browse CSV or Excel files from your device"}
              </span>
              <span className="mt-2 text-xs text-slate-400">
                Supported formats: CSV, XLSX
              </span>
            </button>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
              >
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Files are analyzed and cleaned securely by your local backend.
              </p>
              <button
                onClick={analyzeDataset}
                disabled={!file || loading}
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "Processing dataset..." : "Analyze & Clean Dataset →"}
              </button>
            </div>
          </section>

          {/* Overview Metrics Cards */}
          <section id="overview" className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Dataset Overview
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {result
                  ? `Summary statistics for ${result.filename}`
                  : "Metrics will appear once you upload and analyze a dataset."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Total Rows",
                  value: profile?.total_rows,
                  icon: "▤",
                  color: "bg-blue-50 text-blue-700",
                },
                {
                  label: "Total Columns",
                  value: profile?.total_columns,
                  icon: "▥",
                  color: "bg-violet-50 text-violet-700",
                },
                {
                  label: "Missing Values Detected",
                  value: missingCount,
                  icon: "◇",
                  color: "bg-amber-50 text-amber-700",
                },
                {
                  label: "Duplicate Rows",
                  value: profile?.duplicate_rows,
                  icon: "⧉",
                  color: "bg-rose-50 text-rose-700",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">
                      {card.label}
                    </p>
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${card.color}`}
                    >
                      {card.icon}
                    </span>
                  </div>
                  <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
                    {card.value === undefined || card.value === null
                      ? "—"
                      : card.value.toLocaleString()}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {result ? "Analyzed successfully" : "Awaiting dataset"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {result && (
            <>
              {/* SECTION: VISUALIZATIONS (PIE CHART, LINE CHART, BAR CHART) */}
              <section id="visualizations" className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Interactive Visualizations &amp; Charts
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Explore categorical distributions, numeric trendlines, and
                    data completeness.
                  </p>
                </div>

                {/* Grid for Pie Chart and Missing Values Bar Chart */}
                <div className="grid gap-6 xl:grid-cols-2">
                  {/* Categorical Distribution Pie / Donut Chart */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h4 className="font-bold text-slate-900">
                          Categorical Distribution (Pie Chart)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Frequency breakdown of top categories
                        </p>
                      </div>

                      {profile && profile.categorical_columns.length > 0 && (
                        <select
                          value={selectedCatCol}
                          onChange={(e) => setSelectedCatCol(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-500"
                        >
                          {profile.categorical_columns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="mt-6 h-72 w-full">
                      {mounted && pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={85}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    CHART_COLORS[index % CHART_COLORS.length]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: any) => [
                                `${Number(value).toLocaleString()} records`,
                                "Count",
                              ]}
                            />
                            <Legend
                              layout="horizontal"
                              verticalAlign="bottom"
                              align="center"
                              wrapperStyle={{
                                fontSize: "11px",
                                paddingTop: "12px",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                          No categorical data available for this column.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Missing Values by Column Bar Chart */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900">
                          Data Completeness (Missing Values Bar Chart)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Gaps detected across columns prior to automatic
                          cleaning
                        </p>
                      </div>
                      <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {missingCount} Total Missing
                      </span>
                    </div>

                    <div className="mt-6 h-72 w-full">
                      {mounted && missingBarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={missingBarData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis
                              dataKey="column"
                              tick={{ fontSize: 10 }}
                              angle={-25}
                              textAnchor="end"
                              height={50}
                            />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(val: any) => [
                                `${val} missing cells`,
                                "Missing",
                              ]}
                            />
                            <Bar
                              dataKey="missing"
                              fill="#f59e0b"
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center text-center text-sm text-emerald-600">
                          <span className="text-2xl">✓</span>
                          <span className="mt-2 font-semibold">
                            Zero missing values detected!
                          </span>
                          <span className="text-xs text-slate-400">
                            Your dataset is 100% complete.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Line Chart: Numeric Values Trend across Rows */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h4 className="font-bold text-slate-900">
                        Row-by-Row Numerical Trend (Line Chart)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Progression of values across the first 50 dataset
                        records
                      </p>
                    </div>

                    {profile && profile.numeric_columns.length > 0 && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-500">
                          Metric:
                        </label>
                        <select
                          value={selectedNumCol}
                          onChange={(e) => setSelectedNumCol(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-500"
                        >
                          {profile.numeric_columns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 h-80 w-full">
                    {mounted && lineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis
                            dataKey="row"
                            tick={{ fontSize: 10 }}
                            height={40}
                          />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(value: any) => [
                              Number(value).toLocaleString(),
                              selectedNumCol,
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#06b6d4"
                            strokeWidth={3}
                            dot={{ fill: "#06b6d4", r: 3 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        No numerical columns found to chart.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* SECTION: ROW & COLUMN RELATIONS (SCATTER PLOT & CORRELATION MATRIX) */}
              <section id="relations" className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Row &amp; Column Relations
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Explore correlations and cross-column interactions between
                    variables.
                  </p>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  {/* Interactive Scatter Plot (X vs Y Relation) */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h4 className="font-bold text-slate-900">
                          Bivariate Relationship (Scatter Plot)
                        </h4>
                        <p className="text-xs text-slate-500">
                          Plot Column X against Column Y to identify patterns
                        </p>
                      </div>

                      {profile && profile.numeric_columns.length >= 2 && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <label className="font-medium text-slate-500">X:</label>
                          <select
                            value={scatterX}
                            onChange={(e) => setScatterX(e.target.value)}
                            className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          >
                            {profile.numeric_columns.map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>

                          <label className="font-medium text-slate-500">Y:</label>
                          <select
                            value={scatterY}
                            onChange={(e) => setScatterY(e.target.value)}
                            className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          >
                            {profile.numeric_columns.map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 h-80 w-full">
                      {mounted && scatterData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis
                              type="number"
                              dataKey="x"
                              name={scatterX}
                              tick={{ fontSize: 10 }}
                            />
                            <YAxis
                              type="number"
                              dataKey="y"
                              name={scatterY}
                              tick={{ fontSize: 10 }}
                            />
                            <Tooltip
                              cursor={{ strokeDasharray: "3 3" }}
                              formatter={(value: any, name: any) => [
                                value,
                                name === "x" ? scatterX : scatterY,
                              ]}
                            />
                            <Scatter
                              name="Data Points"
                              data={scatterData}
                              fill="#8b5cf6"
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                          Need at least 2 numeric columns to generate a scatter
                          plot.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Correlation Matrix Grid */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h4 className="font-bold text-slate-900">
                      Correlation Matrix Heatmap
                    </h4>
                    <p className="text-xs text-slate-500">
                      Pearson correlation coefficients between numerical
                      features (-1.0 to +1.0)
                    </p>

                    {profile &&
                    Object.keys(profile.correlation_matrix).length > 0 ? (
                      <div className="mt-6 max-h-80 overflow-auto">
                        <table className="w-full text-center text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                              <th className="p-2 text-left font-semibold">
                                Column
                              </th>
                              {Object.keys(profile.correlation_matrix).map(
                                (col) => (
                                  <th
                                    key={col}
                                    className="p-2 font-semibold"
                                    title={col}
                                  >
                                    {col.length > 8
                                      ? col.slice(0, 7) + "…"
                                      : col}
                                  </th>
                                )
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(profile.correlation_matrix).map(
                              ([rowCol, cols]) => (
                                <tr
                                  key={rowCol}
                                  className="border-b border-slate-100 hover:bg-slate-50/50"
                                >
                                  <td className="p-2 text-left font-medium text-slate-800">
                                    {rowCol}
                                  </td>
                                  {Object.keys(profile.correlation_matrix).map(
                                    (targetCol) => {
                                      const val = cols[targetCol];
                                      let bgColor = "bg-slate-50 text-slate-600";
                                      if (val !== null && val !== undefined) {
                                        if (val >= 0.7)
                                          bgColor =
                                            "bg-emerald-100 font-bold text-emerald-800";
                                        else if (val >= 0.3)
                                          bgColor =
                                            "bg-cyan-100 text-cyan-800";
                                        else if (val <= -0.5)
                                          bgColor = "bg-rose-100 text-rose-800";
                                        else if (val <= -0.2)
                                          bgColor =
                                            "bg-amber-100 text-amber-800";
                                      }
                                      return (
                                        <td key={targetCol} className="p-1">
                                          <span
                                            className={`inline-block w-full rounded py-1 ${bgColor}`}
                                          >
                                            {typeof val === "number"
                                              ? val.toFixed(2)
                                              : "—"}
                                          </span>
                                        </td>
                                      );
                                    }
                                  )}
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
                        No numerical correlation available for this dataset.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* SECTION: MISSING VALUES IMPUTATION & CSV EXPORT */}
              <section id="cleaning" className="space-y-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Missing Values Imputation &amp; Cleaned CSV
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Our model automatically inspected and imputed all missing
                      values. You can download the updated CSV below.
                    </p>
                  </div>

                  <button
                    onClick={downloadCleanedCSV}
                    className="flex items-center gap-2 self-start rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-md transition hover:bg-cyan-400 sm:self-auto"
                  >
                    <span className="text-base">↓</span> Download Cleaned CSV
                  </button>
                </div>

                {/* Imputation Summary KPI Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">
                      Original Rows
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {result.cleaning_summary.original_rows.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">
                      Final Rows
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {result.cleaning_summary.final_rows.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">
                      Duplicates Removed
                    </p>
                    <p className="mt-2 text-2xl font-bold text-rose-600">
                      {result.cleaning_summary.duplicates_removed}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">
                      Numeric Imputed
                    </p>
                    <p className="mt-2 text-2xl font-bold text-emerald-600">
                      {result.cleaning_summary.numeric_missing_filled}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-slate-500">
                      Categorical Imputed
                    </p>
                    <p className="mt-2 text-2xl font-bold text-cyan-600">
                      {result.cleaning_summary.categorical_missing_filled}
                    </p>
                  </div>
                </div>

                {/* Detailed Imputation Report Table */}
                {result.cleaning_summary.imputation_details &&
                  result.cleaning_summary.imputation_details.length > 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h4 className="font-bold text-slate-900">
                        Column-by-Column Imputation Log
                      </h4>
                      <p className="text-xs text-slate-500">
                        Detailed breakdown of missing values detected and the
                        imputation strategy applied
                      </p>

                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
                            <tr>
                              <th className="p-3">Column</th>
                              <th className="p-3">Type</th>
                              <th className="p-3 text-right">Missing Count</th>
                              <th className="p-3">Strategy</th>
                              <th className="p-3">Imputed Value</th>
                              <th className="p-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.cleaning_summary.imputation_details.map(
                              (detail) => (
                                <tr
                                  key={detail.column}
                                  className="border-b border-slate-100 hover:bg-slate-50/60"
                                >
                                  <td className="p-3 font-semibold text-slate-800">
                                    {detail.column}
                                  </td>
                                  <td className="p-3">
                                    <span
                                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                                        detail.type === "numeric"
                                          ? "bg-blue-50 text-blue-700"
                                          : "bg-purple-50 text-purple-700"
                                      }`}
                                    >
                                      {detail.type}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right font-medium text-amber-600">
                                    {detail.missing_count}
                                  </td>
                                  <td className="p-3 text-slate-700">
                                    {detail.strategy}
                                  </td>
                                  <td className="p-3 font-mono text-xs text-slate-600">
                                    {detail.fill_value}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                      ✓ Imputed
                                    </span>
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center shadow-sm">
                      <span className="text-2xl font-bold text-emerald-600">✓</span>
                      <h4 className="mt-2 font-bold text-slate-900">
                        Dataset is 100% Complete
                      </h4>
                      <p className="mt-1 text-xs text-slate-600">
                        No missing cells were detected in any column. Your dataset
                        was verified and is ready for export.
                      </p>
                    </div>
                  )}

                {/* Cleaned Dataset Preview */}
                {result.sample_data && result.sample_data.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h4 className="font-bold text-slate-900">
                          Cleaned Dataset Preview
                        </h4>
                        <p className="text-xs text-slate-500">
                          First 10 records with all missing values filled
                        </p>
                      </div>
                      <button
                        onClick={downloadCleanedCSV}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <span>↓</span> Download Complete CSV
                      </button>
                    </div>

                    <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-slate-100 text-slate-700">
                          <tr>
                            <th className="p-2.5">#</th>
                            {result.columns.slice(0, 10).map((col) => (
                              <th
                                key={col}
                                className="whitespace-nowrap p-2.5 font-semibold"
                              >
                                {col}
                              </th>
                            ))}
                            {result.columns.length > 10 && (
                              <th className="p-2.5 font-semibold text-slate-400">
                                +{result.columns.length - 10} more cols
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {result.sample_data.slice(0, 10).map((row, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-slate-100 hover:bg-slate-50/50"
                            >
                              <td className="p-2.5 font-mono text-slate-400">
                                {idx + 1}
                              </td>
                              {result.columns.slice(0, 10).map((col) => (
                                <td
                                  key={col}
                                  className="whitespace-nowrap p-2.5 font-medium text-slate-700"
                                >
                                  {row[col] !== null && row[col] !== undefined
                                    ? String(row[col])
                                    : "—"}
                                </td>
                              ))}
                              {result.columns.length > 10 && (
                                <td className="p-2.5 text-slate-300">…</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>

              {/* SECTION: NUMERICAL STATISTICS TABLE */}
              <section
                id="statistics"
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="font-bold text-slate-900">
                  Descriptive Numerical Statistics
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Calculated across numerical features using Pandas.
                </p>
                {Object.keys(profile!.statistical_summary).length === 0 ? (
                  <p className="mt-5 text-sm text-slate-500">
                    No numerical columns were detected in this dataset.
                  </p>
                ) : (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="rounded-l-lg p-3">Column</th>
                          <th className="p-3">Mean</th>
                          <th className="p-3">Median</th>
                          <th className="p-3">Minimum</th>
                          <th className="p-3">Maximum</th>
                          <th className="rounded-r-lg p-3">Std. Dev.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(profile!.statistical_summary).map(
                          ([column, stats]) => (
                            <tr
                              key={column}
                              className="border-b border-slate-100"
                            >
                              <td className="p-3 font-semibold text-slate-800">
                                {column}
                              </td>
                              {[
                                stats.mean,
                                stats.median,
                                stats.minimum,
                                stats.maximum,
                                stats.standard_deviation,
                              ].map((value, index) => (
                                <td key={index} className="p-3 text-slate-600">
                                  {typeof value === "number"
                                    ? value.toLocaleString(undefined, {
                                        maximumFractionDigits: 2,
                                      })
                                    : "—"}
                                </td>
                              ))}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          <footer className="pb-4 pt-2 text-center text-xs text-slate-400">
            InsightFlow · Automated Data Analysis, Cleaning &amp; Insights
            Generation Platform
          </footer>
        </div>
      </main>
    </div>
  );
}
