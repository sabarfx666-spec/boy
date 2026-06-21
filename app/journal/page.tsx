"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Save, ChevronLeft, ChevronRight, History, Globe, BarChart2, TrendingUp, TrendingDown, Minus } from "lucide-react";

const JOURNAL_KEY = "sabar-journal-entries";

interface JournalEntry {
  date:  string;
  notes: string;
  bias:  "BULLISH" | "BEARISH" | "NEUTRAL" | null;
}

const BLANK = (date: string): JournalEntry => ({ date, notes: "", bias: null });

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}
function offsetDay(d: string, n: number) {
  const dt = new Date(d + "T12:00:00");
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0];
}

export default function JournalPage() {
  const router = useRouter();
  const today  = new Date().toISOString().split("T")[0];
  const [date, setDate]       = useState(today);
  const [entries, setEntries] = useState<Record<string, JournalEntry>>({});
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(JOURNAL_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {}
  }, []);

  const entry: JournalEntry = entries[date] ?? BLANK(date);

  function update(patch: Partial<JournalEntry>) {
    const updated = { ...entries, [date]: { ...entry, ...patch } };
    setEntries(updated);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(updated));
  }

  function saveEntry() {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const quickLinks = [
    {
      label: "Trade History",
      sub: "View all logged trades",
      icon: History,
      color: "#6AECE1",
      bg: "rgba(106,236,225,0.08)",
      border: "rgba(106,236,225,0.2)",
      path: "/history",
    },
    {
      label: "Economic Calendar",
      sub: "High-impact news events",
      icon: Globe,
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.2)",
      path: "/economic",
    },
    {
      label: "Risk Dashboard",
      sub: "Account balance & P&L",
      icon: BarChart2,
      color: "#FF3B3B",
      bg: "rgba(255,59,59,0.08)",
      border: "rgba(255,59,59,0.2)",
      path: "/risk",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <BookOpen size={20} style={{ color: "#F59E0B" }} />
        </div>
        <div>
          <h1 className="font-mono font-bold text-white text-lg uppercase tracking-widest">Trading Journal</h1>
          <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest">{fmtDate(date)}</p>
        </div>

        {/* Date navigator */}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setDate(d => offsetDay(d, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1A1A1A] transition-colors"
            style={{ border: "1px solid #222", color: "#555" }}>
            <ChevronLeft size={14} />
          </button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="font-mono text-xs px-3 py-1.5 rounded-lg focus:outline-none"
            style={{ background: "#111", border: "1px solid #222", color: "#888", colorScheme: "dark" }} />
          {date !== today && (
            <button onClick={() => setDate(today)}
              className="px-3 py-1.5 rounded-lg font-mono text-xs"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#F59E0B" }}>
              Today
            </button>
          )}
          <button onClick={() => setDate(d => offsetDay(d, 1))} disabled={date >= today}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1A1A1A] transition-colors disabled:opacity-30"
            style={{ border: "1px solid #222", color: "#555" }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4">
        {quickLinks.map(({ label, sub, icon: Icon, color, bg, border, path }) => (
          <button key={path} onClick={() => router.push(path)}
            className="flex items-center gap-3 p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: bg, border: `1px solid ${border}` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="font-mono text-sm font-bold text-white">{label}</p>
              <p className="font-sans text-[10px] mt-0.5" style={{ color: "#444" }}>{sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Day Bias */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6AECE1" }}>Day Bias</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { k: "BULLISH", label: "▲ Bullish", color: "#00FF7F", bg: "rgba(0,255,127,0.15)", b: "rgba(0,255,127,0.4)" },
            { k: "NEUTRAL", label: "— Neutral",  color: "#888",    bg: "rgba(255,255,255,0.08)", b: "#333" },
            { k: "BEARISH", label: "▼ Bearish", color: "#FF3B3B", bg: "rgba(255,59,59,0.15)",  b: "rgba(255,59,59,0.4)" },
          ] as const).map(({ k, label, color, bg, b }) => (
            <button key={k} onClick={() => update({ bias: entry.bias === k ? null : k })}
              className="py-2.5 rounded-xl font-mono text-xs font-bold transition-all"
              style={{
                background: entry.bias === k ? bg : "#111",
                border:     `1px solid ${entry.bias === k ? b : "#1A1A1A"}`,
                color:      entry.bias === k ? color : "#333",
                boxShadow:  entry.bias === k ? `0 0 10px 1px ${bg}` : "none",
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Journal notes */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#F59E0B" }}>Daily Notes</p>
        <textarea
          value={entry.notes}
          onChange={e => update({ notes: e.target.value })}
          placeholder="Write your trading notes for today — setups seen, trades taken, lessons learned, mindset..."
          rows={10}
          className="w-full bg-transparent font-sans text-sm text-white placeholder-[#2A2A2A] focus:outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Save */}
      <button onClick={saveEntry}
        className="w-full py-3 rounded-xl font-mono text-sm font-bold flex items-center justify-center gap-2 transition-all"
        style={{
          background: saved ? "rgba(0,255,127,0.15)" : "rgba(245,158,11,0.1)",
          border:     `1px solid ${saved ? "rgba(0,255,127,0.35)" : "rgba(245,158,11,0.25)"}`,
          color:      saved ? "#00FF7F" : "#F59E0B",
        }}>
        <Save size={14} />
        {saved ? "Saved ✓" : "Save Journal Entry"}
      </button>

    </div>
  );
}
