"use client";
import { useState, useEffect, useRef } from "react";
import {
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Upload, X, Image as ImageIcon, FileText, Check, Send,
} from "lucide-react";
import { NewsAlarms } from "@/components/journal/NewsAlarms";

const WEEKLY_KEY    = "sabar-weekly-outlook";
const DISCORD_KEY   = "sabar-notify-discord";
const SAVED_PAIRS_KEY = "sabar-weekly-saved-pairs";

const PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "GBP/JPY", "EUR/JPY", "USD/CAD", "AUD/USD"];

interface WeeklyEntry {
  weekStart:   string;
  bias:        "BULLISH" | "BEARISH" | "RANGING" | null;
  pair:        string | null;
  dol:         "BSL" | "SSL" | "MIXED" | null;
  imgBefore:   string | null;
  imgAfter:    string | null;
  biases:      Record<string, "BULLISH" | "BEARISH" | "NEUTRAL">;
  keyLevels:   string;
  newsEvents:  string;
  confluences: string;
  gamePlan:    string;
  notes:       string;
  done:        boolean;
}

const BLANK = (ws: string): WeeklyEntry => ({
  weekStart: ws, bias: null, pair: null, dol: null,
  imgBefore: null, imgAfter: null, biases: {},
  keyLevels: "", newsEvents: "", confluences: "", gamePlan: "", notes: "", done: false,
});

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return d.toISOString().split("T")[0];
}
function offsetWeek(ws: string, n: number) {
  const d = new Date(ws); d.setDate(d.getDate() + n * 7);
  return d.toISOString().split("T")[0];
}
function formatWeek(ws: string) {
  const s = new Date(ws + "T12:00:00");
  const e = new Date(ws + "T12:00:00"); e.setDate(e.getDate() + 4);
  return `${s.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${e.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
}

export default function WeeklyOutlookPage() {
  const todayWeek = getWeekStart(new Date());
  const [weekStart, setWeekStart] = useState(todayWeek);
  const [entries, setEntries]     = useState<Record<string, WeeklyEntry>>({});
  const [savedPairs, setSavedPairs] = useState<string[]>(["EUR/USD","GBP/USD","XAU/USD","GBP/JPY"]);
  const [pairInput, setPairInput] = useState("");
  const [dragOver, setDragOver]   = useState<string | null>(null);
  const [discord, setDiscord]     = useState<"idle"|"sending"|"sent"|"error">("idle");
  const [saveFeedback, setSaveFeedback] = useState(false);
  const fileRefBefore = useRef<HTMLInputElement>(null);
  const fileRefAfter  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WEEKLY_KEY);
      if (raw) setEntries(JSON.parse(raw));
      const sp = localStorage.getItem(SAVED_PAIRS_KEY);
      if (sp) setSavedPairs(JSON.parse(sp));
    } catch {}
  }, []);

  const entry: WeeklyEntry = entries[weekStart] ?? BLANK(weekStart);

  function save(patch: Partial<WeeklyEntry>) {
    const updated = { ...entries, [weekStart]: { ...entry, ...patch } };
    setEntries(updated);
    localStorage.setItem(WEEKLY_KEY, JSON.stringify(updated));
  }

  function savePairsList(list: string[]) {
    setSavedPairs(list);
    localStorage.setItem(SAVED_PAIRS_KEY, JSON.stringify(list));
  }

  function readImg(key: "imgBefore" | "imgAfter", file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = ev => save({ [key]: ev.target?.result as string });
    reader.readAsDataURL(file);
  }

  function onPaste(key: "imgBefore" | "imgAfter") {
    return (e: React.ClipboardEvent) => {
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith("image/")) {
          readImg(key, item.getAsFile()); e.preventDefault(); break;
        }
      }
    };
  }

  function dataURLtoBlob(dataURL: string) {
    const [header, base64] = dataURL.split(",");
    const mime = header.match(/:(.*?);/)![1];
    const binary = atob(base64);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  async function sendDiscord() {
    const webhook = localStorage.getItem(DISCORD_KEY);
    if (!webhook) return alert("Set your Discord webhook in Admin → Notification Settings first.");
    setDiscord("sending");
    const label = `Week of ${formatWeek(weekStart)}`;
    const biasLines = Object.entries(entry.biases)
      .filter(([, b]) => b !== "NEUTRAL")
      .map(([pair, b]) => `• ${pair}: ${b}`)
      .join("\n") || "No biases set.";

    const embed = {
      title: `📊 ${label}`,
      color: entry.done ? 0x00FF7F : 0x6AECE1,
      fields: [
        entry.bias  ? { name: "📋 Overall Bias", value: entry.bias,  inline: true } : null,
        entry.pair  ? { name: "💱 Focus Pair",  value: entry.pair,  inline: true } : null,
        entry.dol   ? { name: "🎯 DOL",         value: entry.dol,   inline: true } : null,
        { name: "📈 Pair Biases", value: biasLines, inline: false },
        entry.keyLevels   ? { name: "🔑 Key Levels",   value: entry.keyLevels,   inline: false } : null,
        entry.newsEvents  ? { name: "📰 News Events",  value: entry.newsEvents,  inline: false } : null,
        entry.confluences ? { name: "⚡ Confluences",  value: entry.confluences, inline: false } : null,
        entry.gamePlan    ? { name: "📝 Game Plan",    value: entry.gamePlan,    inline: false } : null,
        entry.notes       ? { name: "💬 Notes",        value: entry.notes,       inline: false } : null,
      ].filter(Boolean) as object[],
      ...(entry.imgBefore ? { thumbnail: { url: "attachment://before.png" } } : {}),
      ...(entry.imgAfter  ? { image:     { url: "attachment://after.png"  } } : {}),
      footer: { text: `Sabar System · Weekly Outlook${entry.done ? " · ✅ Week Complete" : ""}` },
      timestamp: new Date().toISOString(),
    };

    try {
      const form = new FormData();
      form.append("payload_json", JSON.stringify({ username: "Sabar System", embeds: [embed] }));
      if (entry.imgBefore) form.append("files[0]", dataURLtoBlob(entry.imgBefore), "before.png");
      if (entry.imgAfter)  form.append("files[1]", dataURLtoBlob(entry.imgAfter),  "after.png");
      const res = await fetch(webhook, { method: "POST", body: form });
      setDiscord(res.ok || res.status === 204 ? "sent" : "error");
    } catch { setDiscord("error"); }
    setTimeout(() => setDiscord("idle"), 3000);
  }

  const isCurrentWeek = weekStart === todayWeek;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">

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
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(w => offsetWeek(w, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[#1A1A1A]"
            style={{ border: "1px solid #222", color: "#555" }}>
            <ChevronLeft size={14} />
          </button>
          {!isCurrentWeek && (
            <button onClick={() => setWeekStart(todayWeek)}
              className="px-3 py-1.5 rounded-lg font-mono text-xs"
              style={{ background: "rgba(106,236,225,0.1)", border: "1px solid rgba(106,236,225,0.25)", color: "#6AECE1" }}>
              This Week
            </button>
          )}
          {entry.done && (
            <span className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold"
              style={{ background: "rgba(0,255,127,0.1)", border: "1px solid rgba(0,255,127,0.25)", color: "#00FF7F" }}>
              ✓ Complete
            </span>
          )}
          <button onClick={() => setWeekStart(w => offsetWeek(w, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[#1A1A1A]"
            style={{ border: "1px solid #222", color: "#555" }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT */}
        <div className="space-y-4">

          {/* Overall Bias */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6AECE1" }}>Overall Weekly Bias</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: "BULLISH", label: "▲ Bullish", active: "rgba(0,255,127,0.15)", activeB: "rgba(0,255,127,0.4)", activeC: "#00FF7F" },
                { k: "BEARISH", label: "▼ Bearish", active: "rgba(255,59,59,0.15)", activeB: "rgba(255,59,59,0.4)",  activeC: "#FF3B3B" },
                { k: "RANGING", label: "↔ Ranging", active: "rgba(245,158,11,0.15)",activeB: "rgba(245,158,11,0.4)", activeC: "#F59E0B" },
              ].map(({ k, label, active, activeB, activeC }) => (
                <button key={k} onClick={() => save({ bias: entry.bias === k ? null : k as WeeklyEntry["bias"] })}
                  className="py-2.5 rounded-xl font-mono text-xs font-bold transition-all"
                  style={{
                    background: entry.bias === k ? active : "#111",
                    border:     `1px solid ${entry.bias === k ? activeB : "#1A1A1A"}`,
                    color:      entry.bias === k ? activeC : "#333",
                    boxShadow:  entry.bias === k ? `0 0 12px 1px ${active}` : "none",
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Focus Pair */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6AECE1" }}>Focus Pair</p>
            <div className="flex flex-wrap gap-2">
              {savedPairs.map(p => (
                <div key={p} className="group relative">
                  <button onClick={() => save({ pair: entry.pair === p ? null : p })}
                    className="font-mono text-xs font-bold pl-3 pr-6 py-1.5 rounded-lg transition-all"
                    style={{
                      background: entry.pair === p ? "rgba(106,236,225,0.15)" : "#111",
                      border:     `1px solid ${entry.pair === p ? "rgba(106,236,225,0.4)" : "#1A1A1A"}`,
                      color:      entry.pair === p ? "#6AECE1" : "#555",
                    }}>
                    {p}
                  </button>
                  <button
                    onClick={() => { savePairsList(savedPairs.filter(x => x !== p)); if (entry.pair === p) save({ pair: null }); }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#333] hover:text-[#FF3B3B] opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={pairInput} placeholder="Add pair… EUR/USD"
                onChange={e => setPairInput(e.target.value.toUpperCase())}
                onKeyDown={e => {
                  if (e.key === "Enter" && pairInput.trim()) {
                    const v = pairInput.trim();
                    if (!savedPairs.includes(v)) savePairsList([...savedPairs, v]);
                    save({ pair: v }); setPairInput("");
                  }
                }}
                className="flex-1 px-3 py-2 rounded-lg font-mono text-xs text-white placeholder-[#333] focus:outline-none"
                style={{ background: "#111", border: "1px solid #1A1A1A" }} />
              <button onClick={() => {
                const v = pairInput.trim();
                if (!v) return;
                if (!savedPairs.includes(v)) savePairsList([...savedPairs, v]);
                save({ pair: v }); setPairInput("");
              }} className="px-3 py-2 rounded-lg font-mono text-xs font-bold"
                style={{ background: "#111", border: "1px solid rgba(106,236,225,0.2)", color: "#6AECE1" }}>
                + Add
              </button>
            </div>
          </div>

          {/* DOL */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6AECE1" }}>Draw on Liquidity (DOL)</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: "BSL",   label: "BSL",   sub: "Buyside",  activeC: "#00FF7F", activeBg: "rgba(0,255,127,0.15)",  activeB: "rgba(0,255,127,0.4)"  },
                { k: "SSL",   label: "SSL",   sub: "Sellside", activeC: "#FF3B3B", activeBg: "rgba(255,59,59,0.15)",  activeB: "rgba(255,59,59,0.4)"  },
                { k: "MIXED", label: "Mixed", sub: "Both",     activeC: "#F59E0B", activeBg: "rgba(245,158,11,0.15)", activeB: "rgba(245,158,11,0.4)" },
              ].map(({ k, label, sub, activeC, activeBg, activeB }) => (
                <button key={k} onClick={() => save({ dol: entry.dol === k ? null : k as WeeklyEntry["dol"] })}
                  className="py-3 rounded-xl flex flex-col items-center gap-0.5 font-mono transition-all"
                  style={{
                    background: entry.dol === k ? activeBg : "#111",
                    border:     `1px solid ${entry.dol === k ? activeB : "#1A1A1A"}`,
                    color:      entry.dol === k ? activeC : "#333",
                  }}>
                  <span className="text-sm font-black">{label}</span>
                  <span className="text-[9px] opacity-70">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chart Screenshots */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <div className="flex items-center gap-2">
              <ImageIcon size={13} style={{ color: "#6AECE1" }} />
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6AECE1" }}>Chart Screenshots</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: "imgBefore" as const, label: "BEFORE", color: "#6AECE1", ref: fileRefBefore },
                { key: "imgAfter"  as const, label: "AFTER",  color: "#00FF7F", ref: fileRefAfter  },
              ]).map(({ key, label, color, ref }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <span className="font-mono text-[9px] font-black uppercase tracking-widest" style={{ color }}>{label}</span>
                  {entry[key] ? (
                    <div className="relative group rounded-lg overflow-hidden" style={{ border: "1px solid #1A1A1A" }}>
                      <img src={entry[key]!} alt={label} className="w-full object-cover rounded-lg" style={{ maxHeight: 150 }} />
                      <button onClick={() => save({ [key]: null })}
                        className="absolute top-1.5 right-1.5 p-1 rounded bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#FF3B3B]">
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <div tabIndex={0} onPaste={onPaste(key)}
                      onDrop={e => { e.preventDefault(); setDragOver(null); readImg(key, e.dataTransfer.files?.[0]); }}
                      onDragOver={e => { e.preventDefault(); setDragOver(key); }}
                      onDragLeave={() => setDragOver(null)}
                      onClick={() => ref.current?.click()}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-lg cursor-pointer transition-all py-8 focus:outline-none"
                      style={{
                        border: `2px dashed ${dragOver === key ? color : "#1A1A1A"}`,
                        background: dragOver === key ? `${color}08` : "#111",
                      }}>
                      <Upload size={16} style={{ color: "#333" }} />
                      <span className="font-mono text-[9px] font-bold" style={{ color: "#333" }}>Click or Paste</span>
                      <span className="font-mono text-[8px]" style={{ color: "#222" }}>Ctrl+V · Drag & Drop</span>
                    </div>
                  )}
                  <input ref={ref} type="file" accept="image/*" className="hidden"
                    onChange={e => readImg(key, e.target.files?.[0])} />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <div className="flex items-center gap-2">
              <FileText size={13} style={{ color: "#F59E0B" }} />
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#F59E0B" }}>Weekly Notes</p>
            </div>
            <textarea value={entry.notes} onChange={e => save({ notes: e.target.value })}
              placeholder="Overall narrative, expectations, what to look for this week..."
              rows={4}
              className="w-full bg-transparent font-sans text-sm text-white placeholder-[#333] focus:outline-none resize-none leading-relaxed" />
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">

          {/* Pair biases */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6AECE1" }}>Bias Per Pair</p>
            <div className="space-y-2">
              {PAIRS.map(pair => {
                const b = entry.biases[pair] ?? "NEUTRAL";
                return (
                  <div key={pair} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: "#111", border: "1px solid #1A1A1A" }}>
                    <span className="font-mono text-sm font-bold text-white">{pair}</span>
                    <div className="flex gap-1">
                      {(["BULLISH","NEUTRAL","BEARISH"] as const).map(bias => (
                        <button key={bias} onClick={() => save({ biases: { ...entry.biases, [pair]: bias } })}
                          className="px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-all"
                          style={{
                            background: b === bias ? bias === "BULLISH" ? "rgba(0,255,127,0.2)" : bias === "BEARISH" ? "rgba(255,59,59,0.2)" : "#222" : "transparent",
                            border:     `1px solid ${b === bias ? bias === "BULLISH" ? "rgba(0,255,127,0.4)" : bias === "BEARISH" ? "rgba(255,59,59,0.4)" : "#444" : "#1A1A1A"}`,
                            color:      b === bias ? bias === "BULLISH" ? "#00FF7F" : bias === "BEARISH" ? "#FF3B3B" : "#888" : "#2A2A2A",
                          }}>
                          {bias === "BULLISH" ? "▲" : bias === "BEARISH" ? "▼" : "—"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Levels */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#F59E0B" }}>Key Levels</p>
            <textarea value={entry.keyLevels} onChange={e => save({ keyLevels: e.target.value })}
              placeholder="Support & resistance levels to watch this week..."
              rows={4}
              className="w-full bg-transparent font-sans text-xs text-white placeholder-[#333] focus:outline-none resize-none leading-relaxed" />
          </div>

          {/* News Events */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#FF3B3B" }}>News Events</p>
            <textarea value={entry.newsEvents} onChange={e => save({ newsEvents: e.target.value })}
              placeholder="High impact news: FOMC, NFP, CPI — dates & times..."
              rows={4}
              className="w-full bg-transparent font-sans text-xs text-white placeholder-[#333] focus:outline-none resize-none leading-relaxed" />
          </div>

          {/* Confluences */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#6AECE1" }}>Confluences</p>
            <textarea value={entry.confluences} onChange={e => save({ confluences: e.target.value })}
              placeholder="Technical confluences, ICT concepts, structure..."
              rows={4}
              className="w-full bg-transparent font-sans text-xs text-white placeholder-[#333] focus:outline-none resize-none leading-relaxed" />
          </div>

          {/* Game Plan */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#00FF7F" }}>Weekly Game Plan</p>
            <textarea value={entry.gamePlan} onChange={e => save({ gamePlan: e.target.value })}
              placeholder="Full weekly game plan — setups to watch, rules, risk limits..."
              rows={5}
              className="w-full bg-transparent font-sans text-xs text-white placeholder-[#333] focus:outline-none resize-none leading-relaxed" />
          </div>
        </div>
      </div>

      {/* News Alarms */}
      <NewsAlarms />

      {/* Mark Complete */}
      <button onClick={() => save({ done: !entry.done })}
        className="w-full py-4 rounded-xl font-mono font-black text-sm tracking-widest transition-all"
        style={{
          background: entry.done ? "rgba(0,255,127,0.12)" : "transparent",
          border:     `2px ${entry.done ? "solid" : "dashed"} ${entry.done ? "#00FF7F" : "#1A1A1A"}`,
          color:      entry.done ? "#00FF7F" : "#333",
        }}>
        {entry.done ? "✓ WEEK COMPLETE" : "+ MARK WEEK COMPLETE"}
      </button>

      {/* Bottom row: Save + Discord */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => { localStorage.setItem(WEEKLY_KEY, JSON.stringify(entries)); setSaveFeedback(true); setTimeout(() => setSaveFeedback(false), 2000); }}
          className="py-3 rounded-xl font-mono text-sm font-bold flex items-center justify-center gap-2 transition-all"
          style={{
            background: saveFeedback ? "rgba(0,255,127,0.15)" : "rgba(106,236,225,0.1)",
            border:     `1px solid ${saveFeedback ? "rgba(0,255,127,0.35)" : "rgba(106,236,225,0.25)"}`,
            color:      saveFeedback ? "#00FF7F" : "#6AECE1",
          }}>
          {saveFeedback ? <><Check size={14} /> Saved</> : "Save Outlook"}
        </button>

        <button onClick={sendDiscord} disabled={discord === "sending"}
          className="py-3 rounded-xl font-mono text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{
            background: discord === "sent"  ? "rgba(0,255,127,0.12)" : discord === "error" ? "rgba(255,59,59,0.12)" : "rgba(88,101,242,0.1)",
            border:     `1px solid ${discord === "sent" ? "rgba(0,255,127,0.3)" : discord === "error" ? "rgba(255,59,59,0.3)" : "rgba(88,101,242,0.3)"}`,
            color:      discord === "sent"  ? "#00FF7F"  : discord === "error" ? "#FF3B3B" : "#5865F2",
          }}>
          <Send size={14} />
          {discord === "sending" ? "Sending…" : discord === "sent" ? "Sent!" : discord === "error" ? "Failed" : "Send to Discord"}
        </button>
      </div>

    </div>
  );
}
