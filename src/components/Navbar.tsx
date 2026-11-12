import React from "react";
import {
  TrendingUp,
  LayoutDashboard,
  PieChart,
  BellRing,
  Settings,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  Coins,
} from "lucide-react";

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  onSeedDemo: () => void;
  activeAlertCount: number;
  hasConnectedBroker?: boolean;
  isMasked?: boolean;
  onToggleMask?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onSync,
  isSyncing,
  onSeedDemo,
  activeAlertCount,
  hasConnectedBroker = false,
  isMasked = true,
  onToggleMask,
}) => {
  const tabs = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "sectors", label: "Sector Allocation", icon: PieChart },
    { id: "dividends", label: "Dividends & Cashflow", icon: Coins },
    { id: "alerts", label: "Alerts & Daemon", icon: BellRing, badge: activeAlertCount },
    { id: "brokers", label: "Broker Accounts", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5">
      <div className="flex items-center justify-between">
        {/* App Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                StockProfile
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                macOS Native
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Zerodha Kite + Angel One SmartAPI Aggregator
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-white text-indigo-700"
                        : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          {hasConnectedBroker ? (
            <button
              type="button"
              onClick={onToggleMask}
              title={isMasked ? "Financial figures are masked (Click to reveal)" : "Financial figures are visible (Click to mask)"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isMasked
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {isMasked ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              <span>{isMasked ? "Masked" : "Visible"}</span>
            </button>
          ) : (
            <button
              onClick={onSeedDemo}
              title="Load realistic demo holdings across Zerodha & Angel One"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Demo</span>
            </button>
          )}

          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-blue-400" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

