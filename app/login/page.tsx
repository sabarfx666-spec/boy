"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/AuthContext";
import { Eye, EyeOff, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, signup } = useAuth();

  const [tab, setTab]           = useState<"login" | "signup">("login");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [keepMe, setKeepMe]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [pending, setPending]   = useState(false);
  const [pendingName, setPendingName] = useState("");
  const [forgotOpen, setForgotOpen]   = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotResult, setForgotResult] = useState<string | null>(null);

  function handleForgot() {
    setForgotEmail(email);
    setForgotResult(null);
    setForgotOpen(true);
  }

  function handleForgotLookup() {
    try {
      const accounts = JSON.parse(localStorage.getItem("sabar-accounts") ?? "[]");
      const found = accounts.find((a: any) => a.email?.toLowerCase() === forgotEmail.toLowerCase());
      if (!found) { setForgotResult("no-account"); return; }
      if (found.role !== "admin") { setForgotResult("not-admin"); return; }
      setForgotResult(found.password);
    } catch {
      setForgotResult("no-account");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 400));

      let err: string | null;
      if (tab === "login") {
        err = login(email, password);
      } else {
        if (!name.trim()) { setError("Please enter your name."); return; }
        err = signup(name.trim(), email, password);
      }

      if (err === "PENDING_APPROVAL") {
        setPendingName(tab === "signup" ? name.trim() : email);
        setPending(true);
        return;
      }
      if (err) { setError(err); return; }
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  // Pending approval screen
  if (pending) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl p-8 text-center" style={{ background: "#111", border: "1px solid #222" }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)", boxShadow: "0 0 32px 8px rgba(245,158,11,0.15)" }}>
            <Clock size={36} style={{ color: "#F59E0B" }} strokeWidth={1.5} />
          </div>
          <h2 className="font-mono text-xl font-bold text-white mb-2">Pending Approval</h2>
          <p className="font-sans text-sm text-[#666] mb-6">
            Hi <span className="text-white font-semibold">{pendingName}</span>! Your account has been registered. The admin needs to approve your access before you can log in.
          </p>
          <div className="rounded-xl p-4 mb-6 text-left space-y-2"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <div className="flex items-center gap-2">
              <CheckCircle size={14} style={{ color: "#F59E0B" }} />
              <span className="font-mono text-xs text-[#888]">Account created successfully</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} style={{ color: "#F59E0B" }} />
              <span className="font-mono text-xs text-[#888]">Waiting for admin approval</span>
            </div>
          </div>
          <button
            onClick={() => { setPending(false); setTab("login"); setEmail(""); setPassword(""); }}
            className="w-full py-3 rounded-xl font-mono text-sm font-bold transition-all"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)", color: "#F59E0B" }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 overflow-y-auto">

      {/* Top nav links */}
      <div className="absolute top-5 left-0 right-0 flex items-center justify-center gap-6">
        <button onClick={() => router.push("/home")}
          className="font-sans text-sm text-[#555] hover:text-white transition-colors">
          ← Home
        </button>
        <button onClick={() => router.push("/contact")}
          className="font-sans text-sm text-[#555] hover:text-white transition-colors">
          Contact
        </button>
      </div>

      <div className="w-full max-w-sm rounded-2xl p-8" style={{ background: "#111", border: "1px solid #222" }}>
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(229,62,62,0.12)", border: "1px solid rgba(229,62,62,0.4)", boxShadow: "0 0 32px 8px rgba(229,62,62,0.2)" }}>
            <TrendingUp size={36} style={{ color: "#E53E3E" }} strokeWidth={2} />
          </div>
        </div>

        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold text-white">
            <span style={{ color: "#E53E3E" }}>Sabar</span> System
          </h1>
          <p className="text-sm text-[#666] mt-1 font-sans">
            {tab === "login" ? "Sign in to access your trading journal" : "Create your account to get started"}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden mb-6 mt-5" style={{ background: "#1A1A1A" }}>
          {(["login", "signup"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(null); setLoading(false); }}
              className="flex-1 py-2.5 text-sm font-semibold font-sans transition-all"
              style={{ background: tab === t ? "#E53E3E" : "transparent", color: tab === t ? "#fff" : "#666", borderRadius: "10px" }}>
              {t === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "signup" && (
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name" required
                className="w-full px-4 py-3 rounded-xl text-sm font-sans text-white placeholder-[#444] focus:outline-none"
                style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
                onFocus={e => (e.target.style.borderColor = "#E53E3E")}
                onBlur={e => (e.target.style.borderColor = "#2A2A2A")} />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required
              className="w-full px-4 py-3 rounded-xl text-sm font-sans text-white placeholder-[#444] focus:outline-none"
              style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
              onFocus={e => (e.target.style.borderColor = "#E53E3E")}
              onBlur={e => (e.target.style.borderColor = "#2A2A2A")} />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-semibold text-white">Password</label>
              {tab === "login" && <span className="text-xs font-sans cursor-pointer" style={{ color: "#E53E3E" }} onClick={handleForgot}>Forgot password?</span>}
            </div>
            <div className="flex items-center px-4 py-3 rounded-xl" style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6}
                className="flex-1 bg-transparent text-sm font-sans text-white placeholder-[#444] focus:outline-none" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="text-[#555] hover:text-white transition-colors ml-2">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => setKeepMe(v => !v)} className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
              style={{ border: `2px solid ${keepMe ? "#E53E3E" : "#444"}`, background: keepMe ? "rgba(229,62,62,0.15)" : "transparent" }}>
              {keepMe && <div className="w-2 h-2 rounded-full bg-[#E53E3E]" />}
            </div>
            <span className="text-sm font-sans text-[#888]">Keep me signed in</span>
          </label>

          {error && (
            <div className="px-4 py-2.5 rounded-xl text-sm font-sans"
              style={{ background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.3)", color: "#E53E3E" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: "#E53E3E", boxShadow: "0 0 20px 4px rgba(229,62,62,0.35)" }}>
            {loading ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

      </div>
    </div>

    {/* Forgot Password Modal */}
    {forgotOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
        <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#111", border: "1px solid #2A2A2A" }}>
          <h2 className="text-lg font-bold text-white font-mono mb-1">Forgot Password</h2>
          <p className="text-xs text-[#666] font-sans mb-4">Enter your email to retrieve your password.</p>

          <input
            type="email"
            value={forgotEmail}
            onChange={e => { setForgotEmail(e.target.value); setForgotResult(null); }}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl text-sm font-sans text-white placeholder-[#444] focus:outline-none mb-3"
            style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
          />

          {forgotResult && forgotResult !== "no-account" && (
            <div className="px-4 py-3 rounded-xl mb-3 text-sm font-mono" style={{ background: "rgba(0,255,127,0.08)", border: "1px solid rgba(0,255,127,0.25)", color: "#00FF7F" }}>
              Your password: <span className="font-bold">{forgotResult}</span>
            </div>
          )}
          {forgotResult === "no-account" && (
            <div className="px-4 py-2.5 rounded-xl mb-3 text-sm font-sans" style={{ background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.3)", color: "#E53E3E" }}>
              No account found. Please sign up first.
            </div>
          )}
          {forgotResult === "not-admin" && (
            <div className="px-4 py-2.5 rounded-xl mb-3 text-sm font-sans" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B" }}>
              Contact the admin to reset your password.
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleForgotLookup}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "#E53E3E" }}
            >
              Find Password
            </button>
            <button
              onClick={() => { setForgotOpen(false); setForgotResult(null); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#666" }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

