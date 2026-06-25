"use client";
import { useState, useMemo, useEffect } from "react";
import { useSabar } from "@/store/SabarContext";
import { Trade } from "@/store/types";
import {
  BookOpen, TrendingUp, TrendingDown, Minus, Search,
  FileText, ArrowLeft, Award, AlertCircle, Brain, XCircle,
  User, CreditCard, Link2, ChevronDown, Plus,
} from "lucide-react";
import Link from "next/link";

type Account = { id: string; name: string; balance: number };

/* ── helpers ─────────────────────────────────────────────── */
function tradePct(t: Trade) {
  return t.totalRules > 0 ? Math.round((t.checkedCount / t.totalRules) * 100) : 0;
}
function gradeInfo(pct: number) {
  if (pct >= 90) return { letter: "A*", color: "#00FF7F", bg: "rgba(0,255,127,0.12)" };
  if (pct >= 70) return { letter: "B*", color: "#6AECE1", bg: "rgba(106,236,225,0.12)" };
  if (pct >= 50) return { letter: "C",  color: "#F5A623", bg: "rgba(245,162,35,0.12)" };
  return              { letter: "D",   color: "#FF3B3B", bg: "rgba(255,59,59,0.12)" };
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ── outcome buttons config ──────────────────────────────── */
const OUTCOMES = [
  { key: "WIN",       label: "WIN",       Icon: TrendingUp,   color: "#00FF7F" },
  { key: "LOSS",      label: "LOSS",      Icon: TrendingDown, color: "#FF3B3B" },
  { key: "BE",        label: "BE",        Icon: Minus,        color: "#6AECE1" },
  { key: "MISSED",    label: "MISSED",    Icon: AlertCircle,  color: "#888" },
  { key: "EMOTIONAL", label: "EMOTIONAL", Icon: Brain,        color: "#F5A623" },
  { key: "WITHDRAW",  label: "WITHDRAW",  Icon: XCircle,      color: "#888" },
] as const;

/* ── main page ───────────────────────────────────────────── */
export default function HistoryPage() {
  const { state, dispatch } = useSabar();

  const [search,       setSearch]       = useState("");
  const [gradeFilter,  setGradeFilter]  = useState("All Grades");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [pairFilter,   setPairFilter]   = useState("All Pairs");
  const [timeFilter,   setTimeFilter]   = useState("All Time");
  const [selected,     setSelected]     = useState<Trade | null>(null);
  const [editNotes,    setEditNotes]    = useState("");
  const [accounts,     setAccounts]     = useState<Account[]>([]);
  const [tradeLinks,   setTradeLinks]   = useState<Record<string, string>>({});
  const [showLinkDrop, setShowLinkDrop] = useState(false);

  useEffect(() => {
    try {
      setAccounts(JSON.parse(localStorage.getItem("sabar-accounts") ?? "[]"));
      setTradeLinks(JSON.parse(localStorage.getItem("sabar-trade-links") ?? "{}"));
    } catch {}
  }, []);

  const saveLinks = (links: Record<string, string>) => {
    setTradeLinks(links);
    localStorage.setItem("sabar-trade-links", JSON.stringify(links));
  };

  const linkAccount = (tradeId: string, accountId: string) => {
    saveLinks({ ...tradeLinks, [tradeId]: accountId });
    setShowLinkDrop(false);
  };

  const unlinkAccount = (tradeId: string) => {
    const next = { ...tradeLinks };
    delete next[tradeId];
    saveLinks(next);
  };

  const TIME_DAYS: Record<string, number> = {
    "Last 7 days": 7, "Last 14 days": 14, "Last 20 days": 20, "Last 30 days": 30,
  };

  const pairs = useMemo(() =>
    Array.from(new Set(state.trades.map(t => t.pair))),
  [state.trades]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return [...state.trades]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(t => {
        if (timeFilter in TIME_DAYS) {
          if (new Date(t.date).getTime() < now - TIME_DAYS[timeFilter] * 86_400_000) return false;
        }
        if (gradeFilter !== "All Grades" && gradeInfo(tradePct(t)).letter !== gradeFilter) return false;
        if (statusFilter === "Taken"   && t.decision !== "TAKE") return false;
        if (statusFilter === "Skipped" && t.decision !== "SKIP") return false;
        if (pairFilter !== "All Pairs" && t.pair !== pairFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!t.pair.toLowerCase().includes(q) && !(t.notes ?? "").toLowerCase().includes(q)) return false;
        }
        return true;
      });
  }, [state.trades, timeFilter, gradeFilter, statusFilter, pairFilter, search]);

  /* stats */
  const totalTrades = filtered.length;
  const taken       = filtered.filter(t => t.decision === "TAKE").length;
  const skipped     = filtered.filter(t => t.decision === "SKIP").length;
  const aStar       = filtered.filter(t => tradePct(t) >= 90).length;

  const handleSelect = (t: Trade) => { setSelected(t); setEditNotes(t.notes ?? ""); setShowLinkDrop(false); };

  const setOutcome = (key: string) => {
    if (!selected) return;
    const outcome = key as Trade["outcome"];
    dispatch({ type: "UPDATE_TRADE", payload: { id: selected.id, outcome } });
    setSelected(prev => prev ? { ...prev, outcome } : null);
  };

  const saveNotes = () => {
    if (!selected) return;
    dispatch({ type: "UPDATE_TRADE", payload: { id: selected.id, notes: editNotes } });
    setSelected(prev => prev ? { ...prev, notes: editNotes } : null);
  };

  /* ── JSX ── */
  return (
    <div className="max-w-7xl mx-auto space-y-4 p-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.3)" }}>
            <BookOpen size={20} style={{ color: "#E53E3E" }} />
          </div>
          <div>
            <h1 className="font-mono font-bold text-white text-lg tracking-wide">Trade Journal</h1>
            <p className="font-mono text-[10px] text-[#444]">Review your saved trades</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/profile"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all hover:opacity-90"
            style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#aaa" }}>
            <User size={13} /> Profile
          </Link>
          <Link href="/accounts"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all hover:opacity-90"
            style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#aaa" }}>
            <CreditCard size={13} /> Accounts
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-xs font-mono text-[#444] hover:text-white transition-colors ml-2">
            <ArrowLeft size={13} /> Back to Checklist
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Trades", value: totalTrades, Icon: BookOpen,     color: "#fff" },
          { label: "Taken",        value: taken,       Icon: TrendingUp,   color: "#00FF7F" },
          { label: "Skipped",      value: skipped,     Icon: TrendingDown, color: "#FF3B3B" },
          { label: "A* Trades",    value: aStar,       Icon: Award,        color: "#F5A623" },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="p-4 rounded-xl" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={12} style={{ color }} />
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#444" }}>{label}</p>
            </div>
            <p className="font-mono font-black text-2xl text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#333]" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by pair or notes..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl font-mono text-xs text-white placeholder-[#333] focus:outline-none"
          style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }} />
      </div>

      {/* Dropdowns */}
      <div className="flex gap-2 flex-wrap">
        {[
          { val: gradeFilter,  set: setGradeFilter,  opts: ["All Grades","A*","B*","C","D"] },
          { val: statusFilter, set: setStatusFilter,  opts: ["All Status","Taken","Skipped"] },
          { val: pairFilter,   set: setPairFilter,    opts: ["All Pairs", ...pairs] },
        ].map(({ val, set, opts }) => (
          <select key={opts[0]} value={val} onChange={e => set(e.target.value)}
            className="px-3 py-1.5 rounded-lg font-mono text-xs text-white focus:outline-none"
            style={{ background: "#0D0D0D", border: "1px solid #2A2A2A" }}>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Time filters */}
      <div className="flex gap-2 flex-wrap">
        {["All Time","Last 7 days","Last 14 days","Last 20 days","Last 30 days"].map(tf => (
          <button key={tf} onClick={() => setTimeFilter(tf)}
            className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all"
            style={timeFilter === tf
              ? { background: "#E53E3E", color: "#fff" }
              : { background: "#0D0D0D", border: "1px solid #1A1A1A", color: "#555" }}>
            {tf}
          </button>
        ))}
      </div>

      {/* Trade list + detail panel */}
      <div className="grid grid-cols-5 gap-4 items-start">

        {/* List */}
        <div className="col-span-3 space-y-2">
          {filtered.length === 0
            ? <p className="text-center py-16 font-mono text-xs text-[#333]">No trades found</p>
            : filtered.map(t => {
                const g = gradeInfo(tradePct(t));
                const isActive = selected?.id === t.id;
                return (
                  <button key={t.id} onClick={() => handleSelect(t)}
                    className="w-full text-left p-4 rounded-xl transition-all"
                    style={{ background: isActive ? "#141414" : "#0D0D0D", border: `1px solid ${isActive ? "#2A2A2A" : "#1A1A1A"}` }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-[10px] text-[#444] mb-0.5">{fmtDate(t.date)}</p>
                        <p className="font-mono font-bold text-white text-base">{t.pair}</p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono"
                            style={t.bias === "BEARISH"
                              ? { background: "rgba(255,59,59,0.1)", color: "#FF6B6B" }
                              : { background: "rgba(0,255,127,0.08)", color: "#00FF7F" }}>
                            {t.bias === "BEARISH" ? "↘ Bearish" : "↗ Bullish"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono"
                            style={{ background: "rgba(106,236,225,0.08)", color: "#6AECE1" }}>
                            📍 {t.session === "LONDON" ? "London" : "New York"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-mono font-black text-xl" style={{ color: g.color }}>{g.letter}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono"
                          style={t.decision === "TAKE"
                            ? { background: "rgba(0,255,127,0.08)", color: "#00FF7F", border: "1px solid rgba(0,255,127,0.2)" }
                            : { background: "rgba(255,59,59,0.08)", color: "#FF3B3B", border: "1px solid rgba(255,59,59,0.2)" }}>
                          {t.decision === "TAKE" ? "✓ Taken" : "⊘ Skipped"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
          }
        </div>

        {/* Detail panel */}
        <div className="col-span-2 sticky top-4">
          {selected ? (
            <div className="rounded-xl p-5 space-y-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>

              {/* Trade header */}
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono font-black text-white text-lg">{selected.pair}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono"
                    style={selected.bias === "BEARISH"
                      ? { background: "rgba(255,59,59,0.12)", color: "#FF6B6B" }
                      : { background: "rgba(0,255,127,0.1)", color: "#00FF7F" }}>
                    {selected.bias === "BEARISH" ? "Bearish" : "Bullish"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono"
                    style={{ background: "#1A1A1A", color: "#666" }}>
                    {selected.session === "LONDON" ? "London" : "New York"}
                  </span>
                  {(() => { const g = gradeInfo(tradePct(selected)); return (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono"
                      style={{ background: g.bg, color: g.color }}>{g.letter}</span>
                  ); })()}
                </div>
                <p className="font-mono text-[10px] text-[#444]">
                  {new Date(selected.date).toLocaleDateString("en-US", { weekday:"short", year:"numeric", month:"short", day:"numeric" })}
                </p>
              </div>

              {/* Trade Outcome */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#E53E3E]" />
                  <p className="font-mono text-xs font-bold text-white">Trade Outcome</p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {OUTCOMES.map(({ key, label, Icon, color }) => {
                    const active = selected.outcome === key;
                    return (
                      <button key={key} onClick={() => setOutcome(key)}
                        className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[9px] font-bold font-mono transition-all"
                        style={active
                          ? { background: `${color}22`, border: `1px solid ${color}`, color }
                          : { background: "transparent", border: "1px solid #1A1A1A", color: "#444" }}>
                        <Icon size={11} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Linked Accounts & PnL */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#E53E3E" }} />
                  <p className="font-mono text-xs font-bold text-white">Linked Accounts & PnL</p>
                </div>

                {/* Link account button */}
                <div className="relative">
                  <button
                    onClick={() => setShowLinkDrop(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg font-mono text-xs transition-all"
                    style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#555" }}>
                    <span className="flex items-center gap-1.5"><Plus size={11} /> Link account</span>
                    <ChevronDown size={11} />
                  </button>
                  {showLinkDrop && (
                    <div className="absolute left-0 right-0 top-full mt-1 rounded-lg z-50 overflow-hidden"
                      style={{ background: "#111", border: "1px solid #2A2A2A", boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
                      {accounts.length === 0 ? (
                        <p className="px-3 py-3 font-mono text-[10px] text-[#444]">No accounts — create one in Accounts page</p>
                      ) : accounts.map(acc => (
                        <button key={acc.id}
                          onClick={() => linkAccount(selected.id, acc.id)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left font-mono text-xs text-white hover:bg-[#1A1A1A] transition-colors">
                          <CreditCard size={11} style={{ color: "#E53E3E" }} />
                          {acc.name}
                          <span className="ml-auto font-mono text-[10px] text-[#444]">${(acc.balance ?? 0).toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Linked account display */}
                {tradeLinks[selected.id] && (() => {
                  const acc = accounts.find(a => a.id === tradeLinks[selected.id]);
                  if (!acc) return null;
                  return (
                    <div className="mt-2 flex items-center justify-between px-3 py-2.5 rounded-lg"
                      style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
                      <div className="flex items-center gap-2">
                        <Link2 size={11} style={{ color: "#E53E3E" }} />
                        <span className="font-mono text-xs font-bold text-white">{acc.name}</span>
                        <span className="font-mono text-[10px] text-[#555]">(${(acc.balance ?? 0).toLocaleString()})</span>
                      </div>
                      <button onClick={() => unlinkAccount(selected.id)}
                        className="font-mono text-[9px] text-[#333] hover:text-[#FF3B3B] transition-colors">
                        unlink
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Rules score */}
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
                <span className="font-mono text-[10px] text-[#444]">Rules Checked</span>
                <span className="font-mono text-xs font-bold text-white">
                  {selected.checkedCount}/{selected.totalRules} ({tradePct(selected)}%)
                </span>
              </div>

              {/* Trade Notes */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#F5A623]" />
                  <p className="font-mono text-xs font-bold text-white">Trade Notes & Lessons</p>
                </div>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                  placeholder="Mistake made, lesson learned, market condition, psychology notes..."
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg font-mono text-xs text-white placeholder-[#333] focus:outline-none resize-none"
                  style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }} />
                <button onClick={saveNotes}
                  className="mt-2 w-full py-2 rounded-lg font-mono text-xs font-bold text-white transition-all hover:opacity-90"
                  style={{ background: "#E53E3E" }}>
                  Save Notes
                </button>
              </div>

              {/* Delete */}
              <button
                onClick={() => { dispatch({ type: "DELETE_TRADE", payload: selected.id }); setSelected(null); }}
                className="w-full py-1.5 rounded-lg font-mono text-[10px] transition-colors"
                style={{ border: "1px solid #1A1A1A", color: "#333" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#FF3B3B")}
                onMouseLeave={e => (e.currentTarget.style.color = "#333")}>
                Delete Trade
              </button>
            </div>
          ) : (
            <div className="rounded-xl flex flex-col items-center justify-center text-center"
              style={{ background: "#0D0D0D", border: "1px solid #1A1A1A", minHeight: 220, padding: 40 }}>
              <FileText size={30} className="mb-3" style={{ color: "#222" }} />
              <p className="font-mono text-xs" style={{ color: "#333" }}>Select a trade to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
