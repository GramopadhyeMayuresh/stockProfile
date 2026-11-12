import React, { useState } from "react";
import { AggregatedHolding, AlertCreate } from "../types";
import { formatINR } from "../api";
import { X, BellRing, Plus } from "lucide-react";

interface CreateAlertModalProps {
  stock: AggregatedHolding | null;
  onClose: () => void;
  onSubmit: (alert: AlertCreate) => Promise<void>;
}

export const CreateAlertModal: React.FC<CreateAlertModalProps> = ({
  stock,
  onClose,
  onSubmit,
}) => {
  if (!stock) return null;

  const [condition, setCondition] = useState<AlertCreate["condition_type"]>("PRICE_ABOVE");
  const [target, setTarget] = useState(String(Math.round(stock.last_price * 1.05)));
  const [brokerSync, setBrokerSync] = useState<AlertCreate["broker_sync"]>("LOCAL_ONLY");
  const [note, setNote] = useState(`${stock.tradingsymbol} hit profit target level`);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || isNaN(Number(target))) return;
    setLoading(true);
    try {
      await onSubmit({
        isin: stock.isin,
        tradingsymbol: stock.tradingsymbol,
        exchange: stock.exchange,
        condition_type: condition,
        target_value: Number(target),
        broker_sync: brokerSync,
        note: note.trim(),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BellRing className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">
              Create Alert for {stock.tradingsymbol}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400">Current LTP:</span>{" "}
              <span className="font-bold text-white">{formatINR(stock.last_price)}</span>
            </div>
            <div>
              <span className="text-slate-400">Sector:</span>{" "}
              <span className="font-semibold text-indigo-400">{stock.sector}</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Trigger Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as any)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="PRICE_ABOVE">Price Crosses Above (₹)</option>
              <option value="PRICE_BELOW">Price Falls Below (₹)</option>
              <option value="PCT_CHANGE_UP">% Gained Today (+%)</option>
              <option value="PCT_CHANGE_DOWN">% Dropped Today (-%)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Target Value
            </label>
            <input
              type="number"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Sync / Order Mirroring
            </label>
            <select
              value={brokerSync}
              onChange={(e) => setBrokerSync(e.target.value as any)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="LOCAL_ONLY">Local macOS Only (Background Notification)</option>
              <option value="ZERODHA_GTT">Mirror to Zerodha GTT</option>
              <option value="ANGEL_RULE">Mirror to Angel One GTT Rule</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Notification Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Custom message shown in macOS banner"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? "Creating..." : "Set Alert"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

