"use client";
import { useState, useEffect } from "react";
import { useSabar } from "@/store/SabarContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { sendTradeToDiscord } from "@/lib/discord";
import { Send, CheckCircle, XCircle, Settings, Lock, Clock } from "lucide-react";

const WEBHOOK_KEY = "sabar-discord-webhook";
const DAILY_LIMIT = 2;

function useCountdownToMidnight() {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    function calc() {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    }
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, []);
  return timeLeft;
}

export function TradeSummary() {
  const { state, dispatch } = useSabar();
  const [notes, setNotes]         = useState("");
  const [outcome, setOutcome]     = useState<"WIN" | "LOSS" | "BE">("WIN");
  const [pnl, setPnl]             = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [actionType, setActionType] = useState<"TAKE" | "SKIP">("TAKE");
  const [webhookUrl, setWebhookUrl]   = useState("");
  const [webhookInput, setWebhookInput] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [manualUnlock, setManualUnlock] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  const countdown = useCountdownToMidnight();

  useEffect(() => {
    const saved = localStorage.getItem(WEBHOOK_KEY) ?? "";
    setWebhookUrl(saved);
    setWebhookInput(saved);
  }, []);

  const today      = new Date().toISOString().split("T")[0];
  const todayTakes = state.trades.filter(t => t.decision === "TAKE" && t.date === today);
  const isLocked   = todayTakes.length >= DAILY_LIMIT && !manualUnlock;

  const checkedRules   = state.rules.filter(r => r.checked);
  const totalRules     = state.rules.length;
  const pct            = totalRules > 0 ? Math.round((checkedRules.length / totalRules) * 100) : 0;
  const isBull         = state.currentBias === "BULLISH";
  const biasColor      = isBull ? "#00FF7F" : "#FF3B3B";
  const biasGlow       = isBull ? "0 0 16px 3px rgba(0,255,127,0.4)" : "0 0 16px 3px rgba(255,59,59,0.4)";
  const biasAnim       = isBull ? "anim-glow-green" : "anim-glow-red";
  const totalPnl       = state.trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const currentBalance = state.accountBalance + totalPnl;

  const handleAction = (type: "TAKE" | "SKIP") => { setActionType(type); setShowModal(true); };

  const confirmAction = async () => {
    const parsedPnl = pnl !== "" ? parseFloat(pnl) : undefined;
    dispatch({
      type: actionType === "TAKE" ? "TAKE_TRADE" : "SKIP_TRADE",
      payload: { outcome: actionType === "TAKE" ? outcome : undefined, notes: notes.trim() || undefined, pnl: parsedPnl },
    });
    if (webhookUrl) {
      setSendStatus("sending");
      try {
        await sendTradeToDiscord(webhookUrl, {
          pair: state.currentPair, bias: state.currentBias, session: state.currentSession,
          decision: actionType, outcome: actionType === "TAKE" ? outcome : undefined,
          pnl: parsedPnl, rr: 0, checkedCount: checkedRules.length, totalRules,
          notes: notes.trim() || undefined, accountBalance: currentBalance,
          riskAmount: (currentBalance * state.riskPercent) / 100,
        });
        setSendStatus("ok");
      } catch { setSendStatus("error"); }
      setTimeout(() => setSendStatus("idle"), 3000);
    }
    setNotes(""); setOutcome("WIN"); setPnl(""); setShowModal(false);
  };

  const saveWebhook = () => {
    localStorage.setItem(WEBHOOK_KEY, webhookInput);
    setWebhookUrl(webhookInput);
    setShowSettings(false);
  };

  const pctColor = pct === 100 ? "#00FF7F" : pct >= 80 ? "#6AECE1" : pct >= 50 ? "#F59E0B" : "#FF3B3B";

  return (
    <>
      <div
        className="shimmer-card relative overflow-hidden rounded-xl p-5 h-full flex flex-col gap-4"
        style={{ background: "#0D0D0D", border: isLocked ? "1px solid rgba(255,59,59,0.35)" : "1px solid #1A1A1A" }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
          style={{ background: `linear-gradient(90deg, transparent, ${biasColor}, transparent)`, opacity: 0.5 }} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#444" }}>Trade Summary</h3>
          {isLocked && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: "rgba(255,59,59,0.12)", border: "1px solid rgba(255,59,59,0.3)" }}>
              <Lock size={10} style={{ color: "#FF3B3B" }} />
              <span className="font-mono text-[10px] font-bold" style={{ color: "#FF3B3B" }}>LOCKED</span>
            </div>
          )}
        </div>

        {/* Discord button */}
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 hover:opacity-90"
          style={{
            background: webhookUrl ? "rgba(88,101,242,0.18)" : "rgba(88,101,242,0.06)",
            border: `1px solid ${webhookUrl ? "#5865F266" : "rgba(88,101,242,0.2)"}`,
          }}
        >
          <div className="flex items-center gap-2">
            <Send size={13} style={{ color: "#5865F2" }} />
            <span className="font-mono text-xs font-bold" style={{ color: "#5865F2" }}>
              {webhookUrl ? "Discord Connected" : "Connect Discord"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {sendStatus === "sending" && <span className="font-mono text-[10px] text-[#5865F2] animate-pulse">Sending…</span>}
            {sendStatus === "ok"      && <CheckCircle size={13} style={{ color: "#00FF7F" }} />}
            {sendStatus === "error"   && <XCircle size={13} style={{ color: "#FF3B3B" }} />}
            <div className="w-2 h-2 rounded-full" style={{ background: webhookUrl ? "#5865F2" : "#222",
              boxShadow: webhookUrl ? "0 0 6px 2px rgba(88,101,242,0.6)" : "none" }} />
            <Settings size={12} style={{ color: "#5865F2" }} />
          </div>
        </button>

        {/* Trade info */}
        <div className="flex-1 space-y-2">
          {[
            {
              label: "Direction",
              value: isBull ? "↑ BULLISH" : "↓ BEARISH",
              color: biasColor,
            },
            {
              label: "Session",
              value: state.currentSession === "LONDON" ? "London" : "New York",
              color: "#fff",
            },
            {
              label: "Pair",
              value: state.currentPair,
              color: biasColor,
            },
            {
              label: "Rules",
              value: `${checkedRules.length}/${totalRules}`,
              extra: `${pct}%`,
              extraColor: pctColor,
            },
            ...(state.currentPsychology.length > 0
              ? [{ label: "Psych", value: state.currentPsychology.join(", "), color: "#A0A0A0" }]
              : []),
          ].map(({ label, value, color, extra, extraColor }: any) => (
            <div key={label} className="flex justify-between items-center font-mono text-sm">
              <span style={{ color: "#555" }}>{label}</span>
              <span style={{ color: color ?? "#fff", fontWeight: 600 }}>
                {value}
                {extra && <span className="ml-1.5 text-xs" style={{ color: extraColor }}>{extra}</span>}
              </span>
            </div>
          ))}

          {/* Trades today */}
          <div className="flex justify-between items-center font-mono text-sm pt-2 border-t" style={{ borderColor: "#1A1A1A" }}>
            <span style={{ color: "#555" }}>Trades Today</span>
            <span style={{ color: todayTakes.length >= DAILY_LIMIT ? "#FF3B3B" : todayTakes.length === DAILY_LIMIT - 1 ? "#F59E0B" : "#00FF7F", fontWeight: 700 }}>
              {todayTakes.length} / {DAILY_LIMIT}
            </span>
          </div>
        </div>

        {/* LOCKED */}
        {isLocked ? (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,59,59,0.35)" }}>
            <div className="flex flex-col items-center py-4 gap-1.5" style={{ background: "rgba(255,59,59,0.08)" }}>
              <Lock size={24} style={{ color: "#FF3B3B" }} />
              <p className="font-mono text-xs font-bold text-white tracking-widest uppercase">Daily Limit Reached</p>
              <p className="font-sans text-[11px] text-[#555]">{DAILY_LIMIT} trades taken today</p>
            </div>
            <div className="flex flex-col items-center py-3 gap-1" style={{ background: "rgba(255,59,59,0.04)" }}>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#444]">Unlocks in</p>
              <div className="flex items-center gap-2">
                <Clock size={13} style={{ color: "#FF3B3B" }} />
                <span className="font-mono text-xl font-bold tracking-widest" style={{ color: "#FF3B3B" }}>{countdown}</span>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <Button variant="skip" className="w-full" onClick={() => handleAction("SKIP")}>SKIP TRADE</Button>
              <button onClick={() => setShowUnlockConfirm(true)}
                className="w-full py-2 rounded-xl font-mono text-xs font-bold tracking-widest hover:opacity-80 transition-opacity"
                style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.25)", color: "#FF3B3B" }}>
                🔓 OVERRIDE UNLOCK
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => handleAction("TAKE")}
              className={`w-full py-3 rounded-xl font-mono font-black text-sm tracking-widest uppercase transition-all duration-200 ${biasAnim}`}
              style={{ background: biasColor, color: "#000", boxShadow: biasGlow }}
            >
              {isBull ? "↑ TAKE TRADE" : "↓ TAKE TRADE"}
            </button>
            <Button variant="skip" className="w-full" onClick={() => handleAction("SKIP")}>SKIP TRADE</Button>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={actionType === "TAKE" ? "Confirm Trade" : "Skip Trade"}>
        <div className="space-y-4">
          {actionType === "TAKE" && (
            <>
              <div>
                <label className="font-mono text-xs text-[#A0A0A0] uppercase tracking-widest block mb-2">Outcome</label>
                <div className="flex gap-2">
                  {(["WIN", "LOSS", "BE"] as const).map(o => (
                    <button key={o} onClick={() => setOutcome(o)}
                      className={`flex-1 py-2 rounded-lg font-mono text-sm font-bold border transition-colors ${
                        outcome === o
                          ? o === "WIN"  ? "bg-[#00FF7F] text-black border-[#00FF7F]"
                          : o === "LOSS" ? "bg-[#FF3B3B] text-white border-[#FF3B3B]"
                          :                "bg-[#6AECE1] text-black border-[#6AECE1]"
                          : "bg-[#1A1A1A] text-[#A0A0A0] border-[#2A2A2A] hover:text-white"
                      }`}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-mono text-xs text-[#A0A0A0] uppercase tracking-widest block mb-2">P&L ($)</label>
                <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 focus-within:border-[#6AECE1]">
                  <span className="font-mono text-sm text-[#555]">$</span>
                  <input type="number" step="0.01" value={pnl} onChange={e => setPnl(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent font-mono text-sm text-white focus:outline-none placeholder-[#444]" />
                </div>
                <p className="font-mono text-[10px] text-[#444] mt-1">Negative for a loss, e.g. -50.00</p>
              </div>
            </>
          )}
          <div>
            <label className="font-mono text-xs text-[#A0A0A0] uppercase tracking-widest block mb-2">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Trade rationale..." rows={3}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white font-mono text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-[#6AECE1] placeholder-[#A0A0A0] resize-none" />
          </div>
          {webhookUrl && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(88,101,242,0.1)", border: "1px solid rgba(88,101,242,0.3)" }}>
              <Send size={12} style={{ color: "#5865F2" }} />
              <span className="font-mono text-[11px]" style={{ color: "#5865F2" }}>Will auto-send to Discord on confirm</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant={actionType === "TAKE" ? "take" : "skip"} className="flex-1" onClick={confirmAction}>Confirm</Button>
          </div>
        </div>
      </Modal>

      {/* Unlock confirmation modal */}
      <Modal open={showUnlockConfirm} onClose={() => setShowUnlockConfirm(false)} title="Override Daily Limit">
        <div className="space-y-4">
          <div className="rounded-lg px-4 py-4 text-center" style={{ background: "rgba(255,59,59,0.08)", border: "1px solid rgba(255,59,59,0.25)" }}>
            <p className="text-3xl mb-2">⚠️</p>
            <p className="font-mono text-sm font-bold text-white mb-1">Are you sure?</p>
            <p className="font-sans text-xs text-[#A0A0A0]">You already took {todayTakes.length} trades today. Overriding your daily limit can hurt your discipline.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowUnlockConfirm(false)}>Stay Locked</Button>
            <Button variant="skip" className="flex-1" onClick={() => { setManualUnlock(true); setShowUnlockConfirm(false); }}>Unlock Anyway</Button>
          </div>
        </div>
      </Modal>

      {/* Discord settings modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Discord Webhook">
        <div className="space-y-4">
          <div>
            <label className="font-mono text-xs text-[#A0A0A0] uppercase tracking-widest block mb-2">Webhook URL</label>
            <input type="text" value={webhookInput} onChange={e => setWebhookInput(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] text-white font-mono text-xs px-3 py-2.5 rounded-lg focus:outline-none focus:border-[#5865F2] placeholder-[#444]" />
            <p className="font-mono text-[10px] text-[#444] mt-1.5">Discord → Edit Channel → Integrations → Webhooks → New Webhook → Copy URL</p>
          </div>
          <div className="rounded-lg px-3 py-3 space-y-1" style={{ background: "rgba(88,101,242,0.08)", border: "1px solid rgba(88,101,242,0.2)" }}>
            <p className="font-mono text-[10px] font-bold" style={{ color: "#5865F2" }}>HOW TO GET YOUR WEBHOOK</p>
            {["1. Open Discord → your server","2. Right-click a channel → Edit Channel","3. Integrations → Webhooks → New Webhook","4. Copy Webhook URL → paste above"].map(s => (
              <p key={s} className="font-sans text-[11px] text-[#888]">{s}</p>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => { setWebhookInput(""); localStorage.removeItem(WEBHOOK_KEY); setWebhookUrl(""); setShowSettings(false); }}>Clear</Button>
            <Button variant="primary" className="flex-1" style={{ background: "#5865F2", color: "#fff" }} onClick={saveWebhook}>Save Webhook</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
