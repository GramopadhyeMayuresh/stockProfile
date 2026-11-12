import React, { useState } from "react";
import { BrokerAccount } from "../types";
import {
  saveZerodhaCredentials,
  loginAngelOne,
  getZerodhaAuthUrl,
  seedDemoPortfolio,
} from "../api";
import {
  ShieldCheck,
  ExternalLink,
  Key,
  CheckCircle2,
  XCircle,
  Sparkles,
  Lock,
} from "lucide-react";

interface BrokerSettingsProps {
  brokers: Record<string, BrokerAccount>;
  onRefresh: () => void;
}

export const BrokerSettings: React.FC<BrokerSettingsProps> = ({
  brokers,
  onRefresh,
}) => {
  // Zerodha state
  const [zApiKey, setZApiKey] = useState("");
  const [zApiSecret, setZApiSecret] = useState("");
  const [zReqToken, setZReqToken] = useState("");
  const [zLoading, setZLoading] = useState(false);
  const [zMsg, setZMsg] = useState<string | null>(null);

  // Angel One state
  const [aClientId, setAClientId] = useState("");
  const [aPin, setAPin] = useState("");
  const [aApiKey, setAApiKey] = useState("");
  const [aTotpSecret, setATotpSecret] = useState("");
  const [aLoading, setALoading] = useState(false);
  const [aMsg, setAMsg] = useState<string | null>(null);

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
    try {
      const res = await getZerodhaAuthUrl(zApiKey || undefined);
      window.open(res.url, "_blank");
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
  const angelStatus = brokers["angelone"]?.is_connected;

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
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
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

              <div className="flex items-center gap-1.5">
                {zerodhaStatus ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                    <XCircle className="w-3.5 h-3.5" /> Demo / Unlinked
                  </span>
                )}
              </div>
            </div>

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
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Kite Connect tokens expire daily at 06:00 AM IST as per SEBI regulations.
          </div>
        </div>

        {/* 2. Angel One (SmartAPI) Settings */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
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

              <div className="flex items-center gap-1.5">
                {angelStatus ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                    <XCircle className="w-3.5 h-3.5" /> Demo / Unlinked
                  </span>
                )}
              </div>
            </div>

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

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
            Angel One sessions auto-refresh silently in the background with pyotp without prompting.
          </div>
        </div>
      </div>

      {/* Demo Mode Card */}
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
    </div>
  );
};

