"use client";
import { useRouter } from "next/navigation";
import { BookOpen, History, Globe, BarChart2 } from "lucide-react";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";

export default function JournalPage() {
  const router = useRouter();

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
    <div className="max-w-7xl mx-auto p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <BookOpen size={20} style={{ color: "#F59E0B" }} />
        </div>
        <div>
          <h1 className="font-mono font-bold text-white text-lg uppercase tracking-widest">Trading Journal</h1>
          <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
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

      {/* Calendar */}
      <CalendarGrid />

    </div>
  );
}
