"use client";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSabar } from "@/store/SabarContext";
import { Trade } from "@/store/types";
import {
  ArrowLeft, Plus, Trash2, CreditCard, TrendingUp, BarChart2,
  Link2, Camera, X, Upload, ChevronRight,
} from "lucide-react";
import Link from "next/link";

type TF = "Weekly" | "Daily" | "4H" | "15M" | "5M" | "Result";
type Account = { id: string; name: string; balance: number };

const TIMEFRAMES: { key: TF; label: string }[] = [
  { key: "Weekly", label: "1W" },
  { key: "Daily",  label: "1D" },
  { key: "4H",     label: "4H" },
  { key: "15M",    label: "15M" },
  { key: "5M",     label: "5M" },
  { key: "Result", label: "Result" },
];

function tradePct(t: Trade) {
  return t.totalRules > 0 ? Math.round((t.checkedCount / t.totalRules) * 100) : 0;
}
function gradeInfo(pct: number) {
  if (pct >= 90) return { letter: "A*", color: "#00FF7F", bg: "rgba(0,255,127,0.12)" };
  if (pct >= 70) return { letter: "B*", color: "#6AECE1", bg: "rgba(106,236,225,0.12)" };
  if (pct >= 50) return { letter: "C",  color: "#F5A623", bg: "rgba(245,162,35,0.12)" };
  return              { letter: "D",   color: "#FF3B3B", bg: "rgba(255,59,59,0.12)" };
}
function hasCharts(t: Trade) {
  return t.chartProofs && Object.keys(t.chartProofs).length > 0;
}

/* ── Chart Snapshots Panel ────────────────────────────── */
function ChartPanel({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const { dispatch } = useSabar();
  const [proofs, setProofs]     = useState<Partial<Record<TF, string>>>(trade.chartProofs ?? {});
  const [tfNotes, setTfNotes]   = useState<Partial<Record<TF, string>>>({});
  const [activeTf, setActiveTf] = useState<TF>("Weekly");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* paste anywhere in panel */
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const url = ev.target?.result as string;
        setProofs(p => ({ ...p, [activeTf]: url }));
      };
      reader.readAsDataURL(file);
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [activeTf]);

  const loadFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setProofs(p => ({ ...p, [activeTf]: url }));
    };
    reader.readAsDataURL(file);
  }, [activeTf]);

  const saveAll = () => {
    dispatch({ type: "UPDATE_TRADE", payload: { id: trade.id, chartProofs: proofs as Trade["chartProofs"] } });
    onClose();
  };

  const g = gradeInfo(tradePct(trade));

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-[420px] shadow-2xl"
      style={{ background: "#0A0A0A", borderLeft: "1px solid #1A1A1A" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1A1A1A" }}>
        <div className="flex items-center gap-2">
          <Camera size={16} style={{ color: "#E53E3E" }} />
          <span className="font-mono font-bold text-white text-sm">Chart Snapshots</span>
          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold"
            style={{ background: "rgba(229,62,62,0.12)", color: "#E53E3E" }}>{trade.pair}</span>
        </div>
        <button onClick={onClose} className="text-[#444] hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Trade meta */}
      <div className="px-5 py-3 border-b" style={{ borderColor: "#1A1A1A" }}>
        <p className="font-mono text-[10px] text-[#444]">
          {new Date(trade.date).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
          {" • "}
          {trade.bias === "BEARISH" ? "Bearish" : "Bullish"}
          {" • "}
          {trade.session === "LONDON" ? "London" : "New York"}
        </p>
      </div>

      {/* Trade Info */}
      <div className="px-5 py-3 border-b grid grid-cols-2 gap-2" style={{ borderColor: "#1A1A1A" }}>
        {[
          { label: "Outcome", value: trade.outcome ?? "—", color: trade.outcome === "WIN" ? "#00FF7F" : trade.outcome === "LOSS" ? "#FF3B3B" : "#6AECE1" },
          { label: "RR Result", value: trade.rr ? `+${trade.rr}R` : "—", color: "#6AECE1" },
          { label: "Grade", value: g.letter, color: g.color },
          { label: "Status", value: trade.decision === "TAKE" ? "Taken" : "Skipped", color: "#fff" },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-3 py-2 rounded-lg" style={{ background: "#111", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[9px] text-[#444] mb-0.5">{label}</p>
            <p className="font-mono text-xs font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Timeframe tabs */}
      <div className="flex gap-1 px-4 py-3 border-b overflow-x-auto" style={{ borderColor: "#1A1A1A" }}>
        {TIMEFRAMES.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTf(key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold transition-all"
            style={activeTf === key
              ? { background: "#E53E3E", color: "#fff" }
              : { background: "#111", border: "1px solid #1A1A1A", color: proofs[key] ? "#fff" : "#444" }}>
            {label}
            {proofs[key] && <span className="ml-1 w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#00FF7F" }} />}
          </button>
        ))}
      </div>

      {/* Chart upload zone */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <p className="font-mono text-[10px] font-bold text-white">
          {activeTf} <span className="text-[#444] font-normal">({TIMEFRAMES.find(t => t.key === activeTf)?.label})</span>
        </p>

        {/* Drop zone */}
        <div
          className="relative rounded-xl overflow-hidden transition-all cursor-pointer"
          style={{
            border: `2px dashed ${dragging ? "#E53E3E" : "#222"}`,
            background: "#0D0D0D",
            minHeight: 200,
          }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault(); setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file?.type.startsWith("image/")) loadFile(file);
          }}
          onClick={() => !proofs[activeTf] && fileRef.current?.click()}
        >
          {proofs[activeTf] ? (
            <>
              <img src={proofs[activeTf]} alt={activeTf}
                className="w-full object-contain rounded-xl" style={{ maxHeight: 260 }} />
              <button
                onClick={e => { e.stopPropagation(); setProofs(p => { const n = { ...p }; delete n[activeTf]; return n; }); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:opacity-90"
                style={{ background: "#E53E3E" }}>
                <X size={12} color="#fff" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Camera size={28} style={{ color: "#222" }} />
              <p className="font-mono font-bold text-xs text-white">{activeTf}</p>
              <p className="font-mono text-[10px] text-[#444]">{TIMEFRAMES.find(t => t.key === activeTf)?.label}</p>
              <p className="font-mono text-[9px] text-[#333] mt-1">Click + Ctrl+V or drag & drop</p>
              <button
                onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold mt-1 transition-all hover:opacity-90"
                style={{ background: "rgba(229,62,62,0.15)", color: "#E53E3E", border: "1px solid rgba(229,62,62,0.2)" }}>
                <Upload size={11} /> Upload
              </button>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }} />

        {/* Per-tf note */}
        <textarea
          value={tfNotes[activeTf] ?? ""}
          onChange={e => setTfNotes(p => ({ ...p, [activeTf]: e.target.value }))}
          placeholder={`Add note for ${activeTf} chart...`}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg font-mono text-xs text-white placeholder-[#333] focus:outline-none resize-none"
          style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}
        />
      </div>

      {/* Save */}
      <div className="px-4 py-4 border-t" style={{ borderColor: "#1A1A1A" }}>
        <button onClick={saveAll}
          className="w-full py-3 rounded-xl font-mono text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{ background: "#E53E3E" }}>
          Save All Notes
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────── */
export default function AccountsPage() {
  const { state } = useSabar();
  const [accounts,    setAccounts]    = useState<Account[]>([]);
  const [selected,    setSelected]    = useState<string>("");
  const [showNew,     setShowNew]     = useState(false);
  const [newName,     setNewName]     = useState("");
  const [newBal,      setNewBal]      = useState("");
  const [chartTrade,  setChartTrade]  = useState<Trade | null>(null);
  const [page,        setPage]        = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("sabar-accounts") ?? "[]");
      // Repair any accounts missing an id
      const saved = raw.map((a: Account, i: number) => ({ ...a, id: a.id ?? `acc-repair-${i}` }));
      setAccounts(saved);
      localStorage.setItem("sabar-accounts", JSON.stringify(saved));
      if (saved.length > 0) setSelected(saved[0].id);
    } catch {}
  }, []);

  const saveAccounts = (accs: Account[]) => {
    setAccounts(accs);
    localStorage.setItem("sabar-accounts", JSON.stringify(accs));
  };

  const addAccount = () => {
    if (!newName.trim()) return;
    const acc: Account = { id: `acc-${Date.now()}`, name: newName.trim(), balance: parseFloat(newBal) || 0 };
    const next = [...accounts, acc];
    saveAccounts(next);
    setSelected(acc.id);
    setNewName(""); setNewBal(""); setShowNew(false);
  };

  const deleteAccount = (id: string) => {
    const next = accounts.filter(a => a.id !== id);
    saveAccounts(next);
    if (selected === id) setSelected(next[0]?.id ?? "");
  };

  const account = accounts.find(a => a.id === selected);

  const linkedTrades = useMemo(() => {
    if (!account) return [];
    return [...state.trades]
      .filter(t => t.decision === "TAKE")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.trades, account]);

  const totalPnl   = linkedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalR     = linkedTrades.reduce((s, t) => s + (t.rr ?? 0), 0);
  const totalPages = Math.max(1, Math.ceil(linkedTrades.length / rowsPerPage));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * rowsPerPage;
  const pageTrades = linkedTrades.slice(pageStart, pageStart + rowsPerPage);
  const startBal = account?.balance ?? 0;
  const curBal   = startBal + totalPnl;
  const pctGain  = startBal > 0 ? ((totalPnl / startBal) * 100).toFixed(1) : null;

  return (
    <div className="relative">
      <div className={`max-w-5xl mx-auto space-y-5 p-4 transition-all ${chartTrade ? "pr-[440px]" : ""}`}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/history" className="flex items-center gap-1.5 text-xs font-mono text-[#444] hover:text-white transition-colors">
            <ArrowLeft size={13} /> Back to Journal
          </Link>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: "#E53E3E" }}>
            <Plus size={13} /> New Account
          </button>
        </div>

        {/* Account selector */}
        {accounts.length > 0 && (
          <div className="flex items-center gap-2">
            <select value={selected} onChange={e => setSelected(e.target.value)}
              className="px-3 py-2 rounded-lg font-mono text-sm text-white focus:outline-none"
              style={{ background: "#0D0D0D", border: "1px solid #2A2A2A" }}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button onClick={() => selected && deleteAccount(selected)}
              className="p-2 rounded-lg text-[#444] hover:text-[#FF3B3B] transition-colors"
              style={{ border: "1px solid #1A1A1A" }}>
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {/* New account form */}
        {showNew && (
          <div className="p-4 rounded-xl space-y-3" style={{ background: "#0D0D0D", border: "1px solid #2A2A2A" }}>
            <p className="font-mono text-xs font-bold text-white">New Account</p>
            <div className="flex gap-2">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Account name (e.g. funded next)"
                className="flex-1 px-3 py-2 rounded-lg font-mono text-xs text-white placeholder-[#333] focus:outline-none"
                style={{ background: "#0A0A0A", border: "1px solid #2A2A2A" }} />
              <input value={newBal} onChange={e => setNewBal(e.target.value)}
                placeholder="Starting balance ($)" type="number"
                className="w-44 px-3 py-2 rounded-lg font-mono text-xs text-white placeholder-[#333] focus:outline-none"
                style={{ background: "#0A0A0A", border: "1px solid #2A2A2A" }} />
            </div>
            <div className="flex gap-2">
              <button onClick={addAccount}
                className="px-4 py-2 rounded-lg font-mono text-xs font-bold text-white"
                style={{ background: "#E53E3E" }}>Create</button>
              <button onClick={() => setShowNew(false)}
                className="px-4 py-2 rounded-lg font-mono text-xs text-[#555]"
                style={{ border: "1px solid #1A1A1A" }}>Cancel</button>
            </div>
          </div>
        )}

        {account ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Account Balance", value: `$${curBal.toLocaleString()}`, sub: pctGain ? `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toLocaleString()} (+${pctGain}%)` : "", color: "#00FF7F", Icon: CreditCard },
                { label: "Total PnL ($)",   value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toLocaleString()}`, sub: "", color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B", Icon: TrendingUp },
                { label: "Total R",         value: `${totalR >= 0 ? "+" : ""}${totalR.toFixed(1)}R`, sub: "", color: "#6AECE1", Icon: BarChart2 },
                { label: "Trades Linked",   value: String(linkedTrades.length), sub: "", color: "#FF3B3B", Icon: Link2 },
              ].map(({ label, value, sub, color, Icon }) => (
                <div key={label} className="p-4 rounded-xl" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
                  <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: "#444" }}>{label}</p>
                  <p className="font-mono font-black text-xl" style={{ color }}>{value}</p>
                  {sub && <p className="font-mono text-[10px] mt-0.5" style={{ color: "#555" }}>{sub}</p>}
                </div>
              ))}
            </div>

            {/* History table */}
            <div className="rounded-xl overflow-hidden" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1A1A1A" }}>
                <p className="font-mono text-sm font-bold text-white">History</p>
                <p className="font-mono text-[10px] text-[#444]">{linkedTrades.length} trades</p>
              </div>
              {linkedTrades.length === 0 ? (
                <div className="py-12 text-center font-mono text-xs text-[#333]">No trades yet</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1A1A1A" }}>
                      {["","Date","Pair","Grade","Charts","RR","PnL ($)",""].map((h, i) => (
                        <th key={i} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest" style={{ color: "#444" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageTrades.map(t => {
                      const g = gradeInfo(tradePct(t));
                      const hasImg = hasCharts(t);
                      const isOpen = chartTrade?.id === t.id;
                      return (
                        <tr key={t.id}
                          className="transition-colors"
                          style={{ borderBottom: "1px solid #0A0A0A", background: isOpen ? "#111" : "transparent" }}>
                          <td className="pl-4 py-3">
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#00FF7F" }} />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-[#666]">
                            {new Date(t.date).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm font-bold text-white">{t.pair}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full font-mono text-xs font-bold"
                              style={{ background: g.bg, color: g.color }}>{g.letter}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setChartTrade(isOpen ? null : t)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                              style={hasImg
                                ? { background: "rgba(229,62,62,0.2)", border: "1px solid rgba(229,62,62,0.4)" }
                                : { background: "#111", border: "1px solid #1A1A1A" }}>
                              <Camera size={13} style={{ color: hasImg ? "#E53E3E" : "#333" }} />
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: "#6AECE1" }}>+{t.rr}R</td>
                          <td className="px-4 py-3 font-mono text-xs font-bold" style={{ color: "#00FF7F" }}>
                            {t.pnl !== undefined ? `+$${t.pnl.toLocaleString()}` : "—"}
                          </td>
                          <td className="pr-4 py-3">
                            <button onClick={() => setChartTrade(isOpen ? null : t)}
                              className="text-[#333] hover:text-white transition-colors">
                              <ChevronRight size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {/* Pagination footer */}
              {linkedTrades.length > 0 && (
                <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "#1A1A1A" }}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs transition-all disabled:opacity-30"
                      style={{ background: "#111", border: "1px solid #1A1A1A", color: "#aaa" }}>
                      ‹
                    </button>
                    <span className="font-mono text-xs text-white">{safePage}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs transition-all disabled:opacity-30"
                      style={{ background: "#111", border: "1px solid #1A1A1A", color: "#aaa" }}>
                      ›
                    </button>
                    <span className="font-mono text-[10px] text-[#444] ml-2">
                      Rows per page
                    </span>
                    <select value={rowsPerPage} onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                      className="px-2 py-1 rounded-lg font-mono text-xs text-white focus:outline-none"
                      style={{ background: "#111", border: "1px solid #1A1A1A" }}>
                      {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <span className="font-mono text-[10px] text-[#444]">
                    {pageStart + 1}–{Math.min(pageStart + rowsPerPage, linkedTrades.length)} of {linkedTrades.length}
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-20 text-center rounded-xl" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <CreditCard size={32} className="mx-auto mb-3" style={{ color: "#222" }} />
            <p className="font-mono text-sm font-bold text-white mb-1">No accounts yet</p>
            <p className="font-mono text-xs text-[#444]">Create your first trading account to track P&L</p>
          </div>
        )}
      </div>

      {/* Chart Snapshots side panel */}
      {chartTrade && (
        <ChartPanel
          key={chartTrade.id}
          trade={chartTrade}
          onClose={() => setChartTrade(null)}
        />
      )}
    </div>
  );
}
