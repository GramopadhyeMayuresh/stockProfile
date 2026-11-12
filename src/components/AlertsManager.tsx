import React, { useState, useEffect, useMemo } from "react";
import { Alert, AlertCreate, TechnicalIndicatorItem } from "../types";
import { formatINR, fetchTechnicalIndicators, refreshTechnicalIndicators } from "../api";
import {
  BellRing,
  Plus,
  Trash2,
  CheckCircle2,
  Volume2,
  Power,
  Sparkles,
  TrendingUp,
  Search,
  RefreshCw,
  Zap,
  ShieldAlert,
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

  // Technical Scanner State
  const [technicals, setTechnicals] = useState<TechnicalIndicatorItem[]>([]);
  const [loadingTech, setLoadingTech] = useState(false);
  const [techSearch, setTechSearch] = useState("");
  const [techFilter, setTechFilter] = useState<"ALL" | "BREAKOUT" | "ABOVE_EMA" | "NEAR_LOW">("ALL");

  useEffect(() => {
    let cancelled = false;
    fetchTechnicalIndicators()
      .then((items) => {
        if (!cancelled) setTechnicals(items);
      })
      .catch((err) => console.error("Error loading technical indicators:", err));

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefreshTech = async () => {
    setLoadingTech(true);
    try {
      const items = await refreshTechnicalIndicators();
      setTechnicals(items);
    } catch (err) {
      console.error("Error refreshing technical indicators:", err);
    } finally {
      setLoadingTech(false);
    }
  };

  const applyPreset = async (
    t: TechnicalIndicatorItem,
    type: "52W_HIGH" | "200_EMA" | "STOP_5" | "TARGET_10"
  ) => {
    let targetVal = 0;
    let cond: AlertCreate["condition_type"] = "PRICE_ABOVE";
    let alertNote = "";

    if (type === "52W_HIGH") {
      targetVal = Math.round(t.high_52w * 0.995 * 100) / 100;
      cond = "PRICE_ABOVE";
      alertNote = `${t.tradingsymbol} near 52-Week High Breakout level (₹${t.high_52w})`;
    } else if (type === "200_EMA") {
      targetVal = Math.round(t.ema_200 * 100) / 100;
      cond = t.last_price >= t.ema_200 ? "PRICE_BELOW" : "PRICE_ABOVE";
      alertNote = `${t.tradingsymbol} crossing 200-Day EMA trendline (₹${t.ema_200})`;
    } else if (type === "STOP_5") {
      targetVal = Math.round(t.last_price * 0.95 * 100) / 100;
      cond = "PRICE_BELOW";
      alertNote = `${t.tradingsymbol} 5% protective trailing stop reached`;
    } else if (type === "TARGET_10") {
      targetVal = Math.round(t.last_price * 1.10 * 100) / 100;
      cond = "PRICE_ABOVE";
      alertNote = `${t.tradingsymbol} +10% profit target reached`;
    }

    setTestStatus(`Created ${type.replace("_", " ")} Alert for ${t.tradingsymbol} at ₹${targetVal}!`);
    try {
      await onCreateAlert({
        isin: t.isin,
        tradingsymbol: t.tradingsymbol,
        exchange: "NSE",
        condition_type: cond,
        target_value: targetVal,
        broker_sync: "LOCAL_ONLY",
        note: alertNote,
      });
      setTimeout(() => setTestStatus(null), 3500);
    } catch {
      setTestStatus("Failed to create alert");
    }
  };

  // Filtered technical items
  const filteredTechnicals = useMemo(() => {
    return technicals.filter((item) => {
      const matchesSearch =
        item.tradingsymbol.toLowerCase().includes(techSearch.toLowerCase()) ||
        item.company_name.toLowerCase().includes(techSearch.toLowerCase());

      if (techFilter === "BREAKOUT") return matchesSearch && item.pct_from_52w_high <= 3.0;
      if (techFilter === "ABOVE_EMA") return matchesSearch && item.last_price >= item.ema_200;
      if (techFilter === "NEAR_LOW") return matchesSearch && item.pct_from_52w_low <= 5.0;
      return matchesSearch;
    });
  }, [technicals, techSearch, techFilter]);

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

      {/* 52-Week High & 200 EMA Technical Scanner & 1-Click Presets */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  52-Week High / Low & 200 EMA Technical Scanner
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                  {filteredTechnicals.length} Holdings
                </span>
              </div>
              <p className="text-xs text-slate-400">
                1-Click setup for momentum breakouts, moving average support, and protective trailing stops.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search stock..."
                value={techSearch}
                onChange={(e) => setTechSearch(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Filter */}
            <select
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value as any)}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Stocks</option>
              <option value="BREAKOUT">Near 52W High (&lt; 3%)</option>
              <option value="ABOVE_EMA">Above 200 EMA</option>
              <option value="NEAR_LOW">Near 52W Low</option>
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={handleRefreshTech}
              disabled={loadingTech}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Refresh technical calculations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTech ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Technical Holdings Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Stock</th>
                <th className="py-2.5 px-3 text-right">LTP (₹)</th>
                <th className="py-2.5 px-3">52-Week Range & Distance</th>
                <th className="py-2.5 px-3">200-Day EMA Trend</th>
                <th className="py-2.5 px-3">Technical Signal</th>
                <th className="py-2.5 px-3 text-center">1-Click Technical Presets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredTechnicals.slice(0, 8).map((t) => {
                const rangeSpan = t.high_52w - t.low_52w || 1;
                const progressPct = Math.min(
                  Math.max(((t.last_price - t.low_52w) / rangeSpan) * 100, 0),
                  100
                );

                return (
                  <tr key={t.isin} className="hover:bg-slate-800/30 transition-colors">
                    {/* Stock */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{t.tradingsymbol}</span>
                        {t.pct_from_52w_high <= 3.0 && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                            Breakout
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                        {t.company_name}
                      </div>
                    </td>

                    {/* LTP */}
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      ₹{t.last_price.toFixed(2)}
                    </td>

                    {/* 52W Range Bar */}
                    <td className="py-2.5 px-3 min-w-[180px]">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>L: ₹{t.low_52w.toFixed(0)}</span>
                        <span className="font-bold text-amber-300">
                          {t.pct_from_52w_high <= 1.0
                            ? "At 52W High!"
                            : `${t.pct_from_52w_high.toFixed(1)}% to High`}
                        </span>
                        <span>H: ₹{t.high_52w.toFixed(0)}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden relative">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </td>

                    {/* 200 EMA */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-200">
                        ₹{t.ema_200.toFixed(2)}
                      </div>
                      <div
                        className={`text-[10px] font-bold ${
                          t.pct_from_200_ema >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {t.pct_from_200_ema >= 0 ? "+" : ""}
                        {t.pct_from_200_ema.toFixed(1)}% vs 200 EMA
                      </div>
                    </td>

                    {/* Signal */}
                    <td className="py-2.5 px-3">
                      {t.trend_signal === "52W_BREAKOUT_ZONE" ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/30 text-[10px]">
                          ⚡ 52W Breakout Zone
                        </span>
                      ) : t.trend_signal === "GOLDEN_BULLISH" ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30 text-[10px]">
                          📈 Golden Trend
                        </span>
                      ) : t.trend_signal === "ABOVE_200_EMA" ? (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/30 text-[10px]">
                          Above 200 EMA
                        </span>
                      ) : t.trend_signal === "52W_SUPPORT_DIP" ? (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/30 text-[10px]">
                          Near 52W Low
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/30 text-[10px]">
                          Below 200 EMA
                        </span>
                      )}
                    </td>

                    {/* Presets */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => applyPreset(t, "52W_HIGH")}
                          title={`Set breakout alert at ₹${(t.high_52w * 0.995).toFixed(2)}`}
                          className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                        >
                          <Zap className="w-3 h-3" />
                          <span>52W High</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => applyPreset(t, "200_EMA")}
                          title={`Set 200 EMA cross alert at ₹${t.ema_200.toFixed(2)}`}
                          className="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                        >
                          <TrendingUp className="w-3 h-3" />
                          <span>200 EMA</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => applyPreset(t, "STOP_5")}
                          title={`Set -5% protective stop at ₹${(t.last_price * 0.95).toFixed(2)}`}
                          className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span>-5% Stop</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
