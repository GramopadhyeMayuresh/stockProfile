import React from "react";
import { SectorAllocation } from "../types";
import { formatINR } from "../api";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PieChart, TrendingUp, TrendingDown, Layers } from "lucide-react";

interface SectorAllocationViewProps {
  sectors: SectorAllocation[];
  totalPortfolioValue: number;
}

const SECTOR_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#f97316", // Orange
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#84cc16", // Lime
  "#a855f7", // Violet
  "#64748b", // Slate
];

export const SectorAllocationView: React.FC<SectorAllocationViewProps> = ({
  sectors,
  totalPortfolioValue,
}) => {
  const chartData = sectors.map((s) => ({
    name: s.sector,
    value: s.current_value,
    weight: s.weight_percent,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Donut Chart Card */}
      <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Sector Allocation Breakdown
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Interactive distribution across Indian equity market sectors
          </p>
        </div>

        {/* Donut Graphic */}
        <div className="h-64 my-4 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie
                data={chartData}
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={SECTOR_COLORS[index % SECTOR_COLORS.length]}
                    stroke="rgba(15, 23, 42, 0.8)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-xl text-xs">
                        <div className="font-bold text-white mb-1">{data.name}</div>
                        <div className="text-indigo-400 font-semibold">
                          {formatINR(data.value)} ({data.weight.toFixed(1)}%)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RechartsPie>
          </ResponsiveContainer>
          {/* Donut Center text */}
          <div className="absolute text-center pointer-events-none">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Value
            </div>
            <div className="text-sm font-bold text-white">
              {formatINR(totalPortfolioValue)}
            </div>
          </div>
        </div>

        {/* Mini Legend */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          {sectors.slice(0, 6).map((s, idx) => (
            <div key={s.sector} className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }}
              />
              <span className="truncate max-w-[110px]">{s.sector}</span>
              <span className="font-bold text-white">{s.weight_percent.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Sector List & Progress Bars */}
      <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Sector Weights & Performance
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {sectors.length} Sectors Active
          </span>
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {sectors.map((s, idx) => {
            const isProfit = s.pnl >= 0;
            const color = SECTOR_COLORS[idx % SECTOR_COLORS.length];

            return (
              <div
                key={s.sector}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-md"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-bold text-sm text-white">{s.sector}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                      {s.stock_count} {s.stock_count === 1 ? "stock" : "stocks"}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-sm text-white">
                      {formatINR(s.current_value)}
                    </span>
                    <span className="ml-2 font-bold text-xs text-indigo-400">
                      ({s.weight_percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(s.weight_percent, 100)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>

                {/* Sector Stats footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Invested: {formatINR(s.invested_value)}</span>
                  <div className="flex items-center gap-1 font-semibold">
                    <span>Return:</span>
                    <span
                      className={`flex items-center ${
                        isProfit ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isProfit ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                      {isProfit ? "+" : ""}
                      {formatINR(s.pnl)} ({isProfit ? "+" : ""}
                      {s.pnl_percent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

