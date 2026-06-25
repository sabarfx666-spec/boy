"use client";
import { useState } from "react";
import { Calculator, X, RotateCcw } from "lucide-react";

const PAIRS = ["EUR/USD", "GBP/USD", "GBP/JPY", "EUR/JPY", "USD/JPY", "XAU/USD", "AUD/USD", "NZD/USD"];

const PIP_VALUE: Record<string, number> = {
  "EUR/USD": 10, "GBP/USD": 10, "AUD/USD": 10, "NZD/USD": 10,
  "USD/JPY": 9.09, "GBP/JPY": 9.09, "EUR/JPY": 9.09,
  "XAU/USD": 10,
};

interface CalcResult {
  lots: string;
  riskAmt: number;
  profit: number | null;
}

export function PositionCalculator() {
  const [open,       setOpen]       = useState(false);
  const [pair,       setPair]       = useState("EUR/USD");
  const [account,   setAccount]    = useState("100000");
  const [risk,       setRisk]       = useState("1");
  const [sl,         setSl]         = useState("10");
  const [tp,         setTp]         = useState("");
  const [result,     setResult]     = useState<CalcResult | null>(null);

  function compute() {
    const acc    = parseFloat(account) || 0;
    const riskPc = parseFloat(risk)    || 0;
    const slPips = parseFloat(sl)      || 0;
    const tpPips = parseFloat(tp)      || 0;
    if (!acc || !riskPc || !slPips) return;
    const pipVal  = PIP_VALUE[pair] ?? 10;
    const riskAmt = (acc * riskPc) / 100;
    const lots    = riskAmt / (slPips * pipVal);
    const profit  = tpPips ? tpPips * pipVal * lots : null;
    setResult({ lots: lots.toFixed(2), riskAmt, profit });
  }

  function reset() {
    setPair("EUR/USD"); setAccount("100000"); setRisk("1");
    setSl("10"); setTp(""); setResult(null);
  }

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm font-mono text-white focus:outline-none";
  const inputStyle = { background: "#1A1A1A", border: "1px solid #2A2A2A" };

  return (
    <>
      {/* Floating trigger button — fixed left edge */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-10 h-10 rounded-r-xl transition-all hover:w-12"
        style={{ background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.4)", borderLeft: "none", boxShadow: "2px 0 12px rgba(229,62,62,0.2)" }}
        title="Position Calculator"
      >
        <Calculator size={18} style={{ color: "#E53E3E" }} />
      </button>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setOpen(false)} />
      )}

      {/* Slide-in panel from left */}
      <div
        className="fixed top-0 left-0 h-full z-50 flex flex-col overflow-y-auto transition-transform duration-300"
        style={{
          width: 340,
          background: "#0D0D0D",
          border: "1px solid #1E1E1E",
          borderLeft: "none",
          boxShadow: "4px 0 32px rgba(0,0,0,0.7)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1E1E1E" }}>
          <div className="flex items-center gap-2">
            <Calculator size={16} style={{ color: "#E53E3E" }} />
            <span className="font-mono text-sm font-bold text-white">Position Calculator</span>
          </div>
          <button onClick={() => setOpen(false)} className="text-[#555] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 px-5 py-4 space-y-4">

          {/* Pair */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-widest text-[#555] mb-1.5">Pair</label>
            <select
              value={pair}
              onChange={e => { setPair(e.target.value); setResult(null); }}
              className={inputClass}
              style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
            >
              {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Account Size */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-widest text-[#555] mb-1.5">Account Size ($)</label>
            <input
              type="number" value={account}
              onChange={e => { setAccount(e.target.value); setResult(null); }}
              placeholder="100000"
              className={inputClass} style={inputStyle}
            />
          </div>

          {/* Risk % */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-widest text-[#555] mb-1.5">Risk %</label>
            <input
              type="number" value={risk} step="0.1"
              onChange={e => { setRisk(e.target.value); setResult(null); }}
              placeholder="1"
              className={inputClass} style={inputStyle}
            />
          </div>

          {/* Stop Loss */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-widest text-[#555] mb-1.5">Stop Loss (pips)</label>
            <input
              type="number" value={sl}
              onChange={e => { setSl(e.target.value); setResult(null); }}
              placeholder="10"
              className={inputClass} style={inputStyle}
            />
          </div>

          {/* Take Profit */}
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-widest text-[#555] mb-1.5">Take Profit (pips) <span className="text-[#333] lowercase not-italic">optional</span></label>
            <input
              type="number" value={tp}
              onChange={e => { setTp(e.target.value); setResult(null); }}
              placeholder="—"
              className={inputClass} style={inputStyle}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={compute}
              className="flex-1 py-3 rounded-xl font-mono text-sm font-bold text-white transition-all"
              style={{ background: "#E53E3E", boxShadow: "0 0 16px 4px rgba(229,62,62,0.25)" }}
            >
              Calculate
            </button>
            <button
              onClick={reset}
              className="w-12 h-12 flex items-center justify-center rounded-xl transition-all hover:opacity-80"
              style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
            >
              <RotateCcw size={16} style={{ color: "#666" }} />
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="rounded-xl p-4 space-y-3 mt-1" style={{ background: "rgba(229,62,62,0.06)", border: "1px solid rgba(229,62,62,0.2)" }}>
              <div className="flex justify-between items-center">
                <span className="font-mono text-[11px] uppercase tracking-widest text-[#555]">Lot Size</span>
                <span className="font-mono text-xl font-black" style={{ color: "#E53E3E" }}>{result.lots}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-[11px] uppercase tracking-widest text-[#555]">Risk Amount</span>
                <span className="font-mono text-sm font-bold text-white">${result.riskAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {result.profit !== null && (
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-[#555]">Potential Profit</span>
                  <span className="font-mono text-sm font-bold" style={{ color: "#00FF7F" }}>+${result.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
