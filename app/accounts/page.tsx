"use client";
import { useState, useMemo, useEffect } from "react";
import { useSabar } from "@/store/SabarContext";
import { Trade } from "@/store/types";
import { ArrowLeft, Plus, Trash2, CreditCard, TrendingUp, BarChart2, Link2 } from "lucide-react";
import Link from "next/link";

function tradePct(t: Trade) {
  return t.totalRules > 0 ? Math.round((t.checkedCount / t.totalRules) * 100) : 0;
}
function gradeInfo(pct: number) {
  if (pct >= 90) return { letter: "A*", color: "#00FF7F", bg: "rgba(0,255,127,0.12)" };
  if (pct >= 70) return { letter: "B*", color: "#6AECE1", bg: "rgba(106,236,225,0.12)" };
  if (pct >= 50) return { letter: "C",  color: "#F5A623", bg: "rgba(245,162,35,0.12)" };
  return              { letter: "D",   color: "#FF3B3B", bg: "rgba(255,59,59,0.12)" };
}

export default function AccountsPage() {
  const { state } = useSabar();
  const [accounts, setAccounts] = useState<{ id: string; name: string; balance: number }[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sabar-accounts") ?? "[]");
      setAccounts(saved);
      if (saved.length > 0) setSelected(saved[0].id);
    } catch {}
  }, []);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBal, setNewBal] = useState("");

  const saveAccounts = (accs: typeof accounts) => {
    setAccounts(accs);
    localStorage.setItem("sabar-accounts", JSON.stringify(accs));
  };

  const addAccount = () => {
    if (!newName.trim()) return;
    const acc = { id: `acc-${Date.now()}`, name: newName.trim(), balance: parseFloat(newBal) || 0 };
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

  // Trades linked to this account (all for now — no per-trade account linking yet)
  const linkedTrades = useMemo(() => {
    if (!account) return [];
    return [...state.trades]
      .filter(t => t.decision === "TAKE" && t.outcome === "WIN")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.trades, account]);

  const totalPnl  = linkedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalR    = linkedTrades.reduce((s, t) => s + (t.rr ?? 0), 0);
  const curBal    = (account?.balance ?? 0) + totalPnl;

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-4">
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
              placeholder="Starting balance ($)"
              type="number"
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
              { label: "Account Balance", value: `$${curBal.toLocaleString()}`, sub: totalPnl !== 0 ? `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toLocaleString()} (${((totalPnl / account.balance) * 100).toFixed(1)}%)` : "", color: "#00FF7F", Icon: CreditCard },
              { label: "Total PnL ($)", value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toLocaleString()}`, sub: "", color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B", Icon: TrendingUp },
              { label: "Total R", value: `${totalR >= 0 ? "+" : ""}${totalR.toFixed(1)}R`, sub: "", color: "#6AECE1", Icon: BarChart2 },
              { label: "Trades Linked", value: String(linkedTrades.length), sub: "", color: "#FF3B3B", Icon: Link2 },
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
              <div className="py-12 text-center font-mono text-xs text-[#333]">No winning trades yet</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid #1A1A1A" }}>
                    {["Date","Pair","Grade","RR","PnL ($)"].map(h => (
                      <th key={h} className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-widest" style={{ color: "#444" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linkedTrades.map(t => {
                    const g = gradeInfo(tradePct(t));
                    return (
                      <tr key={t.id} style={{ borderBottom: "1px solid #0A0A0A" }}>
                        <td className="px-5 py-3 font-mono text-xs text-[#666]">
                          {new Date(t.date).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
                        </td>
                        <td className="px-5 py-3 font-mono text-sm font-bold text-white">{t.pair}</td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded-full font-mono text-xs font-bold"
                            style={{ background: g.bg, color: g.color }}>{g.letter}</span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs" style={{ color: "#6AECE1" }}>
                          +{t.rr}R
                        </td>
                        <td className="px-5 py-3 font-mono text-xs font-bold" style={{ color: "#00FF7F" }}>
                          {t.pnl !== undefined ? `+$${t.pnl.toLocaleString()}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
  );
}
