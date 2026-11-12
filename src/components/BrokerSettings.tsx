import React, { useState } from "react";
import { BrokerAccount } from "../types";
import {
  saveZerodhaCredentials,
  loginAngelOne,
  getZerodhaAuthUrl,
  seedDemoPortfolio,
  toggleBrokerActive,
} from "../api";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  ShieldCheck,
  ExternalLink,
  Key,
  CheckCircle2,
  XCircle,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

interface BrokerSettingsProps {
  brokers: Record<string, BrokerAccount>;
  onRefresh: () => void;
  isMasked?: boolean;
  onToggleMask?: () => void;
}

export const BrokerSettings: React.FC<BrokerSettingsProps> = ({
  brokers,
  onRefresh,
  isMasked = true,
  onToggleMask,
}) => {
  // Zerodha state
  const [zApiKey, setZApiKey] = useState("");
  const [zApiSecret, setZApiSecret] = useState("");
  const [zReqToken, setZReqToken] = useState("");
  const [zLoading, setZLoading] = useState(false);
  const [zMsg, setZMsg] = useState<string | null>(null);
  const [zOAuthUrl, setZOAuthUrl] = useState<string | null>(null);

  // Angel One state
  const [aClientId, setAClientId] = useState("");
  const [aPin, setAPin] = useState("");
  const [aApiKey, setAApiKey] = useState("");
  const [aTotpSecret, setATotpSecret] = useState("");
  const [aLoading, setALoading] = useState(false);
  const [aMsg, setAMsg] = useState<string | null>(null);
  const [togglingBroker, setTogglingBroker] = useState<string | null>(null);

  const handleToggleBroker = async (brokerId: string, currentActive: boolean) => {
    setTogglingBroker(brokerId);
    try {
      await toggleBrokerActive(brokerId, !currentActive);
      onRefresh();
    } catch (err: any) {
      console.error(`Error toggling ${brokerId}:`, err);
    } finally {
      setTogglingBroker(null);
    }
  };

  const handleZerodhaSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setZLoading(true);
    setZMsg(null);
    try {
      await saveZerodhaCredentials(zApiKey, zApiSecret, zReqToken || undefined);
      setZMsg("Zerodha credentials saved successfully in macOS Keychain!");
      onRefresh();
    } catch (err: any) {
      setZMsg(`Error: ${err.message}`);
    } finally {
      setZLoading(false);
    }
  };

  const handleZerodhaOAuth = async () => {
    setZMsg(null);
    const key = zApiKey.trim();
    if (!key) {
      setZMsg("Please enter your Zerodha API Key above first.");
      return;
    }
    try {
      if (zApiSecret.trim()) {
        await saveZerodhaCredentials(key, zApiSecret.trim());
      }
      const res = await getZerodhaAuthUrl(key);
      if (res && res.url) {
        setZOAuthUrl(res.url);
        setZMsg("Opening Kite login in your browser...");
        try {
          await openUrl(res.url);
        } catch (openErr) {
          console.warn("openUrl fallback to window.open:", openErr);
          window.open(res.url, "_blank");
        }
      }
    } catch (err: any) {
      setZMsg(`OAuth Error: ${err.message}`);
    }
  };

  const handleAngelOneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setALoading(true);
    setAMsg(null);
    try {
      await loginAngelOne(aClientId, aPin, aApiKey, aTotpSecret);
      setAMsg("Angel One login successful! Silent TOTP refresh active.");
      onRefresh();
    } catch (err: any) {
      setAMsg(`Login Error: ${err.message}`);
    } finally {
      setALoading(false);
    }
  };

  const handleSeedDemo = async () => {
    await seedDemoPortfolio();
    onRefresh();
  };

  const zerodhaStatus = brokers["zerodha"]?.is_connected;
  const zerodhaActive = brokers["zerodha"]?.is_active ?? true;

  const angelStatus = brokers["angelone"]?.is_connected;
  const angelActive = brokers["angelone"]?.is_active ?? true;

  const hasConnectedBroker = Object.values(brokers).some((b) => b.is_connected);

  return (
    <div className="space-y-6">
      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-indigo-500/30 flex items-start gap-3.5 shadow-xl">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white tracking-tight">
            Local-First Security & macOS Keychain Protection
          </h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            All API secrets, TOTP keys, and access tokens are saved exclusively on your Mac in the encrypted macOS Keychain (`keyring`) and local SQLite database (`stockprofile.db`). No telemetry, analytics, or credentials ever leave your machine.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Zerodha (Kite Connect) Settings */}
        <div className={`border rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all ${
          zerodhaActive
            ? "bg-slate-900/90 border-slate-800"
            : "bg-slate-900/50 border-slate-800/60 opacity-80"
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-sm">
                  K
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Zerodha Kite Connect</h3>
                  <p className="text-xs text-slate-400">Official Kite Connect v3 API</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleBroker("zerodha", zerodhaActive)}
                  disabled={togglingBroker === "zerodha"}
                  title={zerodhaActive ? "Click to pause tracking Zerodha" : "Click to enable tracking Zerodha"}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                    zerodhaActive
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${zerodhaActive ? "bg-emerald-400" : "bg-slate-500"}`} />
                  <span>{zerodhaActive ? "Tracking: Active" : "Tracking: Paused"}</span>
                </button>

                {zerodhaStatus ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                    <XCircle className="w-3.5 h-3.5" /> Demo
                  </span>
                )}
              </div>
            </div>

            {!zerodhaActive && (
              <div className="mb-4 p-2.5 rounded-xl text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between">
                <span>Account paused — Zerodha holdings and alerts are excluded from your portfolio.</span>
                <button
                  type="button"
                  onClick={() => handleToggleBroker("zerodha", false)}
                  className="underline font-bold hover:text-amber-200 ml-2 text-[11px]"
                >
                  Enable
                </button>
              </div>
            )}

            {zMsg && (
              <div className="mb-4 p-2.5 rounded-xl text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                {zMsg}
              </div>
            )}

            <form onSubmit={handleZerodhaSave} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  placeholder="Enter Kite Connect API Key"
                  value={zApiKey}
                  onChange={(e) => setZApiKey(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  API Secret
                </label>
                <input
                  type="password"
                  placeholder="Enter Kite Connect API Secret"
                  value={zApiSecret}
                  onChange={(e) => setZApiSecret(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Request Token (From Kite OAuth Redirect)
                </label>
                <input
                  type="text"
                  placeholder="Optional: Paste request_token manually"
                  value={zReqToken}
                  onChange={(e) => setZReqToken(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleZerodhaOAuth}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Kite Login Flow</span>
                </button>

                <button
                  type="submit"
                  disabled={zLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{zLoading ? "Saving..." : "Save to Keychain"}</span>
                </button>
              </div>

              {zOAuthUrl && (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] flex flex-col gap-1">
                  <span className="text-slate-400">If your browser did not open automatically:</span>
                  <a
                    href={zOAuthUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      openUrl(zOAuthUrl).catch(() => window.open(zOAuthUrl, "_blank"));
                    }}
                    className="text-orange-400 underline font-semibold break-all hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Click here to open Kite Login page</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              )}
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="font-semibold text-orange-400">Redirect URL for Kite app:</span>
              <code className="bg-slate-950 px-1.5 py-0.5 rounded text-[10px] text-indigo-300 font-mono select-all">
                http://127.0.0.1:8765/callback/zerodha
              </code>
            </div>
            <p className="text-slate-500">
              Kite Connect tokens expire daily at 06:00 AM IST as per SEBI regulations.
            </p>
          </div>
        </div>

        {/* 2. Angel One (SmartAPI) Settings */}
        <div className={`border rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all ${
          angelActive
            ? "bg-slate-900/90 border-slate-800"
            : "bg-slate-900/50 border-slate-800/60 opacity-80"
        }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm">
                  A
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Angel One SmartAPI</h3>
                  <p className="text-xs text-slate-400">Automated TOTP Silent Login</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleBroker("angelone", angelActive)}
                  disabled={togglingBroker === "angelone"}
                  title={angelActive ? "Click to pause tracking Angel One" : "Click to enable tracking Angel One"}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                    angelActive
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${angelActive ? "bg-emerald-400" : "bg-slate-500"}`} />
                  <span>{angelActive ? "Tracking: Active" : "Tracking: Paused"}</span>
                </button>

                {angelStatus ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                    <XCircle className="w-3.5 h-3.5" /> Demo
                  </span>
                )}
              </div>
            </div>

            {!angelActive && (
              <div className="mb-4 p-2.5 rounded-xl text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between">
                <span>Account paused — Angel One holdings and alerts are excluded from your portfolio.</span>
                <button
                  type="button"
                  onClick={() => handleToggleBroker("angelone", false)}
                  className="underline font-bold hover:text-amber-200 ml-2 text-[11px]"
                >
                  Enable
                </button>
              </div>
            )}

            {aMsg && (
              <div className="mb-4 p-2.5 rounded-xl text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                {aMsg}
              </div>
            )}

            <form onSubmit={handleAngelOneLogin} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Client ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. S123456"
                    value={aClientId}
                    onChange={(e) => setAClientId(e.target.value)}
                    required
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    MPIN / Password
                  </label>
                  <input
                    type="password"
                    placeholder="4-digit MPIN"
                    value={aPin}
                    onChange={(e) => setAPin(e.target.value)}
                    required
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  placeholder="SmartAPI App Key"
                  value={aApiKey}
                  onChange={(e) => setAApiKey(e.target.value)}
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  TOTP Secret Key (for zero-touch silent daily refresh)
                </label>
                <input
                  type="password"
                  placeholder="Base32 TOTP secret from Angel One 2FA setup"
                  value={aTotpSecret}
                  onChange={(e) => setATotpSecret(e.target.value)}
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={aLoading}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{aLoading ? "Authenticating..." : "Login with Auto-TOTP"}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-400">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-blue-400">Quick Links:</span>
              <div className="flex items-center gap-3">
                <a
                  href="https://smartapi.angelbroking.com"
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    openUrl("https://smartapi.angelbroking.com").catch(() => window.open("https://smartapi.angelbroking.com", "_blank"));
                  }}
                  className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1 cursor-pointer"
                >
                  <span>SmartAPI Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://smartapi.angelbroking.com/enable-totp"
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    openUrl("https://smartapi.angelbroking.com/enable-totp").catch(() => window.open("https://smartapi.angelbroking.com/enable-totp", "_blank"));
                  }}
                  className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Get TOTP Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <p className="text-slate-500">
              Angel One sessions auto-refresh silently in the background with pyotp without prompting.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Action Card: Privacy Masking (when connected) OR Demo Mode (when disconnected) */}
      {hasConnectedBroker ? (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className={`p-2.5 rounded-xl border ${
              isMasked ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            }`}>
              {isMasked ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Privacy Mode: Mask Financial Amounts</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isMasked
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}>
                  {isMasked ? "MASKED (DEFAULT)" : "UNMASKED"}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Conceals all rupee balances, invested sums, stock prices, and profit numbers across the dashboard and holdings.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleMask}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shrink-0 ${
              isMasked
                ? "bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
                : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white"
            }`}
          >
            {isMasked ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
            <span>{isMasked ? "Masked: Click to Reveal" : "Visible: Click to Mask"}</span>
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Reset or Refresh Demo Portfolio</div>
              <div className="text-[11px] text-slate-400">
                Populates realistic multi-broker portfolios with ISIN overlap (HDFC Bank, TCS, Reliance, etc.)
              </div>
            </div>
          </div>

          <button
            onClick={handleSeedDemo}
            className="px-4 py-2 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all"
          >
            Reset Demo Data
          </button>
        </div>
      )}
    </div>
  );
};

