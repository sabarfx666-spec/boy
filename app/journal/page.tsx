"use client";
import { useState, useEffect } from "react";
import { BookOpen, Save, ChevronLeft, ChevronRight, Trash2, TrendingUp, TrendingDown, Minus, Send, Settings, ChevronDown } from "lucide-react";

const JOURNAL_KEY   = "sabar-journal-entries";
const NOSHIN_CHAT_KEY = "sabar-noshin-chat-id";
const TG_TOKEN_KEY  = "sabar-notify-tg-token";

const MOODS = [
  { label: "Focused",   emoji: "🎯", color: "#6AECE1" },
  { label: "Confident", emoji: "💪", color: "#00FF7F" },
  { label: "Calm",      emoji: "😌", color: "#29A8EB" },
  { label: "Anxious",   emoji: "😰", color: "#F59E0B" },
  { label: "FOMO",      emoji: "😤", color: "#FF3B3B" },
  { label: "Revenge",   emoji: "😡", color: "#E53E3E" },
];

const GRADES = ["A+", "A", "B", "C", "D", "F"];

interface JournalEntry {
  date: string;
  mood: string;
  grade: string;
  dayBias: "BULLISH" | "BEARISH" | "NEUTRAL";
  whatWentWell: string;
  whatWentWrong: string;
  lessons: string;
  plan: string;
}

export default function JournalPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<Record<string, JournalEntry>>({});
  const [saved, setSaved] = useState(false);
  const [noshinChatId, setNoshinChatId] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle"|"sending"|"ok"|"err">("idle");
  const [showNoshinSettings, setShowNoshinSettings] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(JOURNAL_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {}
    setNoshinChatId(localStorage.getItem(NOSHIN_CHAT_KEY) ?? "");
  }, []);

  async function sendToNoshin() {
    const token = localStorage.getItem(TG_TOKEN_KEY);
    const chatId = noshinChatId.trim();
    if (!token || !chatId) { setShowNoshinSettings(true); return; }

    setSendStatus("sending");
    const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

    const escape = (s: string) => s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");

    const lines = [
      `📓 *Journal Entry — ${escape(displayDate)}*`,
      entry.dayBias !== "NEUTRAL" ? `📊 Bias: ${entry.dayBias === "BULLISH" ? "🟢 Bullish" : "🔴 Bearish"}` : "",
      entry.mood    ? `😊 Mood: ${entry.mood}` : "",
      entry.grade   ? `🏆 Grade: ${entry.grade}` : "",
      "",
      entry.whatWentWell  ? `✅ *What Went Well:*\n${escape(entry.whatWentWell)}` : "",
      entry.whatWentWrong ? `❌ *What Went Wrong:*\n${escape(entry.whatWentWrong)}` : "",
      entry.lessons       ? `💡 *Key Lessons:*\n${escape(entry.lessons)}` : "",
      entry.plan          ? `📋 *Tomorrow's Plan:*\n${escape(entry.plan)}` : "",
    ].filter(Boolean).join("\n");

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: lines, parse_mode: "MarkdownV2" }),
      });
      const data = await res.json();
      setSendStatus(data.ok ? "ok" : "err");
    } catch {
      setSendStatus("err");
    }
    setTimeout(() => setSendStatus("idle"), 3000);
  }

  const entry: JournalEntry = entries[date] ?? {
    date, mood: "", grade: "", dayBias: "NEUTRAL",
    whatWentWell: "", whatWentWrong: "", lessons: "", plan: "",
  };

  function update(patch: Partial<JournalEntry>) {
    const updated = { ...entries, [date]: { ...entry, ...patch } };
    setEntries(updated);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(updated));
  }

  function deleteEntry() {
    if (!confirm("Delete this journal entry?")) return;
    const updated = { ...entries };
    delete updated[date];
    setEntries(updated);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(updated));
  }

  function saveEntry() {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function shiftDate(n: number) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + n);
    setDate(d.toISOString().split("T")[0]);
  }

  const isToday = date === new Date().toISOString().split("T")[0];
  const hasEntry = !!entries[date];
  const allDates = Object.keys(entries).sort((a, b) => b.localeCompare(a));
  const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <BookOpen size={20} style={{ color: "#F59E0B" }} />
          </div>
          <div>
            <h1 className="font-mono font-bold text-white text-lg uppercase tracking-widest">Trading Journal</h1>
            <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest">{displayDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => shiftDate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1A1A1A] transition-colors"
            style={{ border: "1px solid #222", color: "#555" }}>
            <ChevronLeft size={14} />
          </button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg font-mono text-xs text-white focus:outline-none"
            style={{ background: "#111", border: "1px solid #222" }} />
          {!isToday && (
            <button onClick={() => setDate(new Date().toISOString().split("T")[0])}
              className="px-3 py-1.5 rounded-lg font-mono text-xs transition-colors hover:opacity-80"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#F59E0B" }}>
              Today
            </button>
          )}
          <button onClick={() => shiftDate(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1A1A1A] transition-colors"
            style={{ border: "1px solid #222", color: "#555" }}>
            <ChevronRight size={14} />
          </button>
          {hasEntry && (
            <button onClick={deleteEntry}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:opacity-80"
              style={{ border: "1px solid rgba(255,59,59,0.3)", background: "rgba(255,59,59,0.08)", color: "#FF3B3B" }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">

          {/* Day Bias */}
          <div className="rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#444] mb-3">Day Bias</p>
            <div className="flex gap-2">
              {(["BULLISH", "NEUTRAL", "BEARISH"] as const).map(b => {
                const active = entry.dayBias === b;
                const color  = b === "BULLISH" ? "#00FF7F" : b === "BEARISH" ? "#FF3B3B" : "#888";
                const Icon   = b === "BULLISH" ? TrendingUp : b === "BEARISH" ? TrendingDown : Minus;
                return (
                  <button key={b} onClick={() => update({ dayBias: b })}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-mono text-xs font-bold transition-all"
                    style={{
                      background: active ? `${color}18` : "transparent",
                      border: `1px solid ${active ? color + "50" : "#1A1A1A"}`,
                      color: active ? color : "#333",
                    }}>
                    <Icon size={13} /> {b}
                  </button>
                );
              })}
            </div>
          </div>

          {[
            { field: "whatWentWell",  label: "✓ What Went Well",    color: "#00FF7F", placeholder: "What did you execute well today? Which rules did you follow?" },
            { field: "whatWentWrong", label: "✗ What Went Wrong",   color: "#FF3B3B", placeholder: "Where did you break rules? What mistakes did you make?" },
            { field: "lessons",       label: "💡 Key Lessons",       color: "#6AECE1", placeholder: "What did you learn today? What will you do differently?" },
            { field: "plan",          label: "📋 Tomorrow's Plan",   color: "#F59E0B", placeholder: "Pairs to watch, bias, key levels for tomorrow..." },
          ].map(({ field, label, color, placeholder }) => (
            <div key={field} className="rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color }}>{label}</p>
              <textarea
                value={(entry as unknown as Record<string, string>)[field]}
                onChange={e => update({ [field]: e.target.value } as Partial<JournalEntry>)}
                placeholder={placeholder}
                rows={4}
                className="w-full bg-transparent font-sans text-sm text-white placeholder-[#333] focus:outline-none resize-none leading-relaxed"
              />
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Mood */}
          <div className="rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#444] mb-3">Mood Today</p>
            <div className="grid grid-cols-2 gap-2">
              {MOODS.map(m => {
                const active = entry.mood === m.label;
                return (
                  <button key={m.label} onClick={() => update({ mood: m.label })}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs font-bold transition-all"
                    style={{
                      background: active ? `${m.color}15` : "#111",
                      border: `1px solid ${active ? m.color + "40" : "#1A1A1A"}`,
                      color: active ? m.color : "#444",
                    }}>
                    <span>{m.emoji}</span> {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grade */}
          <div className="rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#444] mb-3">Day Grade</p>
            <div className="grid grid-cols-3 gap-2">
              {GRADES.map(g => {
                const active = entry.grade === g;
                const color  = ["A+","A"].includes(g) ? "#00FF7F" : g === "B" ? "#6AECE1" : g === "C" ? "#F59E0B" : "#FF3B3B";
                return (
                  <button key={g} onClick={() => update({ grade: g })}
                    className="py-2.5 rounded-xl font-mono text-sm font-bold transition-all"
                    style={{
                      background: active ? `${color}15` : "#111",
                      border: `1px solid ${active ? color + "50" : "#1A1A1A"}`,
                      color: active ? color : "#333",
                    }}>
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Past Entries */}
          <div className="rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#444] mb-3">Past Entries ({allDates.length})</p>
            {allDates.length === 0 ? (
              <p className="font-mono text-[10px] text-[#222] text-center py-4">No entries yet</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {allDates.map(d => {
                  const e = entries[d];
                  const isActive = d === date;
                  const gc = !e.grade ? "#444" : ["A+","A"].includes(e.grade) ? "#00FF7F" : e.grade === "B" ? "#6AECE1" : e.grade === "C" ? "#F59E0B" : "#FF3B3B";
                  return (
                    <button key={d} onClick={() => setDate(d)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-left"
                      style={{ background: isActive ? "#1A1A1A" : "transparent", border: `1px solid ${isActive ? "#2A2A2A" : "transparent"}` }}>
                      <span className="font-mono text-[11px] text-white">
                        {new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <div className="flex items-center gap-2">
                        {e.mood && <span className="text-[10px]">{MOODS.find(m => m.label === e.mood)?.emoji}</span>}
                        {e.grade && <span className="font-mono text-[10px] font-bold" style={{ color: gc }}>{e.grade}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Save */}
          <button onClick={saveEntry}
            className="w-full py-3 rounded-xl font-mono text-sm font-bold transition-all flex items-center justify-center gap-2"
            style={{
              background: saved ? "rgba(0,255,127,0.15)" : "rgba(245,158,11,0.1)",
              border: `1px solid ${saved ? "rgba(0,255,127,0.35)" : "rgba(245,158,11,0.25)"}`,
              color: saved ? "#00FF7F" : "#F59E0B",
            }}>
            <Save size={14} />
            {saved ? "Saved ✓" : "Save Entry"}
          </button>

          {/* Send to Noshin */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(41,168,235,0.3)" }}>
            {/* Header */}
            <button
              onClick={() => setShowNoshinSettings(v => !v)}
              className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-[#0A0A0A] transition-colors"
              style={{ background: "rgba(41,168,235,0.06)" }}
            >
              <Settings size={11} style={{ color: "#29A8EB" }} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "#29A8EB" }}>
                Noshin Settings
              </span>
              <ChevronDown size={11} className="ml-auto transition-transform duration-200"
                style={{ color: "#444", transform: showNoshinSettings ? "rotate(180deg)" : "rotate(0deg)" }} />
            </button>

            {showNoshinSettings && (
              <div className="px-4 py-3 space-y-2" style={{ background: "#0A0A0A", borderTop: "1px solid #1A1A1A" }}>
                <p className="font-mono text-[10px] text-[#444]">Noshin's Telegram Chat ID</p>
                <input
                  type="text"
                  value={noshinChatId}
                  onChange={e => {
                    setNoshinChatId(e.target.value);
                    localStorage.setItem(NOSHIN_CHAT_KEY, e.target.value);
                  }}
                  placeholder="e.g. 123456789"
                  className="w-full px-3 py-2 rounded-lg font-mono text-xs text-white placeholder-[#333] focus:outline-none"
                  style={{ background: "#111", border: "1px solid #222" }}
                />
                <p className="font-mono text-[9px] text-[#333]">
                  Ask Noshin to message @userinfobot on Telegram to get their Chat ID
                </p>
              </div>
            )}

            <button
              onClick={sendToNoshin}
              disabled={sendStatus === "sending"}
              className="w-full py-3 flex items-center justify-center gap-2 font-mono text-sm font-bold transition-all disabled:opacity-50"
              style={{
                background: sendStatus === "ok"  ? "rgba(0,255,127,0.15)"
                          : sendStatus === "err" ? "rgba(255,59,59,0.12)"
                          : "rgba(41,168,235,0.12)",
                color: sendStatus === "ok"  ? "#00FF7F"
                     : sendStatus === "err" ? "#FF3B3B"
                     : "#29A8EB",
                borderTop: "1px solid rgba(41,168,235,0.2)",
              }}>
              <Send size={14} />
              {sendStatus === "sending" ? "Sending…"
               : sendStatus === "ok"    ? "Sent to Noshin ✓"
               : sendStatus === "err"   ? "Failed — check Chat ID"
               : "Send to Noshin"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
