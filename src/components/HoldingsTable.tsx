import React, { useState, useMemo } from "react";
import { AggregatedHolding } from "../types";
import { formatINR, getSectorAbbr } from "../api";
import {
  Search,
  ArrowUpDown,
  BellPlus,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
} from "lucide-react";

interface HoldingsTableProps {
  holdings: AggregatedHolding[];
  onOpenAlertModal: (holding: AggregatedHolding) => void;
  isMasked?: boolean;
}

type SortField =
  | "tradingsymbol"
  | "current_value"
  | "pnl"
  | "pnl_percent"
  | "weight_percent"
  | "day_change_percent";

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  holdings,
  onOpenAlertModal,
  isMasked = false,
}) => {
  const [search, setSearch] = useState("");
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [sortField, setSortField] = useState<SortField>("current_value");
  const [sortAsc, setSortAsc] = useState(false);
  const [pnlViewMode, setPnlViewMode] = useState<"overall" | "daily">("overall");

  const sectors = useMemo(() => {
    const set = new Set<string>();
    holdings.forEach((h) => set.add(h.sector));
    return ["ALL", ...Array.from(set).sort()];
  }, [holdings]);

  const filtered = useMemo(() => {
    return holdings
      .filter((h) => {
        const matchesSearch =
          h.tradingsymbol.toLowerCase().includes(search.toLowerCase()) ||
          (h.company_name && h.company_name.toLowerCase().includes(search.toLowerCase())) ||
          h.isin.toLowerCase().includes(search.toLowerCase());
        const matchesSector =
          selectedSector === "ALL" || h.sector === selectedSector;
        return matchesSearch && matchesSector;
      })
      .sort((a, b) => {
        let valA: number | string = a[sortField];
        let valB: number | string = b[sortField];

        // Dynamic P&L values if daily mode is active
        if (sortField === "pnl" && pnlViewMode === "daily") {
          valA = a.total_quantity * a.day_change;
          valB = b.total_quantity * b.day_change;
        } else if (sortField === "pnl_percent" && pnlViewMode === "daily") {
          valA = a.day_change_percent;
          valB = b.day_change_percent;
        }

        if (typeof valA === "string") {
          return sortAsc
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        }
        return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      });
  }, [holdings, search, selectedSector, sortField, sortAsc, pnlViewMode]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header Controls */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white tracking-tight">
            Aggregated Holdings & Weights
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
            {filtered.length} Stocks
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto">
          {/* P&L View Toggle: Overall vs Daily */}
          <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded-xl p-0.5 text-xs font-semibold shadow-inner">
            <button
              type="button"
              onClick={() => setPnlViewMode("overall")}
              className={`px-3 py-1 rounded-lg transition-all ${
                pnlViewMode === "overall"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Overall P&L
            </button>
            <button
              type="button"
              onClick={() => setPnlViewMode("daily")}
              className={`px-3 py-1 rounded-lg transition-all ${
                pnlViewMode === "daily"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Daily P&L
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 md:w-60">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search symbol, ISIN, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Sector Filter */}
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {sectors.map((s) => (
              <option key={s} value={s} className="bg-slate-900 text-white">
                {s === "ALL" ? "All Sectors" : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-950/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th
                onClick={() => toggleSort("tradingsymbol")}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Stock & Details</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3">Broker Badge</th>
              <th className="py-3 px-3">Sector</th>
              <th className="py-3 px-3 text-right">Qty & Avg</th>
              <th className="py-3 px-3 text-right">LTP (₹)</th>
              <th
                onClick={() => toggleSort("current_value")}
                className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Current Value</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort("pnl")}
                className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{pnlViewMode === "overall" ? "Overall P&L" : "Daily P&L"}</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort("weight_percent")}
                className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Portfolio Weight</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-xs">
            {filtered.map((stock) => {
              const isDayUp = stock.day_change >= 0;
              const hasBothBrokers = stock.brokers.length > 1;

              return (
                <tr
                  key={stock.isin}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  {/* Stock Name & ISIN */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-white tracking-tight flex items-center gap-2">
                      <span>{stock.tradingsymbol}</span>
                      <span className="text-[10px] font-normal text-slate-500 font-mono">
                        {stock.exchange}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[200px]" title={stock.company_name}>
                      {stock.company_name || stock.tradingsymbol}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {stock.isin}
                    </div>
                  </td>

                  {/* Broker Badges (Abbreviated with Hover Details) */}
                  <td className="py-3 px-3">
                    {hasBothBrokers ? (
                      <div
                        className="inline-flex items-center gap-1 cursor-help"
                        title={`Zerodha Kite: ${stock.broker_quantities["zerodha"] || 0} shares | Angel One SmartAPI: ${stock.broker_quantities["angelone"] || 0} shares`}
                      >
                        <span className="px-1.5 py-0.5 rounded bg-orange-500/15 border border-orange-500/30 text-orange-300 font-bold font-mono text-[10px]">
                          ZER
                        </span>
                        <span className="text-slate-500 text-[10px]">+</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold font-mono text-[10px]">
                          ANG
                        </span>
                      </div>
                    ) : stock.brokers.includes("zerodha") ? (
                      <span
                        title={`Zerodha Kite Connect (${stock.total_quantity} shares)`}
                        className="inline-block px-1.5 py-0.5 rounded bg-orange-500/15 border border-orange-500/30 text-orange-300 font-bold font-mono text-[10px] cursor-help"
                      >
                        ZER
                      </span>
                    ) : (
                      <span
                        title={`Angel One SmartAPI (${stock.total_quantity} shares)`}
                        className="inline-block px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold font-mono text-[10px] cursor-help"
                      >
                        ANG
                      </span>
                    )}
                    {hasBothBrokers && (
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Z: {stock.broker_quantities["zerodha"] || 0} | A: {stock.broker_quantities["angelone"] || 0}
                      </div>
                    )}
                  </td>

                  {/* Sector (Abbreviated with Hover Details) */}
                  <td className="py-3 px-3">
                    <span
                      title={`Sector: ${stock.sector}`}
                      className="inline-block px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700/80 text-slate-300 font-bold font-mono text-[10px] tracking-wide cursor-help hover:border-slate-500 hover:text-white transition-colors"
                    >
                      {getSectorAbbr(stock.sector)}
                    </span>
                  </td>

                  {/* Qty & Avg Price */}
                  <td className="py-3 px-3 text-right">
                    <div className="font-semibold text-white">
                      <span className="text-[11px] font-normal text-slate-400 mr-1">Qty:</span>
                      {stock.total_quantity.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Avg: {formatINR(stock.average_price, isMasked)}
                    </div>
                  </td>

                  {/* LTP (Always visible even when masked) */}
                  <td className="py-3 px-3 text-right">
                    <div className="font-semibold text-white">
                      {formatINR(stock.last_price)}
                    </div>
                    <div
                      className={`flex items-center justify-end text-[11px] font-semibold ${
                        isDayUp ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isDayUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {isDayUp ? "+" : ""}
                      {stock.day_change_percent.toFixed(2)}%
                    </div>
                  </td>

                  {/* Current Value */}
                  <td className="py-3 px-4 text-right">
                    <div className="font-bold text-white">
                      {formatINR(stock.current_value, isMasked)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Inv: {formatINR(stock.invested_value, isMasked)}
                    </div>
                  </td>

                  {/* P&L (Dynamic Overall vs Daily) */}
                  <td className="py-3 px-4 text-right">
                    {(() => {
                      const isDaily = pnlViewMode === "daily";
                      const pnlVal = isDaily ? (stock.total_quantity * stock.day_change) : stock.pnl;
                      const pnlPct = isDaily ? stock.day_change_percent : stock.pnl_percent;
                      const isPnlPositive = pnlVal >= 0;

                      return (
                        <>
                          <div
                            className={`font-bold ${
                              isPnlPositive ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {isPnlPositive ? "+" : ""}
                            {formatINR(pnlVal, isMasked)}
                          </div>
                          <div
                            className={`text-[11px] font-semibold flex items-center justify-end gap-1 ${
                              isPnlPositive ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            <span>
                              {isPnlPositive ? "+" : ""}
                              {pnlPct.toFixed(2)}%
                            </span>
                            <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                              {isDaily ? "Day" : "Total"}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </td>

                  {/* Portfolio Weight */}
                  <td className="py-3 px-4 text-right">
                    <div className="font-bold text-white">
                      {stock.weight_percent.toFixed(2)}%
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-24 ml-auto mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        style={{ width: `${Math.min(stock.weight_percent * 4, 100)}%` }}
                      />
                    </div>
                  </td>

                  {/* Quick Action: Create Alert */}
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => onOpenAlertModal(stock)}
                      title={`Create Alert for ${stock.tradingsymbol}`}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-300 border border-slate-700/60 hover:border-indigo-500/40 transition-colors"
                    >
                      <BellPlus className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

