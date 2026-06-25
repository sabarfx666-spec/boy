"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { LayoutDashboard, BarChart2, ScrollText, CalendarDays, Globe, User, Clock, LogOut, ChevronDown, Shield, TrendingUp, BookOpen, Sun, Moon, Target } from "lucide-react";
import { useAuth } from "@/store/AuthContext";

const navItems = [
  { href: "/",        label: "Dashboard",      icon: LayoutDashboard },
  { href: "/weekly",  label: "Weekly Outlook", icon: TrendingUp       },
  { href: "/history", label: "Journal",        icon: BookOpen         },
  { href: "/habits",  label: "Habits",         icon: Target           },
];

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now
    ? now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "---";

  const timeStr = now
    ? now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
    : "--:--:--";

  const tz = now
    ? now.toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ").pop() ?? ""
    : "";

  return (
    <div className="flex items-center gap-2">
      {/* Date */}
      <div
        className="px-3 py-1.5 rounded-lg font-mono text-xs font-semibold text-white"
        style={{ background: "#111", border: "1px solid #222" }}
      >
        {dateStr}
      </div>

      {/* Time */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold"
        style={{ background: "#0A1A12", border: "1px solid #1A3A24", color: "#00FF7F" }}
      >
        <Clock size={11} strokeWidth={2.5} />
        {timeStr} <span className="text-[#00994D] ml-0.5">{tz}</span>
      </div>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold font-sans text-white transition-all hover:opacity-90"
        style={{ background: "#E53E3E", boxShadow: "0 0 12px 2px rgba(229,62,62,0.3)" }}
      >
        <User size={13} strokeWidth={2} />
        Login
      </Link>
    );
  }

  const initials = user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold font-sans transition-all hover:opacity-90"
        style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
      >
        {/* Avatar */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold"
          style={{ background: "#E53E3E", color: "#fff" }}
        >
          {initials}
        </div>
        <span className="text-white max-w-[80px] truncate">{user.name}</span>
        <ChevronDown size={11} className="text-[#666]" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-50"
          style={{ background: "#111", border: "1px solid #2A2A2A", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
        >
          <div className="px-4 py-3 border-b border-[#1A1A1A]">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-white truncate">{user.name}</p>
              {user.role === "admin" && (
                <span className="px-1.5 py-0.5 rounded font-mono text-[9px] font-bold" style={{ background: "rgba(229,62,62,0.15)", color: "#E53E3E" }}>ADMIN</span>
              )}
            </div>
          </div>
          {user.role === "admin" && (
            <button
              onClick={() => { setOpen(false); router.push("/admin"); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-sans text-[#E53E3E] hover:bg-[#1A1A1A] transition-colors border-b border-[#1A1A1A]"
            >
              <Shield size={14} />
              User Management
            </button>
          )}
          <button
            onClick={() => { logout(); setOpen(false); router.push("/login"); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-sans text-[#FF3B3B] hover:bg-[#1A1A1A] transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

const HIDDEN_PATHS = ["/login", "/home", "/contact"];

function DarkModeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("sabar-theme");
    const isDark = saved !== "light";
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("sabar-theme", next ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all"
      style={{ background: "#111", border: "1px solid #222", color: dark ? "#F59E0B" : "#6AECE1" }}
      title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {dark ? <Sun size={13} /> : <Moon size={13} />}
      {dark ? "Light" : "Dark"}
    </button>
  );
}

export function Topbar() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-[#2A2A2A] bg-[#0D0D0D]">

      {/* Nav pills */}
      <nav className="flex items-center gap-1 flex-wrap">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-all duration-150"
              style={{
                color: active ? "#6AECE1" : "#555",
                background: active ? "rgba(106,236,225,0.08)" : "transparent",
                border: `1px solid ${active ? "rgba(106,236,225,0.25)" : "#1A1A1A"}`,
              }}
            >
              <Icon size={13} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right: dark mode + clock + user */}
      <div className="flex items-center gap-3">
        <DarkModeToggle />
        <LiveClock />
        <UserMenu />
      </div>

    </header>
  );
}
