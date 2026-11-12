import React from "react";
import { PortfolioSummary } from "../types";
import { formatINR } from "../api";
import {
  Wallet,
  Coins,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface KPICardsProps {
  summary: PortfolioSummary | null;
}

export const KPICards: React.FC<KPICardsProps> = ({ summary }) => {
  if (!summary) return null;

  const isTotalProfit = summary.total_pnl >= 0;
  const isDayProfit = summary.day_pnl >= 0;

  const topGainer = summary.top_gainers?.[0];
  const topLoser = summary.top_losers?.[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Current Value */}
      <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Current Portfolio Value</span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight text-white">
          {formatINR(summary.total_current_value)}
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium">
          <span
            className={`flex items-center font-semibold ${
              isDayProfit ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isDayProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {isDayProfit ? "+" : ""}
            {formatINR(summary.day_pnl)} ({isDayProfit ? "+" : ""}
            {summary.day_pnl_percent.toFixed(2)}%)
          </span>
          <span className="text-slate-500 text-[11px]">Today</span>
        </div>
      </div>

      {/* 2. Total Invested */}
      <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Invested</span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight text-white">
          {formatINR(summary.total_invested)}
        </div>
        <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-200">{summary.stock_count}</span> stocks held across{" "}
          <span className="font-semibold text-slate-200">{summary.sector_count}</span> sectors
        </div>
      </div>

      {/* 3. Total Overall P&L */}
      <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Overall Return (P&L)</span>
          <div
            className={`p-2 rounded-xl border ${
              isTotalProfit
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}
          >
            {isTotalProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        </div>
        <div
          className={`text-2xl font-bold tracking-tight ${
            isTotalProfit ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {isTotalProfit ? "+" : ""}
          {formatINR(summary.total_pnl)}
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              isTotalProfit
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
            }`}
          >
            {isTotalProfit ? "+" : ""}
            {summary.total_pnl_percent.toFixed(2)}% Total Gain
          </span>
        </div>
      </div>

      {/* 4. Top Gainer */}
      <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Top Gainer</span>
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        {topGainer ? (
          <>
            <div className="text-lg font-bold text-white flex items-center justify-between">
              <span>{topGainer.tradingsymbol}</span>
              <span className="text-sm font-semibold text-slate-300">{formatINR(topGainer.last_price)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-400">+{topGainer.pnl_percent.toFixed(2)}%</span>
              <span className="text-slate-400">+{formatINR(topGainer.pnl)}</span>
            </div>
          </>
        ) : (
          <div className="text-xs text-slate-500 mt-2">No gainers yet</div>
        )}
      </div>

      {/* 5. Top Loser */}
      <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Top Laggard</span>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>
        {topLoser ? (
          <>
            <div className="text-lg font-bold text-white flex items-center justify-between">
              <span>{topLoser.tradingsymbol}</span>
              <span className="text-sm font-semibold text-slate-300">{formatINR(topLoser.last_price)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-semibold">
              <span className="text-rose-400">{topLoser.pnl_percent.toFixed(2)}%</span>
              <span className="text-slate-400">{formatINR(topLoser.pnl)}</span>
            </div>
          </>
        ) : (
          <div className="text-xs text-slate-500 mt-2">All holdings positive! 🎉</div>
        )}
      </div>
    </div>
  );
};
