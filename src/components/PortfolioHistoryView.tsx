import React, { useState, useEffect, useMemo, useRef } from "react";
import { PortfolioHistoryResponse } from "../types";
import { fetchPortfolioHistory, formatINR } from "../api";
import {
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Award,
} from "lucide-react";

interface PortfolioHistoryViewProps {
  isMasked?: boolean;
}

const TIMEFRAMES = ["1W", "1M", "3M", "6M", "1Y", "ALL"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

export const PortfolioHistoryView: React.FC<PortfolioHistoryViewProps> = ({
  isMasked = false,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [data, setData] = useState<PortfolioHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPortfolioHistory(timeframe)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
          setHoveredIndex(null);
        }
      })
      .catch((err) => {
        console.error("Error loading portfolio history:", err);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [timeframe]);

  const snapshots = data?.snapshots || [];

  // Chart coordinate calculations
  const { pathD, areaD, investedD, points } = useMemo(() => {
    if (snapshots.length < 2) {
      return { pathD: "", areaD: "", investedD: "", points: [] };
    }

    const curValues = snapshots.map((s) => s.total_current_value);
    const invValues = snapshots.map((s) => s.total_invested);
    const allVals = [...curValues, ...invValues];

    const min = Math.min(...allVals) * 0.98;
    const max = Math.max(...allVals) * 1.02;
    const range = max - min || 1;

    const width = 1000;
    const height = 320;
    const padding = 20;
    const innerH = height - padding * 2;

    const pts = snapshots.map((s, idx) => {
      const x = padding + (idx / (snapshots.length - 1)) * (width - padding * 2);
      const y = height - padding - ((s.total_current_value - min) / range) * innerH;
      const yInv = height - padding - ((s.total_invested - min) / range) * innerH;
      return { x, y, yInv, snapshot: s };
    });

    // Build SVG paths
    const lineCommands = pts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const areaCommands = `${lineCommands} L ${pts[pts.length - 1].x.toFixed(1)} ${height} L ${pts[0].x.toFixed(1)} ${height} Z`;

    const invCommands = pts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.yInv.toFixed(1)}`).join(" ");

    return {
      pathD: lineCommands,
      areaD: areaCommands,
      investedD: invCommands,
      points: pts,
    };
  }, [snapshots]);

  // Active point for tooltip (defaults to latest snapshot if not hovering)
  const activePoint =
    hoveredIndex !== null && points[hoveredIndex]
      ? points[hoveredIndex]
      : points[points.length - 1];

  const isPeriodPositive = (data?.period_change_value || 0) >= 0;
  const alphaVsNifty =
    data && data.nifty_benchmark_return_percent !== undefined
      ? data.period_change_percent - data.nifty_benchmark_return_percent
      : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Period Return */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {timeframe} Return
            </span>
            <div
              className={`p-2 rounded-xl border ${
                isPeriodPositive
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {isPeriodPositive ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-2">
            <div
              className={`text-2xl font-black tracking-tight ${
                isPeriodPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isPeriodPositive ? "+" : ""}
              {formatINR(data?.period_change_value || 0, isMasked)}
            </div>
            <div className="text-xs text-slate-300 font-semibold mt-1">
              {isPeriodPositive ? "+" : ""}
              {data?.period_change_percent.toFixed(2)}% in {timeframe}
            </div>
          </div>
        </div>

        {/* Card 2: Peak Valuation (ATH) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Period Peak (ATH)
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-300 tracking-tight">
              {formatINR(data?.all_time_high_value || 0, isMasked)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Reached on: {data?.all_time_high_date || "-"}
            </div>
          </div>
        </div>

        {/* Card 3: Period Low */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Period Low
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatINR(data?.all_time_low_value || 0, isMasked)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              On: {data?.all_time_low_date || "-"}
            </div>
          </div>
        </div>

        {/* Card 4: Benchmark Comparison (vs NIFTY 50) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              vs NIFTY 50 Index
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div
              className={`text-2xl font-black tracking-tight ${
                alphaVsNifty >= 0 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {alphaVsNifty >= 0 ? `+${alphaVsNifty.toFixed(2)}%` : `${alphaVsNifty.toFixed(2)}%`}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {alphaVsNifty >= 0 ? "Alpha Outperformance" : "Benchmark Underperformance"}
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Daily Net Worth Trajectory & Compounding Curve
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracks continuous daily closing portfolio valuation vs invested capital. Hover over curve for details.
            </p>
          </div>

          {/* Timeframe Selector Pills */}
          <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded-xl p-1 text-xs font-semibold shadow-inner">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === tf
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Floating / Active Data Pill */}
        {activePoint && (
          <div className="mb-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-white">{activePoint.snapshot.date}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Current Valuation:</span>
              <span className="font-bold text-white text-sm">
                {formatINR(activePoint.snapshot.total_current_value, isMasked)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Invested:</span>
                <span className="font-semibold text-slate-300">
                  {formatINR(activePoint.snapshot.total_invested, isMasked)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Unrealized P&L:</span>
                <span
                  className={`font-bold ${
                    activePoint.snapshot.total_pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {activePoint.snapshot.total_pnl >= 0 ? "+" : ""}
                  {formatINR(activePoint.snapshot.total_pnl, isMasked)} (
                  {activePoint.snapshot.total_pnl_percent.toFixed(2)}%)
                </span>
              </div>
              {activePoint.snapshot.nifty50_close && activePoint.snapshot.nifty50_close > 0 && (
                <div className="text-slate-400 hidden sm:inline">
                  Nifty: {Math.round(activePoint.snapshot.nifty50_close).toLocaleString("en-IN")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SVG Curve Chart */}
        <div
          ref={containerRef}
          className="relative w-full h-80 bg-slate-950/60 rounded-xl border border-slate-800/80 p-2 overflow-hidden select-none"
          onMouseLeave={() => setHoveredIndex(null)}
          onMouseMove={(e) => {
            if (!containerRef.current || points.length === 0) return;
            const rect = containerRef.current.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const normX = relX / rect.width;
            const closestIdx = Math.min(
              Math.max(Math.round(normX * (points.length - 1)), 0),
              points.length - 1
            );
            setHoveredIndex(closestIdx);
          }}
        >
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
              Loading trajectory...
            </div>
          ) : snapshots.length < 2 ? (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
              Not enough snapshots recorded yet. Daily snapshots are captured automatically.
            </div>
          ) : (
            <svg
              viewBox="0 0 1000 320"
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="60%" stopColor="#4f46e5" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="20" y1="80" x2="980" y2="80" stroke="#1e293b" strokeDasharray="4 4" />
              <line x1="20" y1="160" x2="980" y2="160" stroke="#1e293b" strokeDasharray="4 4" />
              <line x1="20" y1="240" x2="980" y2="240" stroke="#1e293b" strokeDasharray="4 4" />

              {/* Area Fill */}
              <path d={areaD} fill="url(#curveGradient)" />

              {/* Invested Baseline Curve (Dashed White/Slate) */}
              <path
                d={investedD}
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="5 5"
                opacity="0.7"
              />

              {/* Main Net Worth Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#818cf8"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Hover Cursor Vertical Line */}
              {hoveredIndex !== null && points[hoveredIndex] && (
                <g>
                  <line
                    x1={points[hoveredIndex].x}
                    y1="20"
                    x2={points[hoveredIndex].x}
                    y2="300"
                    stroke="#a5b4fc"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  {/* Current Value Circle */}
                  <circle
                    cx={points[hoveredIndex].x}
                    cy={points[hoveredIndex].y}
                    r="6"
                    fill="#6366f1"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  {/* Invested Value Circle */}
                  <circle
                    cx={points[hoveredIndex].x}
                    cy={points[hoveredIndex].yInv}
                    r="4.5"
                    fill="#64748b"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm" />
              <span>Portfolio Current Value</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-0.5 border-t-2 border-dashed border-slate-400" />
              <span>Invested Capital Baseline</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-500">
            {snapshots.length} daily sessions plotted
          </span>
        </div>
      </div>
    </div>
  );
};
