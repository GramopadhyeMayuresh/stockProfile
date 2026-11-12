import React, { useState, useMemo } from "react";
import { DividendSummary } from "../types";
import { formatINR } from "../api";
import {
  Coins,
  Calendar,
  TrendingUp,
  RefreshCw,
  Search,
  ArrowUpDown,
  CalendarClock,
  Sparkles,
  Layers,
} from "lucide-react";

interface DividendCashflowViewProps {
  dividendData: DividendSummary | null;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  isMasked?: boolean;
}

type SortField =
  | "annual_cashflow"
  | "dividend_yield"
  | "yield_on_cost"
  | "dividend_rate"
  | "tradingsymbol";

export const DividendCashflowView: React.FC<DividendCashflowViewProps> = ({
  dividendData,
  onRefresh,
  isRefreshing,
  isMasked = false,
}) => {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("annual_cashflow");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Filter & sort stocks
  const filteredStocks = useMemo(() => {
    if (!dividendData) return [];

    return dividendData.stocks
      .filter((s) => {
        const matchesSearch =
          s.tradingsymbol.toLowerCase().includes(search.toLowerCase()) ||
          (s.company_name && s.company_name.toLowerCase().includes(search.toLowerCase())) ||
          s.isin.toLowerCase().includes(search.toLowerCase());

        // If a month bar is selected, filter by stocks that pay in that month
        if (selectedMonth !== null) {
          const monthInfo = dividendData.monthly_cashflow.find(
            (m) => m.month_index === selectedMonth
          );
          if (monthInfo && !monthInfo.stocks.includes(s.tradingsymbol)) {
            return false;
          }
        }

        return matchesSearch;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === "string") {
          return sortAsc
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        }
        return sortAsc
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      });
  }, [dividendData, search, sortField, sortAsc, selectedMonth]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  if (!dividendData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 animate-pulse">
          <Coins className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Loading Dividend & Cashflow Data...</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Analyzing corporate dividend history, yield-on-cost, and projected cashflow from your holdings.
        </p>
      </div>
    );
  }

  // Find max monthly cashflow to scale the chart bars
  const maxMonthly = Math.max(
    ...dividendData.monthly_cashflow.map((m) => m.projected_amount),
    100
  );

  const currentMonthIdx = new Date().getMonth() + 1; // 1-12

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Annual Cashflow */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Projected Annual Dividend
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white tracking-tight">
              {formatINR(dividendData.total_annual_cashflow, isMasked)}
            </div>
            <div className="text-xs text-emerald-400/90 font-medium mt-1 flex items-center gap-1">
              <span>{formatINR(dividendData.average_monthly_cashflow, isMasked)} / month</span>
            </div>
          </div>
        </div>

        {/* Card 2: Portfolio Dividend Yield */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Portfolio Dividend Yield
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white tracking-tight">
              {dividendData.portfolio_dividend_yield.toFixed(2)}%
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span>Based on current market value</span>
            </div>
          </div>
        </div>

        {/* Card 3: Yield on Cost (YoC) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Yield on Cost (YoC)
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-amber-300 tracking-tight">
              {dividendData.portfolio_yield_on_cost.toFixed(2)}%
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span>Return on your actual invested capital</span>
            </div>
          </div>
        </div>

        {/* Card 4: Dividend Coverage */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Dividend Payers
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-white tracking-tight">
              {dividendData.dividend_paying_stocks_count} / {dividendData.total_stocks_count}
            </div>
            <div className="text-xs text-blue-400/90 font-medium mt-1">
              {dividendData.total_stocks_count > 0
                ? `${Math.round(
                    (dividendData.dividend_paying_stocks_count /
                      dividendData.total_stocks_count) *
                      100
                  )}% of your portfolio`
                : "No holdings"}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Cashflow Calendar Bar Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Projected Monthly Cashflow Calendar (Jan – Dec)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Estimated distribution based on corporate announcement history & interim payout cycles. Click a month to filter stocks.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {selectedMonth !== null && (
              <button
                type="button"
                onClick={() => setSelectedMonth(null)}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              >
                Reset Filter
              </button>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isRefreshing
                  ? "bg-slate-800 text-slate-500 border-slate-700"
                  : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-indigo-400 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span>{isRefreshing ? "Refreshing..." : "Refresh Dividend Data"}</span>
            </button>
          </div>
        </div>

        {/* 12-Month Bar Chart */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-4 pb-2 items-end min-h-[170px]">
          {dividendData.monthly_cashflow.map((m) => {
            const heightPercent = Math.max((m.projected_amount / maxMonthly) * 100, 4);
            const isSelected = selectedMonth === m.month_index;
            const isCurrent = currentMonthIdx === m.month_index;

            return (
              <div
                key={m.month_index}
                onClick={() =>
                  setSelectedMonth((prev) => (prev === m.month_index ? null : m.month_index))
                }
                className={`flex flex-col items-center cursor-pointer group p-1.5 rounded-xl transition-all ${
                  isSelected
                    ? "bg-indigo-600/20 border border-indigo-500/50 shadow-md"
                    : "hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                {/* Projected Amount Label on top of bar */}
                <div className="text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors mb-2 text-center truncate w-full">
                  {m.projected_amount > 0 ? (
                    isMasked ? (
                      "₹ •••"
                    ) : (
                      `₹${Math.round(m.projected_amount).toLocaleString("en-IN")}`
                    )
                  ) : (
                    <span className="text-slate-600">-</span>
                  )}
                </div>

                {/* Vertical Bar */}
                <div className="w-full bg-slate-950/80 rounded-t-lg h-24 flex items-end p-0.5">
                  <div
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      m.projected_amount > 0
                        ? isSelected
                          ? "bg-gradient-to-t from-indigo-600 to-cyan-400"
                          : isCurrent
                          ? "bg-gradient-to-t from-emerald-600 to-teal-400 shadow-sm shadow-emerald-500/20"
                          : "bg-gradient-to-t from-indigo-700/80 to-indigo-500/80 group-hover:from-indigo-600 group-hover:to-indigo-400"
                        : "bg-slate-800/40"
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Month Name & Indicator */}
                <div className="mt-2 text-center">
                  <div
                    className={`text-xs font-bold ${
                      isSelected
                        ? "text-indigo-400"
                        : isCurrent
                        ? "text-emerald-400"
                        : "text-slate-300"
                    }`}
                  >
                    {m.month}
                  </div>
                  {isCurrent && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                      Current
                    </span>
                  )}
                  {m.stocks.length > 0 && !isCurrent && (
                    <span className="text-[9px] text-slate-500 font-mono">
                      {m.stocks.length} {m.stocks.length === 1 ? "stock" : "stocks"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Month Details Pill */}
        {selectedMonth !== null && (
          <div className="mt-4 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-indigo-400" />
              <span>
                Showing stocks projected for{" "}
                <strong>
                  {
                    dividendData.monthly_cashflow.find((m) => m.month_index === selectedMonth)
                      ?.month_name
                  }
                </strong>{" "}
                ({formatINR(
                  dividendData.monthly_cashflow.find((m) => m.month_index === selectedMonth)
                    ?.projected_amount || 0,
                  isMasked
                )} total)
              </span>
            </div>
            <button
              onClick={() => setSelectedMonth(null)}
              className="text-xs font-semibold underline hover:text-white"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* Upcoming / Recent Ex-Dividend Dates Timeline */}
      {dividendData.upcoming_events && dividendData.upcoming_events.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Upcoming & Recent Ex-Dividend Dates
              </h3>
              <p className="text-xs text-slate-400">
                You must hold shares before the Ex-Date to be eligible for payout credit.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dividendData.upcoming_events.slice(0, 6).map((ev) => (
              <div
                key={ev.tradingsymbol + ev.ex_dividend_date}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{ev.tradingsymbol}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20">
                      {ev.dividend_yield.toFixed(1)}% Yield
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[180px] mt-0.5">
                    {ev.company_name}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ex-Date: <strong>{ev.ex_dividend_date}</strong></span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-semibold text-emerald-400">
                    ₹{ev.dividend_rate.toFixed(2)} / sh
                  </div>
                  <div className="text-xs font-bold text-white mt-1">
                    {formatINR(ev.estimated_payout, isMasked)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    on {ev.total_quantity} shares
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Breakdown Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Holdings Dividend Breakdown & Yield-on-Cost
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
              {filteredStocks.length} Stocks
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search symbol, ISIN, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th
                  onClick={() => toggleSort("tradingsymbol")}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Stock & Company</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Shares & Buy Avg</th>
                <th
                  onClick={() => toggleSort("dividend_rate")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Div / Share (₹)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("dividend_yield")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Current Yield</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("yield_on_cost")}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                  title="Annual dividend divided by your weighted purchase price"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Yield on Cost</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("annual_cashflow")}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Annual Cashflow</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Recent Payout History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {filteredStocks.map((stock) => {
                const totalCashflow = dividendData.total_annual_cashflow;
                const shareOfDividends =
                  totalCashflow > 0 ? (stock.annual_cashflow / totalCashflow) * 100 : 0;

                return (
                  <tr
                    key={stock.isin}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Stock & Company */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{stock.tradingsymbol}</span>
                        {stock.annual_cashflow > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                            Payer
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {stock.company_name || stock.tradingsymbol}
                      </div>
                    </td>

                    {/* Shares & Buy Avg */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-semibold text-slate-200">
                        {stock.total_quantity} shares
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Avg: ₹{stock.average_price.toFixed(2)}
                      </div>
                    </td>

                    {/* Dividend Rate (₹ / share) */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-white">
                        {stock.dividend_rate > 0 ? `₹${stock.dividend_rate.toFixed(2)}` : "-"}
                      </div>
                      {stock.ex_dividend_date && (
                        <div className="text-[10px] text-slate-500">
                          Ex: {stock.ex_dividend_date}
                        </div>
                      )}
                    </td>

                    {/* Current Yield */}
                    <td className="py-3 px-3 text-right font-medium">
                      {stock.dividend_yield > 0 ? (
                        <span className="text-indigo-400">
                          {stock.dividend_yield.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Yield on Cost */}
                    <td className="py-3 px-3 text-right font-bold">
                      {stock.yield_on_cost > 0 ? (
                        <span
                          className={
                            stock.yield_on_cost > 3
                              ? "text-amber-300"
                              : stock.yield_on_cost > 1.5
                              ? "text-emerald-400"
                              : "text-slate-300"
                          }
                        >
                          {stock.yield_on_cost.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Annual Cashflow */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-emerald-400">
                        {formatINR(stock.annual_cashflow, isMasked)}
                      </div>
                      {/* Visual progress bar of dividend share */}
                      {stock.annual_cashflow > 0 && (
                        <div className="w-20 ml-auto mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(shareOfDividends * 2, 100)}%` }}
                          />
                        </div>
                      )}
                    </td>

                    {/* Recent Payout History */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {stock.recent_payouts && stock.recent_payouts.length > 0 ? (
                          stock.recent_payouts.slice(-3).map((p, idx) => (
                            <span
                              key={idx}
                              title={`Paid ₹${p.amount} on ${p.date}`}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono"
                            >
                              {p.date.slice(0, 7)}: ₹{p.amount}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-600 italic">
                            No recent payouts
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
