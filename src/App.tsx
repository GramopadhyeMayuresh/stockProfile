import { useState, useEffect, useCallback } from "react";
import { Navbar } from "./components/Navbar";
import { KPICards } from "./components/KPICards";
import { HoldingsTable } from "./components/HoldingsTable";
import { SectorAllocationView } from "./components/SectorAllocationView";
import { AlertsManager } from "./components/AlertsManager";
import { BrokerSettings } from "./components/BrokerSettings";
import { CreateAlertModal } from "./components/CreateAlertModal";
import {
  PortfolioSummary,
  AggregatedHolding,
  SectorAllocation,
  Alert,
  AlertCreate,
  BrokerAccount,
} from "./types";
import {
  fetchPortfolioSummary,
  fetchHoldings,
  fetchSectors,
  syncPortfolios,
  seedDemoPortfolio,
  fetchAlerts,
  createAlert,
  deleteAlert,
  toggleAlertStatus,
  testTriggerAlert,
  fetchBrokersStatus,
} from "./api";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

export function App() {
  const [currentTab, setCurrentTab] = useState("overview");
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [holdings, setHoldings] = useState<AggregatedHolding[]>([]);
  const [sectors, setSectors] = useState<SectorAllocation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [brokers, setBrokers] = useState<Record<string, BrokerAccount>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedStockForAlert, setSelectedStockForAlert] = useState<AggregatedHolding | null>(null);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const [sum, hld, sec, alr, brk] = await Promise.all([
        fetchPortfolioSummary(),
        fetchHoldings(),
        fetchSectors(),
        fetchAlerts(),
        fetchBrokersStatus(),
      ]);
      setSummary(sum);
      setHoldings(hld);
      setSectors(sec);
      setAlerts(alr);
      setBrokers(brk);
    } catch (err) {
      console.error("[StockProfile] Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Check & request notification permission
    (async () => {
      try {
        let permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
          const permission = await requestPermission();
          permissionGranted = permission === "granted";
        }
      } catch (e) {
        // Fallback for browser testing
      }
    })();

    // Listen to Menu Bar tray sync event
    let unlistenTraySync: (() => void) | undefined;
    (async () => {
      try {
        unlistenTraySync = await listen("tray-sync-requested", () => {
          handleSync();
        });
      } catch (e) {
        // Not running inside Tauri
      }
    })();

    // Connect to Server-Sent Events from local Python backend daemon
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("http://127.0.0.1:8765/api/events");
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event === "alert_triggered") {
            // Re-fetch alerts
            fetchAlerts().then(setAlerts);
            // Show Tauri native notification if inside Tauri
            try {
              sendNotification({
                title: `🚨 Stock Alert: ${parsed.data.symbol}`,
                body: `${parsed.data.message}\n${parsed.data.note}`,
              });
            } catch (e) {
              // Browser fallback
            }
          } else if (parsed.event === "sync_completed") {
            loadData();
          }
        } catch (e) {
          // ignore non-json ping
        }
      };
    } catch (e) {
      console.warn("SSE connection error:", e);
    }

    return () => {
      if (unlistenTraySync) unlistenTraySync();
      if (eventSource) eventSource.close();
    };
  }, [loadData]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncPortfolios();
      await loadData();
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSeedDemo = async () => {
    setIsSyncing(true);
    try {
      await seedDemoPortfolio();
      await loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateAlert = async (alert: AlertCreate) => {
    await createAlert(alert);
    const updated = await fetchAlerts();
    setAlerts(updated);
  };

  const handleDeleteAlert = async (id: number) => {
    await deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleToggleAlert = async (id: number, targetStatus: "ACTIVE" | "DISABLED") => {
    try {
      await toggleAlertStatus(id, targetStatus);
      const updated = await fetchAlerts();
      setAlerts(updated);
    } catch (err) {
      console.error("Failed to toggle alert:", err);
    }
  };

  const handleTestTrigger = async (id: number) => {
    await testTriggerAlert(id);
    const updated = await fetchAlerts();
    setAlerts(updated);
  };

  const activeAlertCount = alerts.filter((a) => a.status === "ACTIVE").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Initializing StockProfile Engine...
          </span>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-lg">
            ⚡
          </div>
          <h2 className="text-base font-bold text-white">Connecting to Backend Engine</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            StockProfile requires the local Python daemon running on <code className="text-indigo-400">http://127.0.0.1:8765</code>.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setLoading(true);
                loadData();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/30"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onSync={handleSync}
        isSyncing={isSyncing}
        onSeedDemo={handleSeedDemo}
        activeAlertCount={activeAlertCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* TAB 1: DASHBOARD */}
        {currentTab === "overview" && (
          <div className="space-y-6">
            <KPICards summary={summary} />
            <HoldingsTable
              holdings={holdings}
              onOpenAlertModal={setSelectedStockForAlert}
            />
          </div>
        )}

        {/* TAB 2: SECTOR ALLOCATION */}
        {currentTab === "sectors" && (
          <div className="space-y-6">
            <SectorAllocationView
              sectors={sectors}
              totalPortfolioValue={summary?.total_current_value || 0}
            />
          </div>
        )}

        {/* TAB 4: ALERTS & DAEMON */}
        {currentTab === "alerts" && (
          <AlertsManager
            alerts={alerts}
            onCreateAlert={handleCreateAlert}
            onDeleteAlert={handleDeleteAlert}
            onToggleAlert={handleToggleAlert}
            onTestTrigger={handleTestTrigger}
          />
        )}

        {/* TAB 5: BROKER SETTINGS */}
        {currentTab === "brokers" && (
          <BrokerSettings brokers={brokers} onRefresh={loadData} />
        )}
      </main>

      {/* Modal for setting alerts from any holding row */}
      {selectedStockForAlert && (
        <CreateAlertModal
          stock={selectedStockForAlert}
          onClose={() => setSelectedStockForAlert(null)}
          onSubmit={handleCreateAlert}
        />
      )}
    </div>
  );
}

export default App;
