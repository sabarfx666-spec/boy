"use client";
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Save, ChevronLeft, ChevronRight, Target, AlertTriangle, FileText } from "lucide-react";

const PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "GBP/JPY", "EUR/JPY", "USD/CAD", "AUD/USD"];
const WEEKLY_KEY = "sabar-weekly-outlook";

interface WeeklyEntry {
  weekStart: string;
  biases: Record<string, "BULLISH" | "BEARISH" | "NEUTRAL">;
  keyLevels: string;
  newsEvents: string;
  gamePlan: string;
  confluences: string;
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function formatWeek(weekStart: string) {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 4);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function offsetWeek(weekStart: string, n: number) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split("T")[0];
}

export default function WeeklyOutlookPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [entries, setEntries] = useState<Record<string, WeeklyEntry>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WEEKLY_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {}
  }, []);

  const entry: WeeklyEntry = entries[weekStart] ?? {
    weekStart,
    biases: {},
    keyLevels: "",
    newsEvents: "",
    gamePlan: "",
    confluences: "",
  };

  function update(patch: Partial<WeeklyEntry>) {
    const updated = { ...entries, [weekStart]: { ...entry, ...patch } };
    setEntries(updated);
    localStorage.setItem(WEEKLY_KEY, JSON.stringify(updated));
  }

  function setBias(pair: string, bias: "BULLISH" | "BEARISH" | "NEUTRAL") {
    update({ biases: { ...entry.biases, [pair]: bias } });
  }

  function saveAll() {
    localStorage.setItem(WEEKLY_KEY, JSON.stringify(entries));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const isCurrentWeek = weekStart === getWeekStart(new Date());

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(106,236,225,0.12)", border: "1px solid rgba(106,236,225,0.3)" }}>
            <TrendingUp size={20} style={{ color: "#6AECE1" }} />
          </div>
          <div>
            <h1 className="font-mono font-bold text-white text-lg uppercase tracking-widest">Weekly Outlook</h1>
            <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest">Market Analysis · {formatWeek(weekStart)}</p>
          </div>
        </div>

        {/* Week navigator */}
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(w => offsetWeek(w, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[#1A1A1A]"
            style={{ border: "1px solid #222", color: "#555" }}>
            <ChevronLeft size={14} />
          </button>
          {!isCurrentWeek && (
            <button onClick={() => setWeekStart(getWeekStart(new Date()))}
              className="px-3 py-1.5 rounded-lg font-mono text-xs transition-colors hover:opacity-80"
              style={{ background: "rgba(106,236,225,0.1)", border: "1px solid rgba(106,236,225,0.25)", color: "#6AECE1" }}>
              This Week
            </button>
          )}
          <button onClick={() => setWeekStart(w => offsetWeek(w, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[#1A1A1A]"
            style={{ border: "1px solid #222", color: "#555" }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Pair Biases */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "#6AECE1" }}>Weekly Bias Per Pair</p>
        <div className="grid grid-cols-2 gap-3">
          {PAIRS.map(pair => {
            const bias = entry.biases[pair] ?? "NEUTRAL";
            return (
              <div key={pair} className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: "#111", border: "1px solid #1A1A1A" }}>
                <span className="font-mono text-sm font-bold text-white">{pair}</span>
                <div className="flex items-center gap-1">
                  {(["BULLISH", "NEUTRAL", "BEARISH"] as const).map(b => (
                    <button key={b} onClick={() => setBias(pair, b)}
                      className="px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all"
                      style={{
                        background: bias === b
                          ? b === "BULLISH" ? "rgba(0,255,127,0.2)" : b === "BEARISH" ? "rgba(255,59,59,0.2)" : "rgba(255,255,255,0.1)"
                          : "transparent",
                        border: `1px solid ${bias === b
                          ? b === "BULLISH" ? "rgba(0,255,127,0.4)" : b === "BEARISH" ? "rgba(255,59,59,0.4)" : "#333"
                          : "#222"}`,
                        color: bias === b
                          ? b === "BULLISH" ? "#00FF7F" : b === "BEARISH" ? "#FF3B3B" : "#888"
                          : "#333",
                      }}>
                      {b === "BULLISH" ? "▲" : b === "BEARISH" ? "▼" : "—"}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3-col text areas */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: "keyLevels",    label: "Key Levels",       icon: Target,        color: "#F59E0B", placeholder: "Support & resistance levels to watch this week..." },
          { key: "newsEvents",   label: "News Events",      icon: AlertTriangle, color: "#FF3B3B", placeholder: "High impact news: FOMC, NFP, CPI dates & times..." },
          { key: "confluences",  label: "Confluences",      icon: TrendingUp,    color: "#6AECE1", placeholder: "Technical confluences, patterns, structures..." },
        ].map(({ key, label, icon: Icon, color, placeholder }) => (
          <div key={key} className="rounded-xl p-4 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <div className="flex items-center gap-2">
              <Icon size={13} style={{ color }} />
              <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color }}>{label}</p>
            </div>
            <textarea
              value={(entry as unknown as Record<string, string>)[key] ?? ""}
              onChange={e => update({ [key]: e.target.value } as Partial<WeeklyEntry>)}
              placeholder={placeholder}
              rows={7}
              className="w-full bg-transparent font-sans text-xs text-white placeholder-[#333] focus:outline-none resize-none leading-relaxed"
            />
          </div>
        ))}
      </div>

      {/* Game Plan */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <div className="flex items-center gap-2">
          <FileText size={13} style={{ color: "#00FF7F" }} />
          <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "#00FF7F" }}>Weekly Game Plan</p>
        </div>
        <textarea
          value={entry.gamePlan}
          onChange={e => update({ gamePlan: e.target.value })}
          placeholder="Write your full weekly game plan here — overall bias, setups to watch, rules to follow, risk limits..."
          rows={5}
          className="w-full bg-transparent font-sans text-sm text-white placeholder-[#333] focus:outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Save */}
      <button onClick={saveAll}
        className="w-full py-3 rounded-xl font-mono text-sm font-bold transition-all flex items-center justify-center gap-2"
        style={{
          background: saved ? "rgba(0,255,127,0.15)" : "rgba(106,236,225,0.1)",
          border: `1px solid ${saved ? "rgba(0,255,127,0.35)" : "rgba(106,236,225,0.25)"}`,
          color: saved ? "#00FF7F" : "#6AECE1",
        }}>
        <Save size={14} />
        {saved ? "Saved ✓" : "Save Weekly Outlook"}
      </button>

    </div>
  );
}
