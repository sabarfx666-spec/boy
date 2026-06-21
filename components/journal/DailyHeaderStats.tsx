"use client";
import { useState, useEffect } from "react";

interface Trade {
  date: string;
  outcome: "WIN" | "LOSS" | "BE";
  pnl?: number;
}

export function DailyHeaderStats() {
  const today = new Date().toISOString().split("T")[0];
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sabar-state");
      if (raw) {
        const state = JSON.parse(raw);
        setTrades(state.trades ?? []);
      }
    } catch {}
  }, []);

  const todayTrades = trades.filter(t => t.date === today);
  const wins   = todayTrades.filter(t => t.outcome === "WIN").length;
  const losses = todayTrades.filter(t => t.outcome === "LOSS").length;
  const total  = todayTrades.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const pnl = todayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const pnlColor = pnl > 0 ? "#00FF7F" : pnl < 0 ? "#FF3B3B" : "#555";

  if (total === 0) return null;

  return (
    <div className="ml-auto flex items-center gap-3">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
        style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <span className="font-mono text-[10px] text-[#444] uppercase tracking-widest">Trades</span>
        <span className="font-mono text-xs font-bold text-white">{total}</span>
      </div>

      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
        style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <span className="font-mono text-[10px] text-[#444] uppercase tracking-widest">WR</span>
        <span className="font-mono text-xs font-bold" style={{ color: winRate >= 50 ? "#00FF7F" : "#FF3B3B" }}>
          {winRate}%
        </span>
      </div>

      {pnl !== 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ background: "#0D0D0D", border: `1px solid ${pnlColor}33` }}>
          <span className="font-mono text-[10px] text-[#444] uppercase tracking-widest">PnL</span>
          <span className="font-mono text-xs font-bold" style={{ color: pnlColor }}>
            {pnl > 0 ? "+" : ""}{pnl.toFixed(0)}
          </span>
        </div>
      )}
    </div>
  );
}
