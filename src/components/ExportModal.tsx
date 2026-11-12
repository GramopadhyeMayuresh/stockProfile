import React, { useState, useEffect } from "react";
import { AggregatedHolding } from "../types";
import { getSectorAbbr } from "../api";
import {
  X,
  FileSpreadsheet,
  Download,
  CheckSquare,
  Square,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export interface ExportField {
  id: string;
  label: string;
  category: "Stock Identity" | "Broker & Quantities" | "Valuation & Cost" | "Returns & Performance";
  description: string;
  getValue: (h: AggregatedHolding) => string | number;
  getTotal?: (holdings: AggregatedHolding[]) => string | number;
}

export const EXPORT_FIELDS: ExportField[] = [
  // 1. Stock Identity
  {
    id: "tradingsymbol",
    label: "Trading Symbol",
    category: "Stock Identity",
    description: "Stock ticker (e.g. INFY, ITC)",
    getValue: (h) => h.tradingsymbol,
    getTotal: () => "TOTAL",
  },
  {
    id: "company_name",
    label: "Company Name",
    category: "Stock Identity",
    description: "Full registered corporate name",
    getValue: (h) => h.company_name || h.tradingsymbol,
    getTotal: () => "",
  },
  {
    id: "isin",
    label: "ISIN",
    category: "Stock Identity",
    description: "12-character security identifier",
    getValue: (h) => h.isin,
    getTotal: () => "",
  },
  {
    id: "exchange",
    label: "Exchange",
    category: "Stock Identity",
    description: "Listing exchange (NSE / BSE)",
    getValue: (h) => h.exchange,
    getTotal: () => "",
  },
  {
    id: "sector",
    label: "Sector",
    category: "Stock Identity",
    description: "Industry classification (e.g. FMCG)",
    getValue: (h) => h.sector,
    getTotal: () => "",
  },
  {
    id: "sector_code",
    label: "Sector Code",
    category: "Stock Identity",
    description: "Short abbreviation (e.g. FMCG, IT, FIN)",
    getValue: (h) => getSectorAbbr(h.sector),
    getTotal: () => "",
  },

  // 2. Broker & Quantities
  {
    id: "brokers",
    label: "Brokers",
    category: "Broker & Quantities",
    description: "Connected brokers holding this stock",
    getValue: (h) =>
      h.brokers.map((b) => (b === "zerodha" ? "Zerodha" : "Angel One")).join(" + "),
    getTotal: () => "",
  },
  {
    id: "zerodha_qty",
    label: "Zerodha Qty",
    category: "Broker & Quantities",
    description: "Shares in Zerodha Kite account",
    getValue: (h) => h.broker_quantities["zerodha"] || 0,
    getTotal: (holdings) =>
      holdings.reduce((sum, h) => sum + (h.broker_quantities["zerodha"] || 0), 0),
  },
  {
    id: "angelone_qty",
    label: "Angel One Qty",
    category: "Broker & Quantities",
    description: "Shares in Angel One account",
    getValue: (h) => h.broker_quantities["angelone"] || 0,
    getTotal: (holdings) =>
      holdings.reduce((sum, h) => sum + (h.broker_quantities["angelone"] || 0), 0),
  },
  {
    id: "total_quantity",
    label: "Total Quantity",
    category: "Broker & Quantities",
    description: "Combined share count across brokers",
    getValue: (h) => h.total_quantity,
    getTotal: (holdings) => holdings.reduce((sum, h) => sum + h.total_quantity, 0),
  },

  // 3. Valuation & Cost
  {
    id: "average_price",
    label: "Weighted Avg Price (₹)",
    category: "Valuation & Cost",
    description: "Blended buy price per share",
    getValue: (h) => h.average_price.toFixed(2),
    getTotal: () => "",
  },
  {
    id: "last_price",
    label: "LTP (₹)",
    category: "Valuation & Cost",
    description: "Last traded market price",
    getValue: (h) => h.last_price.toFixed(2),
    getTotal: () => "",
  },
  {
    id: "invested_value",
    label: "Invested Value (₹)",
    category: "Valuation & Cost",
    description: "Total acquisition cost (Qty × Avg Price)",
    getValue: (h) => h.invested_value.toFixed(2),
    getTotal: (holdings) =>
      holdings.reduce((sum, h) => sum + h.invested_value, 0).toFixed(2),
  },
  {
    id: "current_value",
    label: "Current Value (₹)",
    category: "Valuation & Cost",
    description: "Market valuation (Qty × LTP)",
    getValue: (h) => h.current_value.toFixed(2),
    getTotal: (holdings) =>
      holdings.reduce((sum, h) => sum + h.current_value, 0).toFixed(2),
  },

  // 4. Returns & Performance
  {
    id: "pnl",
    label: "Unrealized P&L (₹)",
    category: "Returns & Performance",
    description: "Absolute profit or loss",
    getValue: (h) => h.pnl.toFixed(2),
    getTotal: (holdings) => {
      const inv = holdings.reduce((sum, h) => sum + h.invested_value, 0);
      const cur = holdings.reduce((sum, h) => sum + h.current_value, 0);
      return (cur - inv).toFixed(2);
    },
  },
  {
    id: "pnl_percent",
    label: "Overall Return (%)",
    category: "Returns & Performance",
    description: "Percentage gain or loss since purchase",
    getValue: (h) => `${h.pnl_percent.toFixed(2)}%`,
    getTotal: (holdings) => {
      const inv = holdings.reduce((sum, h) => sum + h.invested_value, 0);
      const cur = holdings.reduce((sum, h) => sum + h.current_value, 0);
      const pct = inv > 0 ? ((cur - inv) / inv) * 100 : 0;
      return `${pct.toFixed(2)}%`;
    },
  },
  {
    id: "day_pnl",
    label: "Today's P&L (₹)",
    category: "Returns & Performance",
    description: "Intraday rupee gain or loss",
    getValue: (h) => (h.total_quantity * h.day_change).toFixed(2),
    getTotal: (holdings) =>
      holdings
        .reduce((sum, h) => sum + h.total_quantity * h.day_change, 0)
        .toFixed(2),
  },
  {
    id: "day_change_percent",
    label: "Today's Change (%)",
    category: "Returns & Performance",
    description: "Intraday percentage move",
    getValue: (h) => `${h.day_change_percent.toFixed(2)}%`,
    getTotal: () => "",
  },
  {
    id: "weight_percent",
    label: "Portfolio Weight (%)",
    category: "Returns & Performance",
    description: "Share of current overall portfolio",
    getValue: (h) => `${h.weight_percent.toFixed(2)}%`,
    getTotal: () => "100.00%",
  },
];

const ALL_FIELD_IDS = EXPORT_FIELDS.map((f) => f.id);

const PRESETS: { name: string; description: string; fields: string[] }[] = [
  {
    name: "All Fields",
    description: "Complete dataset (19 columns)",
    fields: ALL_FIELD_IDS,
  },
  {
    name: "Tax & CA Audit",
    description: "Essential for capital gains & tax computation",
    fields: [
      "tradingsymbol",
      "company_name",
      "isin",
      "exchange",
      "total_quantity",
      "average_price",
      "last_price",
      "invested_value",
      "current_value",
      "pnl",
      "pnl_percent",
    ],
  },
  {
    name: "Multi-Broker",
    description: "Focus on share split across Zerodha & Angel One",
    fields: [
      "tradingsymbol",
      "isin",
      "brokers",
      "zerodha_qty",
      "angelone_qty",
      "total_quantity",
      "last_price",
      "current_value",
    ],
  },
  {
    name: "Performance",
    description: "Daily and overall returns breakdown",
    fields: [
      "tradingsymbol",
      "sector",
      "total_quantity",
      "invested_value",
      "current_value",
      "pnl",
      "pnl_percent",
      "day_pnl",
      "day_change_percent",
      "weight_percent",
    ],
  },
];

const CATEGORIES = [
  "Stock Identity",
  "Broker & Quantities",
  "Valuation & Cost",
  "Returns & Performance",
] as const;

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  holdings: AggregatedHolding[];
  onExportSuccess?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  holdings,
  onExportSuccess,
}) => {
  // Load saved preferences from localStorage or default to all
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("stockprofile_export_columns");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((id) => ALL_FIELD_IDS.includes(id));
        }
      }
    } catch {
      // ignore
    }
    return ALL_FIELD_IDS;
  });

  const [includeTotals, setIncludeTotals] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("stockprofile_export_include_totals");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("stockprofile_export_columns", JSON.stringify(selectedIds));
      localStorage.setItem("stockprofile_export_include_totals", JSON.stringify(includeTotals));
    } catch {
      // ignore
    }
  }, [selectedIds, includeTotals]);

  const toggleField = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleCategory = (category: string) => {
    const categoryFieldIds = EXPORT_FIELDS.filter((f) => f.category === category).map(
      (f) => f.id
    );
    const allSelected = categoryFieldIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !categoryFieldIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...categoryFieldIds])));
    }
  };

  const applyPreset = (fields: string[]) => {
    setSelectedIds(fields);
  };

  const handleDownload = () => {
    if (selectedIds.length === 0) return;

    // Filter fields in original canonical order matching selection
    const activeFields = EXPORT_FIELDS.filter((f) => selectedIds.includes(f.id));

    const headers = activeFields.map((f) => f.label);

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = holdings.map((h) => {
      return activeFields
        .map((f) => {
          const val = f.getValue(h);
          if (typeof val === "string" && val.endsWith("%")) {
            return `"${val}"`;
          }
          return escapeCSV(val);
        })
        .join(",");
    });

    let csvContent = "";
    if (includeTotals && holdings.length > 0) {
      const totalRow = activeFields
        .map((f) => {
          const totalVal = f.getTotal ? f.getTotal(holdings) : "";
          if (typeof totalVal === "string" && totalVal.endsWith("%")) {
            return `"${totalVal}"`;
          }
          return escapeCSV(totalVal);
        })
        .join(",");
      csvContent = "\uFEFF" + [headers.join(","), ...rows, "", totalRow].join("\r\n");
    } else {
      csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `StockProfile_Portfolio_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onClose();
    if (onExportSuccess) {
      onExportSuccess();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Customize CSV / Excel Export
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                  {holdings.length} stocks
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Select the columns you want in your file. Your selection is remembered.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold mr-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Presets:</span>
          </div>
          {PRESETS.map((p) => {
            const isMatch =
              p.fields.length === selectedIds.length &&
              p.fields.every((f) => selectedIds.includes(f));
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p.fields)}
                title={p.description}
                className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  isMatch
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                    : "bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {p.name}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="px-2 py-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors ml-auto flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>

        {/* Fields List (Scrollable) */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 divide-y divide-slate-800/60">
          {CATEGORIES.map((cat) => {
            const catFields = EXPORT_FIELDS.filter((f) => f.category === cat);
            const selectedInCat = catFields.filter((f) => selectedIds.includes(f.id)).length;
            const allSelected = selectedInCat === catFields.length;

            return (
              <div key={cat} className="pt-4 first:pt-0">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                      {cat}
                    </span>
                    <span className="text-[11px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded-md font-mono">
                      {selectedInCat}/{catFields.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {catFields.map((field) => {
                    const isChecked = selectedIds.includes(field.id);
                    return (
                      <div
                        key={field.id}
                        onClick={() => toggleField(field.id)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                          isChecked
                            ? "bg-indigo-950/40 border-indigo-500/50 text-white shadow-sm"
                            : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="mt-0.5 text-indigo-400 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 fill-indigo-600/30 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold leading-tight text-white flex items-center justify-between">
                            <span>{field.label}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {field.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Options & Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Summary Row Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
            <input
              type="checkbox"
              checked={includeTotals}
              onChange={(e) => setIncludeTotals(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
            />
            <span>Include formatted Total/Summary row at bottom</span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={selectedIds.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                selectedIds.length > 0
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 cursor-pointer"
                  : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                Export CSV ({selectedIds.length}{" "}
                {selectedIds.length === 1 ? "column" : "columns"})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
