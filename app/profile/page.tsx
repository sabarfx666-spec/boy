"use client";
import { useMemo, useState } from "react";
import { useSabar } from "@/store/SabarContext";
import { Trade } from "@/store/types";
import { ArrowLeft, User, TrendingUp, Target, BarChart2, Activity, Brain, Clock, BookOpen, Layers, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/store/AuthContext";

function fmt(n: number) {
  const abs = Math.abs(n);
  const s = abs >= 1000 ? `${(abs / 1000).toFixed(1)}K` : abs.toFixed(0);
  return (n < 0 ? "-$" : "+$") + s;
}

function TradeCalendar({ trades }: { trades: Trade[] }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString("default", { month: "long", year: "numeric" });

  // Group taken trades by date
  const dayData = useMemo(() => {
    const map: Record<string, { pnl: number; count: number }> = {};
    trades.filter(t => t.decision === "TAKE").forEach(t => {
      if (!map[t.date]) map[t.date] = { pnl: 0, count: 0 };
      map[t.date].pnl   += t.pnl ?? 0;
      map[t.date].count += 1;
    });
    return map;
  }, [trades]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // Monthly stats
  const monthlyTrades = trades.filter(t => {
    const d = new Date(t.date);
    return t.decision === "TAKE" && d.getFullYear() === year && d.getMonth() === month;
  });
  const monthlyPnl   = monthlyTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const tradingDays  = new Set(monthlyTrades.map(t => t.date)).size;

  const isThisMonth = year === today.getFullYear() && month === today.getMonth();

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }
  function goToday()   { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); }

  const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="rounded-xl p-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#555" }}>
            <ChevronLeft size={15} />
          </button>
          <span className="font-mono text-sm font-bold text-white">{monthName}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#555" }}>
            <ChevronRight size={15} />
          </button>
          {!isThisMonth && (
            <button onClick={goToday} className="px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold transition-colors"
              style={{ background: "rgba(106,236,225,0.1)", border: "1px solid rgba(106,236,225,0.2)", color: "#6AECE1" }}>
              This month
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest">Monthly P&L</p>
            <p className="font-mono text-sm font-bold" style={{ color: monthlyPnl >= 0 ? "#00FF7F" : "#FF3B3B" }}>
              {monthlyPnl === 0 ? "$0" : fmt(monthlyPnl)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest">Trading Days</p>
            <p className="font-mono text-sm font-bold text-white">{tradingDays}</p>
          </div>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-8 gap-1 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center font-mono text-[10px] uppercase tracking-widest py-1" style={{ color: "#333" }}>{d}</div>
        ))}
        <div className="font-mono text-[10px] uppercase tracking-widest py-1 text-center" style={{ color: "#333" }}>Week</div>
      </div>

      {/* Calendar weeks */}
      <div className="space-y-1">
        {weeks.map((week, wi) => {
          const weekPnl   = week.reduce((s, day) => {
            if (!day) return s;
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            return s + (dayData[key]?.pnl ?? 0);
          }, 0);
          const weekDays  = week.filter(d => d !== null && (() => {
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d!).padStart(2, "0")}`;
            return (dayData[key]?.count ?? 0) > 0;
          })()).length;

          return (
            <div key={wi} className="grid grid-cols-8 gap-1">
              {week.map((day, di) => {
                if (!day) return <div key={di} className="rounded-lg h-14" style={{ background: "#080808" }} />;
                const key  = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const data = dayData[key];
                const isToday = isThisMonth && day === today.getDate();
                const bg = !data ? "#0D0D0D"
                  : data.pnl > 0 ? "rgba(0,255,127,0.12)"
                  : data.pnl < 0 ? "rgba(255,59,59,0.18)"
                  : "rgba(106,236,225,0.08)";
                const border = isToday ? "1px solid rgba(106,236,225,0.5)"
                  : !data ? "1px solid #141414"
                  : data.pnl > 0 ? "1px solid rgba(0,255,127,0.2)"
                  : data.pnl < 0 ? "1px solid rgba(255,59,59,0.25)"
                  : "1px solid rgba(106,236,225,0.15)";
                const pnlColor = data?.pnl != null
                  ? data.pnl > 0 ? "#00FF7F" : data.pnl < 0 ? "#FF5555" : "#6AECE1"
                  : "#333";

                return (
                  <div key={di} className="rounded-lg h-14 p-1.5 flex flex-col justify-between" style={{ background: bg, border }}>
                    <span className="font-mono text-[9px]" style={{ color: isToday ? "#6AECE1" : "#444" }}>{day}</span>
                    {data ? (
                      <>
                        <span className="font-mono text-[10px] font-bold leading-none" style={{ color: pnlColor }}>
                          {fmt(data.pnl)}
                        </span>
                        <span className="font-mono text-[9px]" style={{ color: "#444" }}>{data.count} trade{data.count !== 1 ? "s" : ""}</span>
                      </>
                    ) : null}
                  </div>
                );
              })}
              {/* Week summary */}
              <div className="rounded-lg h-14 p-1.5 flex flex-col justify-center items-center gap-0.5" style={{ background: "#080808", border: "1px solid #141414" }}>
                <span className="font-mono text-[9px]" style={{ color: "#333" }}>Wk {wi + 1}</span>
                {weekDays > 0 ? (
                  <>
                    <span className="font-mono text-[10px] font-bold" style={{ color: weekPnl >= 0 ? "#00FF7F" : "#FF5555" }}>
                      {fmt(weekPnl)}
                    </span>
                    <span className="font-mono text-[9px]" style={{ color: "#333" }}>{weekDays}d</span>
                  </>
                ) : <span className="font-mono text-[9px]" style={{ color: "#222" }}>—</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function tradePct(t: Trade) {
  return t.totalRules > 0 ? Math.round((t.checkedCount / t.totalRules) * 100) : 0;
}

function SectionHeader({ icon: Icon, title, sub, color = "#6AECE1" }: { icon: any; title: string; sub: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="font-mono font-bold text-white text-sm">{title}</p>
        <p className="font-mono text-[10px]" style={{ color: "#444" }}>{sub}</p>
      </div>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1A1A1A" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function EquityCurve({ trades }: { trades: Trade[] }) {
  const sorted = useMemo(() =>
    [...trades].filter(t => t.decision === "TAKE" && t.pnl != null)
      .sort((a, b) => a.date.localeCompare(b.date)), [trades]);

  if (sorted.length < 2) {
    return (
      <div className="flex items-center justify-center h-32" style={{ color: "#333" }}>
        <p className="font-mono text-xs">Need 2+ trades to show curve</p>
      </div>
    );
  }

  const points: number[] = [];
  let cum = 0;
  sorted.forEach(t => { cum += t.pnl ?? 0; points.push(cum); });

  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const range = max - min || 1;
  const W = 500, H = 100;
  const pad = 8;

  const coords = points.map((v, i) => ({
    x: pad + (i / (points.length - 1)) * (W - pad * 2),
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }));

  const d = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const fill = `${d} L ${coords[coords.length - 1].x} ${H} L ${coords[0].x} ${H} Z`;
  const isPositive = points[points.length - 1] >= 0;
  const lineColor = isPositive ? "#00FF7F" : "#FF3B3B";

  const zeroY = H - pad - ((0 - min) / range) * (H - pad * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
      <defs>
        <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="#1A1A1A" strokeWidth="1" strokeDasharray="4 4" />
      <path d={fill} fill="url(#eq-grad)" />
      <path d={d} fill="none" stroke={lineColor} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((p, i) => i === coords.length - 1 && (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={lineColor} />
      ))}
    </svg>
  );
}

function OutcomeDonut({ wins, losses, bes }: { wins: number; losses: number; bes: number }) {
  const total = wins + losses + bes || 1;
  const data = [
    { label: "WIN",  count: wins,   color: "#00FF7F", pct: Math.round((wins   / total) * 100) },
    { label: "LOSS", count: losses, color: "#FF3B3B", pct: Math.round((losses / total) * 100) },
    { label: "BE",   count: bes,    color: "#6AECE1", pct: Math.round((bes    / total) * 100) },
  ];
  return (
    <div className="flex flex-col gap-2">
      {data.map(({ label, count, color, pct }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase w-8" style={{ color: "#555" }}>{label}</span>
          <MiniBar value={count} max={total} color={color} />
          <span className="font-mono text-xs font-bold w-6 text-right" style={{ color }}>{pct}%</span>
          <span className="font-mono text-[10px] w-4 text-right" style={{ color: "#444" }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { state } = useSabar();
  const { user } = useAuth();

  const taken = useMemo(() => state.trades.filter(t => t.decision === "TAKE"), [state.trades]);
  const wins   = taken.filter(t => t.outcome === "WIN");
  const losses = taken.filter(t => t.outcome === "LOSS");
  const bes    = taken.filter(t => t.outcome === "BE");

  const winRate    = taken.length > 0 ? Math.round((wins.length / taken.length) * 100) : 0;
  const avgR       = wins.length > 0 ? (wins.reduce((s, t) => s + (t.rr ?? 0), 0) / wins.length) : 0;
  const totalPnl   = taken.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalR     = taken.reduce((s, t) => s + (wins.includes(t) ? (t.rr ?? 0) : losses.includes(t) ? -(t.rr ?? 0) : 0), 0);

  const avgWinPnl  = wins.length > 0  ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length   : 0;
  const avgLossPnl = losses.length > 0 ? losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length : 0;
  const profitFactor = losses.length > 0 && avgLossPnl !== 0
    ? Math.abs((wins.reduce((s, t) => s + (t.pnl ?? 0), 0)) / (losses.reduce((s, t) => s + (t.pnl ?? 0), 0))).toFixed(2)
    : wins.length > 0 ? "∞" : "0.00";

  const bestTrade  = taken.reduce<Trade | null>((best, t) => (!best || (t.pnl ?? 0) > (best.pnl ?? 0)) ? t : best, null);
  const worstTrade = taken.reduce<Trade | null>((worst, t) => (!worst || (t.pnl ?? 0) < (worst.pnl ?? 0)) ? t : worst, null);

  // Max consecutive wins/losses
  let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
  [...taken].sort((a, b) => a.date.localeCompare(b.date)).forEach(t => {
    if (t.outcome === "WIN") { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin); }
    else if (t.outcome === "LOSS") { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss); }
    else { curWin = 0; curLoss = 0; }
  });

  // Psychology tag frequency
  const psychCount: Record<string, number> = {};
  state.trades.forEach(t => t.psychology?.forEach(p => { psychCount[p] = (psychCount[p] ?? 0) + 1; }));
  const topPsych = Object.entries(psychCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Discipline
  const discipline = state.trades.length > 0
    ? Math.round((state.trades.filter(t => tradePct(t) >= 70).length / state.trades.length) * 100)
    : 0;

  // Session breakdown
  const sessionMap = taken.reduce((acc, t) => {
    const s = t.session === "LONDON" ? "London" : "New York";
    if (!acc[s]) acc[s] = { wins: 0, losses: 0, total: 0, r: 0 };
    acc[s].total++;
    if (t.outcome === "WIN")  { acc[s].wins++;   acc[s].r += (t.rr ?? 0); }
    if (t.outcome === "LOSS") { acc[s].losses++; acc[s].r -= (t.rr ?? 0); }
    return acc;
  }, {} as Record<string, { wins: number; losses: number; total: number; r: number }>);
  const sessionBreakdown = Object.entries(sessionMap);

  // Day of week
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayMap: Record<string, { wins: number; losses: number; total: number; pnl: number }> = {};
  taken.forEach(t => {
    const d = DAYS[new Date(t.date).getDay()];
    if (!dayMap[d]) dayMap[d] = { wins: 0, losses: 0, total: 0, pnl: 0 };
    dayMap[d].total++;
    if (t.outcome === "WIN")  dayMap[d].wins++;
    if (t.outcome === "LOSS") dayMap[d].losses++;
    dayMap[d].pnl += t.pnl ?? 0;
  });
  const tradingDays = ["Mon", "Tue", "Wed", "Thu", "Fri"].map(d => ({ day: d, ...(dayMap[d] ?? { wins: 0, losses: 0, total: 0, pnl: 0 }) }));
  const maxDayTotal = Math.max(...tradingDays.map(d => d.total), 1);

  // Top pairs
  const pairMap: Record<string, { r: number; count: number }> = {};
  wins.forEach(t => {
    if (!pairMap[t.pair]) pairMap[t.pair] = { r: 0, count: 0 };
    pairMap[t.pair].r += t.rr ?? 0;
    pairMap[t.pair].count++;
  });
  const topPairs = Object.entries(pairMap).sort((a, b) => b[1].r - a[1].r).slice(0, 3);

  // Grade distribution
  const grades = [
    { grade: "A*", color: "#00FF7F", bg: "rgba(0,255,127,0.08)", count: state.trades.filter(t => tradePct(t) >= 90).length },
    { grade: "B*", color: "#6AECE1", bg: "rgba(106,236,225,0.08)", count: state.trades.filter(t => tradePct(t) >= 70 && tradePct(t) < 90).length },
    { grade: "C",  color: "#F5A623", bg: "rgba(245,162,35,0.08)", count: state.trades.filter(t => tradePct(t) >= 50 && tradePct(t) < 70).length },
    { grade: "D",  color: "#FF3B3B", bg: "rgba(255,59,59,0.08)", count: state.trades.filter(t => tradePct(t) < 50).length },
  ];

  const topSession = Object.entries(sessionMap).sort((a, b) => b[1].total - a[1].total)[0]?.[0] ?? "—";
  const initials = user?.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  return (
    <div className="max-w-5xl mx-auto space-y-5 p-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/history" className="flex items-center gap-1.5 text-xs font-mono text-[#444] hover:text-white transition-colors">
          <ArrowLeft size={13} /> Back to Journal
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/history" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs text-[#555] hover:text-white hover:bg-white/5 transition-all">
            <BookOpen size={12} /> Journal
          </Link>
          <Link href="/accounts" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs text-[#555] hover:text-white hover:bg-white/5 transition-all">
            <Layers size={12} /> Accounts
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.3)" }}>
          <User size={20} style={{ color: "#E53E3E" }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono font-bold text-white text-lg tracking-wide">Trader Profile</h1>
            {user?.role === "admin" && (
              <span className="px-2 py-0.5 rounded font-mono text-[9px] font-bold" style={{ background: "rgba(229,62,62,0.15)", color: "#E53E3E" }}>Admin</span>
            )}
          </div>
          <p className="font-mono text-[10px] text-[#444]">Self-analysis & performance intelligence</p>
        </div>
      </div>

      {/* Trader Snapshot */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-xl p-5 space-y-4" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center font-mono font-black text-lg" style={{ background: "#E53E3E", color: "#fff" }}>
              {initials}
            </div>
            <div>
              <p className="font-mono font-bold text-white">{user?.name ?? "Trader"}</p>
              <p className="font-mono text-[10px] text-[#444]">{state.trades.length} total trades</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Primary Session", value: topSession, sub: "Most traded session",  Icon: Target,    color: "#6AECE1" },
              { label: "AVG R/Trade",     value: `+${avgR.toFixed(2)}R`, sub: "Per completed trade", Icon: TrendingUp, color: "#00FF7F" },
              { label: "Win Rate",        value: `${winRate}%`, sub: `${wins.length}W / ${losses.length}L`, Icon: BarChart2, color: "#00FF7F" },
              { label: "Discipline",      value: `${discipline}%`, sub: discipline >= 70 ? "Good" : discipline >= 50 ? "Average" : "Needs work", Icon: Target, color: discipline >= 70 ? "#00FF7F" : "#F5A623" },
            ].map(({ label, value, sub, Icon, color }) => (
              <div key={label} className="p-3 rounded-xl" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon size={11} style={{ color }} />
                  <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "#444" }}>{label}</p>
                </div>
                <p className="font-mono font-black text-sm" style={{ color }}>{value}</p>
                <p className="font-mono text-[9px] mt-0.5" style={{ color: "#444" }}>{sub}</p>
              </div>
            ))}
          </div>
          {topPairs.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: "#444" }}>Top Performing Pairs</p>
              <div className="flex gap-2 flex-wrap">
                {topPairs.map(([pair, { r, count }]) => (
                  <span key={pair} className="px-3 py-1 rounded-full font-mono text-xs font-bold"
                    style={{ background: "rgba(229,62,62,0.12)", color: "#E53E3E", border: "1px solid rgba(229,62,62,0.2)" }}>
                    {pair} +{r.toFixed(1)}R ({Math.round((count / taken.length) * 100)}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Session Breakdown */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
          <p className="font-mono text-xs font-bold text-white">Session Breakdown</p>
          {sessionBreakdown.length === 0 ? (
            <p className="font-mono text-[10px] text-[#333]">No data yet</p>
          ) : sessionBreakdown.map(([session, data]) => (
            <div key={session} className="p-3 rounded-lg" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-mono text-xs font-bold text-white">{session}</p>
                <span className="font-mono text-[10px]" style={{ color: data.r >= 0 ? "#00FF7F" : "#FF3B3B" }}>
                  {data.r >= 0 ? "+" : ""}{data.r.toFixed(1)}R
                </span>
              </div>
              <MiniBar value={data.wins} max={data.total} color="#00FF7F" />
              <p className="font-mono text-[9px] mt-1" style={{ color: "#444" }}>{data.wins}W / {data.losses}L</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trade Calendar */}
      <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <SectionHeader icon={Calendar} title="Trade Calendar" sub="Monthly P&L heatmap by trading day" color="#6AECE1" />
        <TradeCalendar trades={state.trades} />
      </div>

      {/* Visual Analytics */}
      <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <SectionHeader icon={Activity} title="Visual Analytics" sub="Performance charts and distribution" color="#6AECE1" />
        <div className="grid grid-cols-3 gap-5">
          {/* Equity Curve */}
          <div className="col-span-2 rounded-xl p-4" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#444" }}>Equity Curve (P&L)</p>
              <span className="font-mono text-xs font-bold" style={{ color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B" }}>
                {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
              </span>
            </div>
            <EquityCurve trades={state.trades} />
          </div>

          {/* Outcome Distribution */}
          <div className="rounded-xl p-4" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "#444" }}>Outcome Split</p>
            <OutcomeDonut wins={wins.length} losses={losses.length} bes={bes.length} />
            <div className="mt-4 pt-3 border-t" style={{ borderColor: "#1A1A1A" }}>
              <div className="grid grid-cols-2 gap-2">
                {grades.map(({ grade, color, bg, count }) => (
                  <div key={grade} className="p-2 rounded-lg text-center" style={{ background: bg, border: `1px solid ${color}22` }}>
                    <p className="font-mono font-black text-base" style={{ color }}>{grade}</p>
                    <p className="font-mono text-xs text-white font-bold">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk & Behavior Metrics */}
      <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <SectionHeader icon={Brain} title="Risk & Behavior Metrics" sub="Psychology patterns and discipline tracking" color="#F5A623" />
        <div className="grid grid-cols-3 gap-4">
          {/* Psychology tags */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#444" }}>Psychology Frequency</p>
            {topPsych.length === 0 ? (
              <p className="font-mono text-[10px] text-[#333]">No data yet</p>
            ) : topPsych.map(([tag, count]) => {
              const color = tag === "FOMO" ? "#FF3B3B" : tag === "CALM" ? "#00FF7F" : tag === "FEAR" ? "#F5A623" : tag === "GREED" ? "#FF3B3B" : "#6AECE1";
              return (
                <div key={tag} className="flex items-center gap-2">
                  <span className="font-mono text-[9px] uppercase w-14 flex-shrink-0" style={{ color: "#555" }}>{tag}</span>
                  <MiniBar value={count} max={Math.max(...topPsych.map(([, c]) => c))} color={color} />
                  <span className="font-mono text-xs font-bold w-4 text-right" style={{ color }}>{count}</span>
                </div>
              );
            })}
          </div>

          {/* Streak & discipline */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#444" }}>Streaks</p>
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-lg" style={{ background: "rgba(0,255,127,0.06)", border: "1px solid rgba(0,255,127,0.15)" }}>
                <p className="font-mono text-[9px] uppercase" style={{ color: "#444" }}>Best Win Streak</p>
                <p className="font-mono font-black text-2xl" style={{ color: "#00FF7F" }}>{maxWinStreak}</p>
                <p className="font-mono text-[9px]" style={{ color: "#444" }}>consecutive wins</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "rgba(255,59,59,0.06)", border: "1px solid rgba(255,59,59,0.15)" }}>
                <p className="font-mono text-[9px] uppercase" style={{ color: "#444" }}>Max Loss Streak</p>
                <p className="font-mono font-black text-2xl" style={{ color: "#FF3B3B" }}>{maxLossStreak}</p>
                <p className="font-mono text-[9px]" style={{ color: "#444" }}>consecutive losses</p>
              </div>
            </div>
          </div>

          {/* Rule adherence */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#444" }}>Rule Adherence</p>
            <div className="flex flex-col gap-2">
              {grades.map(({ grade, color, bg, count }) => {
                const pct = state.trades.length > 0 ? Math.round((count / state.trades.length) * 100) : 0;
                return (
                  <div key={grade} className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold w-5" style={{ color }}>{grade}</span>
                    <MiniBar value={count} max={state.trades.length || 1} color={color} />
                    <span className="font-mono text-[10px] w-8 text-right" style={{ color: "#444" }}>{pct}%</span>
                  </div>
                );
              })}
              <div className="pt-2 border-t mt-1" style={{ borderColor: "#1A1A1A" }}>
                <p className="font-mono text-[9px]" style={{ color: "#444" }}>Discipline score</p>
                <p className="font-mono font-black text-xl" style={{ color: discipline >= 70 ? "#00FF7F" : "#F5A623" }}>{discipline}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Statistics */}
      <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <SectionHeader icon={BarChart2} title="Performance Statistics" sub="Detailed trade metrics and key ratios" color="#00FF7F" />
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total R",       value: `${totalR >= 0 ? "+" : ""}${totalR.toFixed(1)}R`, color: totalR >= 0 ? "#00FF7F" : "#FF3B3B" },
            { label: "Total P&L",     value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? "#00FF7F" : "#FF3B3B" },
            { label: "Profit Factor", value: profitFactor, color: "#6AECE1" },
            { label: "Win Rate",      value: `${winRate}%`, color: "#00FF7F" },
            { label: "Avg Win",       value: wins.length > 0 ? `+$${avgWinPnl.toFixed(2)}` : "—", color: "#00FF7F" },
            { label: "Avg Loss",      value: losses.length > 0 ? `$${avgLossPnl.toFixed(2)}` : "—", color: "#FF3B3B" },
            { label: "Best Trade",    value: bestTrade?.pnl != null ? `+$${bestTrade.pnl.toFixed(2)}` : "—", color: "#00FF7F" },
            { label: "Worst Trade",   value: worstTrade?.pnl != null ? `$${worstTrade.pnl.toFixed(2)}` : "—", color: "#FF3B3B" },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-4 rounded-xl" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
              <p className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: "#444" }}>{label}</p>
              <p className="font-mono font-black text-base" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Time-based Analysis */}
      <div className="rounded-xl p-5" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
        <SectionHeader icon={Clock} title="Time-based Analysis" sub="Performance patterns by day and session" color="#A78BFA" />
        <div className="grid grid-cols-2 gap-5">
          {/* Day of week */}
          <div className="rounded-xl p-4" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "#444" }}>Performance by Day</p>
            <div className="space-y-2.5">
              {tradingDays.map(({ day, wins: w, losses: l, total, pnl }) => {
                const wr = total > 0 ? Math.round((w / total) * 100) : 0;
                const barColor = wr >= 60 ? "#00FF7F" : wr >= 40 ? "#F5A623" : total > 0 ? "#FF3B3B" : "#2A2A2A";
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] font-bold w-7 flex-shrink-0" style={{ color: "#555" }}>{day}</span>
                    <MiniBar value={total} max={maxDayTotal} color={barColor} />
                    <span className="font-mono text-[10px] w-8 text-right" style={{ color: "#444" }}>{total > 0 ? `${total}T` : "—"}</span>
                    <span className="font-mono text-[10px] w-12 text-right" style={{ color: total > 0 ? (pnl >= 0 ? "#00FF7F" : "#FF3B3B") : "#333" }}>
                      {total > 0 ? `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(0)}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session vs session */}
          <div className="rounded-xl p-4" style={{ background: "#0A0A0A", border: "1px solid #1A1A1A" }}>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "#444" }}>Session Performance</p>
            {sessionBreakdown.length === 0 ? (
              <p className="font-mono text-[10px] text-[#333]">No session data yet</p>
            ) : (
              <div className="space-y-4">
                {sessionBreakdown.map(([session, data]) => {
                  const wr = data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0;
                  return (
                    <div key={session} className="p-4 rounded-xl space-y-2" style={{ background: "#111", border: "1px solid #1A1A1A" }}>
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-sm font-bold text-white">{session}</p>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                          style={{ background: wr >= 50 ? "rgba(0,255,127,0.12)" : "rgba(255,59,59,0.12)", color: wr >= 50 ? "#00FF7F" : "#FF3B3B" }}>
                          {wr}% WR
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="font-mono text-[9px] uppercase" style={{ color: "#444" }}>Trades</p>
                          <p className="font-mono font-bold text-white">{data.total}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[9px] uppercase" style={{ color: "#444" }}>W/L</p>
                          <p className="font-mono font-bold" style={{ color: "#00FF7F" }}>{data.wins}W / {data.losses}L</p>
                        </div>
                        <div>
                          <p className="font-mono text-[9px] uppercase" style={{ color: "#444" }}>Total R</p>
                          <p className="font-mono font-bold" style={{ color: data.r >= 0 ? "#00FF7F" : "#FF3B3B" }}>
                            {data.r >= 0 ? "+" : ""}{data.r.toFixed(1)}R
                          </p>
                        </div>
                      </div>
                      <MiniBar value={data.wins} max={data.total || 1} color="#00FF7F" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
