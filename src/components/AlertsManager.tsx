import React, { useState } from "react";
import { Alert, AlertCreate } from "../types";
import { formatINR } from "../api";
import {
  BellRing,
  Plus,
  Trash2,
  CheckCircle2,
  Volume2,
  Power,
} from "lucide-react";

interface AlertsManagerProps {
  alerts: Alert[];
  onCreateAlert: (alert: AlertCreate) => Promise<void>;
  onDeleteAlert: (id: number) => Promise<void>;
  onToggleAlert: (id: number, targetStatus: "ACTIVE" | "DISABLED") => Promise<void>;
  onTestTrigger: (id: number) => Promise<void>;
}

export const AlertsManager: React.FC<AlertsManagerProps> = ({
  alerts,
  onCreateAlert,
  onDeleteAlert,
  onToggleAlert,
  onTestTrigger,
}) => {
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "TRIGGERED">("ACTIVE");

  // Form State
  const [symbol, setSymbol] = useState("");
  const [condition, setCondition] = useState<AlertCreate["condition_type"]>("PRICE_ABOVE");
  const [target, setTarget] = useState("");
  const [brokerSync, setBrokerSync] = useState<AlertCreate["broker_sync"]>("LOCAL_ONLY");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !target || isNaN(Number(target))) return;

    setIsSubmitting(true);
    try {
      await onCreateAlert({
        tradingsymbol: symbol.trim().toUpperCase(),
        condition_type: condition,
        target_value: Number(target),
        broker_sync: brokerSync,
        note: note.trim() || `${symbol.toUpperCase()} target condition reached`,
      });
      setSymbol("");
      setTarget("");
      setNote("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async (id: number) => {
    setTestStatus(`Dispatched test notification...`);
    try {
      await onTestTrigger(id);
      setTimeout(() => setTestStatus(null), 3500);
    } catch {
      setTestStatus("Failed to send notification");
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (activeTab === "ACTIVE") return a.status === "ACTIVE" || a.status === "DISABLED";
    return a.status === "TRIGGERED";
  });

  return (
    <div className="space-y-6">
      {/* Test Notification Banner notice */}
      {testStatus && (
        <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-300">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>{testStatus} (Look at top-right of your macOS screen for native banner!)</span>
          </div>
        </div>
      )}

      {/* Top Card: Create Alert Rule */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Create Price & Indicator Alert
            </h2>
            <p className="text-xs text-slate-400">
              Evaluated continuously by the background daemon with native macOS notifications
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* Symbol */}
          <div className="md:col-span-1">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Symbol
            </label>
            <input
              type="text"
              placeholder="e.g. PIDILITIND"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-semibold uppercase"
            />
          </div>

          {/* Condition */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Condition
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

          {/* Target Value */}
          <div className="md:col-span-1">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Target Value
            </label>
            <input
              type="number"
              step="any"
              placeholder={condition.startsWith("PRICE") ? "3150.00" : "3.5"}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-semibold"
            />
          </div>

          {/* Broker Sync */}
          <div className="md:col-span-1">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Broker Sync
            </label>
            <select
              value={brokerSync}
              onChange={(e) => setBrokerSync(e.target.value as any)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="LOCAL_ONLY">Local macOS Only</option>
              <option value="ZERODHA_GTT">Mirror Zerodha GTT</option>
              <option value="ANGEL_RULE">Mirror Angel One Rule</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-1 flex items-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? "Adding..." : "Add Alert"}</span>
            </button>
          </div>

          {/* Note Input (Full width row) */}
          <div className="md:col-span-6 mt-1">
            <input
              type="text"
              placeholder="Custom notification note (e.g., 'Key support broken - consider taking profit')"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </form>
      </div>

      {/* Alerts Table & History Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("ACTIVE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ACTIVE"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Active Alerts ({alerts.filter((a) => a.status === "ACTIVE").length})
            </button>
            <button
              onClick={() => setActiveTab("TRIGGERED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "TRIGGERED"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Triggered History ({alerts.filter((a) => a.status === "TRIGGERED").length})
            </button>
          </div>
          <span className="text-[11px] text-slate-400">
            Daemon checking every 10s
          </span>
        </div>

        {/* List of Alerts */}
        <div className="divide-y divide-slate-800/60">
          {filteredAlerts.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">
              No alerts found in this tab. Create one above to monitor your portfolio.
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isTriggered = alert.status === "TRIGGERED";
              const isDisabled = alert.status === "DISABLED";

              return (
                <div
                  key={alert.id}
                  className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl border ${
                        isTriggered
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : isDisabled
                          ? "bg-slate-800 text-slate-500 border-slate-700"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {isTriggered ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <BellRing className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          {alert.tradingsymbol}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            alert.status === "ACTIVE"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : alert.status === "TRIGGERED"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {alert.status === "ACTIVE" ? "Active" : alert.status === "TRIGGERED" ? "Triggered" : "Paused"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-semibold text-indigo-400 border border-slate-700">
                          {alert.condition_type.replace("_", " ")}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {alert.condition_type.startsWith("PRICE")
                            ? formatINR(alert.target_value)
                            : `${alert.target_value}%`}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono">
                          {alert.broker_sync}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 mt-1">
                        {alert.note || "No note added"}
                      </div>
                      {isTriggered && alert.triggered_at && (
                        <div className="text-[10px] text-amber-400 font-medium mt-0.5">
                          Triggered at {new Date(alert.triggered_at).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    {/* Test Trigger Button */}
                    <button
                      onClick={() => handleTest(alert.id)}
                      title="Test native macOS notification right now"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Test macOS Banner</span>
                    </button>

                    {/* Toggle Button */}
                    <button
                      onClick={() =>
                        onToggleAlert(
                          alert.id,
                          alert.status === "ACTIVE" ? "DISABLED" : "ACTIVE"
                        )
                      }
                      title={alert.status === "ACTIVE" ? "Pause alert" : "Enable alert"}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        alert.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          : alert.status === "TRIGGERED"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600"
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>
                        {alert.status === "ACTIVE"
                          ? "Active"
                          : alert.status === "TRIGGERED"
                          ? "Re-arm"
                          : "Enable"}
                      </span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteAlert(alert.id)}
                      title="Delete alert"
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
