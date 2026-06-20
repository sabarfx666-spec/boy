"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, StoredAccount, NOTIFY_DISCORD_KEY, NOTIFY_TG_TOKEN_KEY, NOTIFY_TG_CHAT_KEY, NOTIFY_EMAIL_SERVICE_KEY, NOTIFY_EMAIL_TEMPLATE_KEY, NOTIFY_EMAIL_PUBKEY_KEY, NOTIFY_EMAIL_TO_KEY } from "@/store/AuthContext";
import {
  Shield, CheckCircle, XCircle, Trash2, Clock, Crown, RefreshCw,
  Bell, MessageSquare, ExternalLink, Send, Eye, EyeOff, Check, Bot, ChevronDown, Mail,
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const { user, hydrated, getAllUsers, approveUser, denyUser, deleteUser } = useAuth();
  const [users, setUsers] = useState<StoredAccount[]>([]);
  const [tick, setTick]   = useState(0);

  // Notification settings
  const [discordUrl,    setDiscordUrl]    = useState("");
  const [tgToken,       setTgToken]       = useState("");
  const [tgChat,        setTgChat]        = useState("");
  const [showTgToken,   setShowTgToken]   = useState(false);
  const [emailService,  setEmailService]  = useState("");
  const [emailTemplate, setEmailTemplate] = useState("");
  const [emailPubKey,   setEmailPubKey]   = useState("");
  const [emailTo,       setEmailTo]       = useState("");
  const [showEmailKey,  setShowEmailKey]  = useState(false);
  const [testStatus,    setTestStatus]    = useState<Record<string, "idle"|"sending"|"ok"|"err">>({});
  const [saved,         setSaved]         = useState(false);
  const [notifOpen,     setNotifOpen]     = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
  }, [user, hydrated, router]);

  useEffect(() => {
    setUsers(getAllUsers());
  }, [tick]);

  // Load saved notification settings
  useEffect(() => {
    setDiscordUrl   (localStorage.getItem(NOTIFY_DISCORD_KEY)       ?? "");
    setTgToken      (localStorage.getItem(NOTIFY_TG_TOKEN_KEY)      ?? "");
    setTgChat       (localStorage.getItem(NOTIFY_TG_CHAT_KEY)       ?? "");
    setEmailService (localStorage.getItem(NOTIFY_EMAIL_SERVICE_KEY) ?? "");
    setEmailTemplate(localStorage.getItem(NOTIFY_EMAIL_TEMPLATE_KEY)?? "");
    setEmailPubKey  (localStorage.getItem(NOTIFY_EMAIL_PUBKEY_KEY)  ?? "");
    setEmailTo      (localStorage.getItem(NOTIFY_EMAIL_TO_KEY)      ?? "");
  }, []);

  const refresh = () => setTick(t => t + 1);

  const approve = (email: string) => { approveUser(email); refresh(); };
  const deny    = (email: string) => { denyUser(email);    refresh(); };
  const remove  = (email: string) => {
    if (confirm(`Delete user ${email}? This cannot be undone.`)) { deleteUser(email); refresh(); }
  };

  function saveNotifSettings() {
    localStorage.setItem(NOTIFY_DISCORD_KEY,        discordUrl.trim());
    localStorage.setItem(NOTIFY_TG_TOKEN_KEY,       tgToken.trim());
    localStorage.setItem(NOTIFY_TG_CHAT_KEY,        tgChat.trim());
    localStorage.setItem(NOTIFY_EMAIL_SERVICE_KEY,  emailService.trim());
    localStorage.setItem(NOTIFY_EMAIL_TEMPLATE_KEY, emailTemplate.trim());
    localStorage.setItem(NOTIFY_EMAIL_PUBKEY_KEY,   emailPubKey.trim());
    localStorage.setItem(NOTIFY_EMAIL_TO_KEY,       emailTo.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testEmail() {
    if (!emailService.trim() || !emailTemplate.trim() || !emailPubKey.trim() || !emailTo.trim()) return;
    setTestStatus(s => ({ ...s, email: "sending" }));
    try {
      const { send } = await import("@emailjs/browser");
      const res = await send(emailService.trim(), emailTemplate.trim(), {
        to_email:   emailTo.trim(),
        user_name:  "Test User",
        user_email: "test@example.com",
        message:    "This is a test notification from Sabar System admin panel.",
        subject:    "✅ Test Email — Sabar System",
      }, emailPubKey.trim());
      setTestStatus(s => ({ ...s, email: res.status === 200 ? "ok" : "err" }));
    } catch {
      setTestStatus(s => ({ ...s, email: "err" }));
    }
    setTimeout(() => setTestStatus(s => ({ ...s, email: "idle" })), 3000);
  }

  async function testDiscord() {
    if (!discordUrl.trim()) return;
    setTestStatus(s => ({ ...s, discord: "sending" }));
    try {
      await fetch(discordUrl.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Sabar System",
          embeds: [{
            title: "✅ Test Notification",
            color: 0x00FF7F,
            description: "Discord notifications are working correctly for Sabar System.",
            footer: { text: "Sabar System · Admin Panel" },
            timestamp: new Date().toISOString(),
          }],
        }),
      });
      setTestStatus(s => ({ ...s, discord: "ok" }));
    } catch {
      setTestStatus(s => ({ ...s, discord: "err" }));
    }
    setTimeout(() => setTestStatus(s => ({ ...s, discord: "idle" })), 3000);
  }

  async function testTelegram() {
    if (!tgToken.trim() || !tgChat.trim()) return;
    setTestStatus(s => ({ ...s, telegram: "sending" }));
    try {
      const res = await fetch(`https://api.telegram.org/bot${tgToken.trim()}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgChat.trim(),
          text: "✅ Test from Sabar System — Telegram notifications are working\\!",
          parse_mode: "MarkdownV2",
        }),
      });
      const data = await res.json();
      setTestStatus(s => ({ ...s, telegram: data.ok ? "ok" : "err" }));
    } catch {
      setTestStatus(s => ({ ...s, telegram: "err" }));
    }
    setTimeout(() => setTestStatus(s => ({ ...s, telegram: "idle" })), 3000);
  }

  const pending  = users.filter(u => !u.approved && u.role !== "admin");
  const approved = users.filter(u =>  u.approved && u.role !== "admin");
  const admins   = users.filter(u => u.role === "admin");

  if (!hydrated || !user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.4)" }}>
              <Shield size={20} style={{ color: "#E53E3E" }} />
            </div>
            <div>
              <h1 className="font-mono font-bold text-white text-lg tracking-widest uppercase">User Management</h1>
              <p className="font-mono text-[10px] text-[#444] uppercase tracking-widest">Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={refresh}
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs text-[#555] hover:text-white transition-colors"
              style={{ background: "#111", border: "1px solid #222" }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => router.push("/")}
              className="px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all"
              style={{ background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.3)", color: "#E53E3E" }}>
              ← Back
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Users",    value: users.length,    color: "#fff" },
            { label: "Pending",        value: pending.length,  color: "#F59E0B" },
            { label: "Approved",       value: approved.length, color: "#00FF7F" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#0D0D0D", border: "1px solid #1A1A1A" }}>
              <p className="font-mono text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#444] mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── NOTIFICATION SETTINGS ── */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(106,236,225,0.2)" }}>
          {/* Header — click to toggle */}
          <button
            onClick={() => setNotifOpen(v => !v)}
            className="w-full px-5 py-3 flex items-center gap-2 text-left transition-colors hover:bg-[#0a0a0a]"
            style={{ background: "rgba(106,236,225,0.06)" }}
          >
            <Bell size={14} style={{ color: "#6AECE1" }} />
            <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "#6AECE1" }}>
              Notification Settings
            </p>
            <span className="font-mono text-[10px] text-[#444] ml-1">
              {notifOpen ? "Receive alerts when users register" : "Click to configure"}
            </span>
            <ChevronDown
              size={14}
              className="ml-auto transition-transform duration-300"
              style={{ color: "#444", transform: notifOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {notifOpen && <div className="p-5 space-y-6" style={{ background: "#0D0D0D" }}>

            {/* Discord */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(88,101,242,0.15)", border: "1px solid rgba(88,101,242,0.35)" }}>
                  <MessageSquare size={13} style={{ color: "#5865F2" }} />
                </div>
                <p className="font-mono text-sm font-bold text-white">Discord</p>
                <a href="https://support.discord.com/hc/en-us/articles/228383668" target="_blank" rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 font-mono text-[10px] text-[#444] hover:text-[#5865F2] transition-colors">
                  How to get webhook <ExternalLink size={10} />
                </a>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discordUrl}
                  onChange={e => setDiscordUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="flex-1 px-3 py-2.5 rounded-lg font-mono text-xs text-white placeholder-[#333] focus:outline-none"
                  style={{ background: "#111", border: "1px solid #222" }}
                  onFocus={e => (e.target.style.borderColor = "#5865F2")}
                  onBlur={e  => (e.target.style.borderColor = "#222")}
                />
                <button onClick={testDiscord} disabled={!discordUrl.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs font-bold transition-all disabled:opacity-30"
                  style={{ background: "rgba(88,101,242,0.15)", border: "1px solid rgba(88,101,242,0.3)", color: "#5865F2" }}>
                  {testStatus.discord === "sending" ? "…" :
                   testStatus.discord === "ok"      ? <><Check size={12}/> Sent</> :
                   testStatus.discord === "err"     ? "Error" :
                   <><Send size={12}/> Test</>}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "#1A1A1A" }} />

            {/* Telegram */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(40,167,235,0.15)", border: "1px solid rgba(40,167,235,0.35)" }}>
                  <Bot size={13} style={{ color: "#29A8EB" }} />
                </div>
                <p className="font-mono text-sm font-bold text-white">Telegram</p>
                <span className="ml-2 px-2 py-0.5 rounded font-mono text-[9px] font-bold"
                  style={{ background: "rgba(0,255,127,0.12)", color: "#00FF7F", border: "1px solid rgba(0,255,127,0.2)" }}>
                  100% FREE
                </span>
                <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 font-mono text-[10px] text-[#444] hover:text-[#29A8EB] transition-colors">
                  Open BotFather <ExternalLink size={10} />
                </a>
              </div>

              {/* Setup steps */}
              <div className="rounded-lg p-3 mb-3 space-y-1.5" style={{ background: "#111", border: "1px solid #1A1A1A" }}>
                <p className="font-mono text-[10px] text-[#555] uppercase tracking-widest mb-2">Quick Setup (one time)</p>
                {[
                  "Open Telegram → search @BotFather → send /newbot",
                  "Follow prompts to name your bot — BotFather gives you a Bot Token",
                  "Search @userinfobot on Telegram → send /start → it shows your Chat ID",
                  "Paste both below and click Save",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] font-bold mt-0.5 w-4 shrink-0" style={{ color: "#29A8EB" }}>{i + 1}.</span>
                    <span className="font-mono text-[10px] text-[#555]">{step}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <p className="font-mono text-[10px] text-[#444] mb-1.5 uppercase tracking-widest">Bot Token</p>
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ background: "#111", border: "1px solid #222" }}>
                    <input
                      type={showTgToken ? "text" : "password"}
                      value={tgToken}
                      onChange={e => setTgToken(e.target.value)}
                      placeholder="123456:ABC-DEF..."
                      className="flex-1 px-3 py-2.5 font-mono text-xs text-white placeholder-[#333] focus:outline-none bg-transparent"
                    />
                    <button onClick={() => setShowTgToken(v => !v)} className="px-2.5 text-[#444] hover:text-white transition-colors">
                      {showTgToken ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-[#444] mb-1.5 uppercase tracking-widest">Chat ID</p>
                  <input
                    type="text"
                    value={tgChat}
                    onChange={e => setTgChat(e.target.value)}
                    placeholder="123456789"
                    className="w-full px-3 py-2.5 rounded-lg font-mono text-xs text-white placeholder-[#333] focus:outline-none"
                    style={{ background: "#111", border: "1px solid #222" }}
                    onFocus={e => (e.target.style.borderColor = "#29A8EB")}
                    onBlur={e  => (e.target.style.borderColor = "#222")}
                  />
                </div>
              </div>

              <button onClick={testTelegram} disabled={!tgToken.trim() || !tgChat.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs font-bold transition-all disabled:opacity-30"
                style={{ background: "rgba(40,167,235,0.12)", border: "1px solid rgba(40,167,235,0.28)", color: "#29A8EB" }}>
                {testStatus.telegram === "sending" ? "Sending…" :
                 testStatus.telegram === "ok"      ? <><Check size={12}/> Message Sent!</> :
                 testStatus.telegram === "err"     ? "Error — check token & chat ID" :
                 <><Send size={12}/> Send Test Message</>}
              </button>
            </div>

            {/* Save button */}
            <button onClick={saveNotifSettings}
              className="w-full py-3 rounded-xl font-mono text-sm font-bold transition-all"
              style={{
                background: saved ? "rgba(0,255,127,0.15)" : "rgba(106,236,225,0.12)",
                border: `1px solid ${saved ? "rgba(0,255,127,0.35)" : "rgba(106,236,225,0.25)"}`,
                color: saved ? "#00FF7F" : "#6AECE1",
              }}>
              {saved ? "✓ Settings Saved" : "Save Notification Settings"}
            </button>
          </div>}

          {/* Email section always visible below the collapsible */}
          {notifOpen && <>
            {/* Divider */}
            <div style={{ height: 1, background: "#1A1A1A", margin: "0 20px" }} />

            {/* Email */}
            <div className="p-5 space-y-4" style={{ background: "#0D0D0D" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.35)" }}>
                  <Mail size={13} style={{ color: "#E53E3E" }} />
                </div>
                <p className="font-mono text-sm font-bold text-white">Email</p>
                <span className="ml-2 px-2 py-0.5 rounded font-mono text-[9px] font-bold"
                  style={{ background: "rgba(106,236,225,0.1)", color: "#6AECE1", border: "1px solid rgba(106,236,225,0.2)" }}>
                  via EmailJS
                </span>
                <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 font-mono text-[10px] text-[#444] hover:text-[#E53E3E] transition-colors">
                  Get free account <ExternalLink size={10} />
                </a>
              </div>

              {/* Setup steps */}
              <div className="rounded-lg p-3 space-y-1.5" style={{ background: "#111", border: "1px solid #1A1A1A" }}>
                <p className="font-mono text-[10px] text-[#555] uppercase tracking-widest mb-2">Setup (one time)</p>
                {[
                  "Go to emailjs.com → create free account",
                  "Email Services → Add Service → connect Gmail/Outlook → copy Service ID",
                  "Email Templates → Create Template → add variables: {{user_name}}, {{user_email}}, {{message}} → copy Template ID",
                  "Account → API Keys → copy Public Key",
                  "Paste all 4 fields below and click Save",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] font-bold mt-0.5 w-4 shrink-0" style={{ color: "#E53E3E" }}>{i + 1}.</span>
                    <span className="font-mono text-[10px] text-[#555]">{step}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-mono text-[10px] text-[#444] mb-1.5 uppercase tracking-widest">Service ID</p>
                  <input type="text" value={emailService} onChange={e => setEmailService(e.target.value)}
                    placeholder="service_xxxxxxx"
                    className="w-full px-3 py-2.5 rounded-lg font-mono text-xs text-white placeholder-[#333] focus:outline-none"
                    style={{ background: "#111", border: "1px solid #222" }}
                    onFocus={e => (e.target.style.borderColor = "#E53E3E")}
                    onBlur={e  => (e.target.style.borderColor = "#222")} />
                </div>
                <div>
                  <p className="font-mono text-[10px] text-[#444] mb-1.5 uppercase tracking-widest">Template ID</p>
                  <input type="text" value={emailTemplate} onChange={e => setEmailTemplate(e.target.value)}
                    placeholder="template_xxxxxxx"
                    className="w-full px-3 py-2.5 rounded-lg font-mono text-xs text-white placeholder-[#333] focus:outline-none"
                    style={{ background: "#111", border: "1px solid #222" }}
                    onFocus={e => (e.target.style.borderColor = "#E53E3E")}
                    onBlur={e  => (e.target.style.borderColor = "#222")} />
                </div>
                <div>
                  <p className="font-mono text-[10px] text-[#444] mb-1.5 uppercase tracking-widest">Public Key</p>
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ background: "#111", border: "1px solid #222" }}>
                    <input type={showEmailKey ? "text" : "password"} value={emailPubKey} onChange={e => setEmailPubKey(e.target.value)}
                      placeholder="xxxxxxxxxxxxxxxxxxxx"
                      className="flex-1 px-3 py-2.5 font-mono text-xs text-white placeholder-[#333] focus:outline-none bg-transparent" />
                    <button onClick={() => setShowEmailKey(v => !v)} className="px-2.5 text-[#444] hover:text-white transition-colors">
                      {showEmailKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-[#444] mb-1.5 uppercase tracking-widest">Your Email</p>
                  <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full px-3 py-2.5 rounded-lg font-mono text-xs text-white placeholder-[#333] focus:outline-none"
                    style={{ background: "#111", border: "1px solid #222" }}
                    onFocus={e => (e.target.style.borderColor = "#E53E3E")}
                    onBlur={e  => (e.target.style.borderColor = "#222")} />
                </div>
              </div>

              <button onClick={testEmail} disabled={!emailService.trim() || !emailTemplate.trim() || !emailPubKey.trim() || !emailTo.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs font-bold transition-all disabled:opacity-30"
                style={{ background: "rgba(229,62,62,0.12)", border: "1px solid rgba(229,62,62,0.28)", color: "#E53E3E" }}>
                {testStatus.email === "sending" ? "Sending…" :
                 testStatus.email === "ok"      ? <><Check size={12}/> Email Sent!</> :
                 testStatus.email === "err"     ? "Error — check your IDs" :
                 <><Send size={12}/> Send Test Email</>}
              </button>
            </div>
          </>}
        </div>

        {/* ── PENDING ── */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(245,158,11,0.3)" }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ background: "rgba(245,158,11,0.08)" }}>
            <Clock size={14} style={{ color: "#F59E0B" }} />
            <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "#F59E0B" }}>
              Pending Approval ({pending.length})
            </p>
          </div>
          {pending.length === 0 ? (
            <div className="px-5 py-8 text-center" style={{ background: "#0D0D0D" }}>
              <Clock size={24} className="mx-auto mb-2" style={{ color: "#2A2A2A" }} />
              <p className="font-mono text-xs text-[#333]">No pending requests</p>
              <p className="font-mono text-[10px] text-[#222] mt-1">New sign-ups will appear here for approval</p>
            </div>
          ) : (
            pending.map(u => (
              <UserRow key={u.email} account={u} onApprove={() => approve(u.email)} onDeny={() => deny(u.email)} onDelete={() => remove(u.email)} />
            ))
          )}
        </div>

        {/* ── APPROVED ── */}
        {approved.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1A1A1A" }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ background: "#0D0D0D" }}>
              <CheckCircle size={14} style={{ color: "#00FF7F" }} />
              <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "#00FF7F" }}>
                Approved Users ({approved.length})
              </p>
            </div>
            {approved.map(u => (
              <UserRow key={u.email} account={u} onApprove={() => approve(u.email)} onDeny={() => deny(u.email)} onDelete={() => remove(u.email)} />
            ))}
          </div>
        )}

        {/* ── ADMINS ── */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(229,62,62,0.2)" }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ background: "rgba(229,62,62,0.06)" }}>
            <Crown size={14} style={{ color: "#E53E3E" }} />
            <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "#E53E3E" }}>Administrators</p>
          </div>
          {admins.map(u => (
            <div key={u.email} className="flex items-center gap-4 px-5 py-4" style={{ background: "#0D0D0D", borderTop: "1px solid #1A1A1A" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-sm"
                style={{ background: "rgba(229,62,62,0.15)", color: "#E53E3E" }}>
                {u.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-bold text-white">{u.name}</p>
                <p className="font-mono text-xs text-[#555]">{u.email}</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{ background: "rgba(229,62,62,0.12)", border: "1px solid rgba(229,62,62,0.3)" }}>
                <Crown size={11} style={{ color: "#E53E3E" }} />
                <span className="font-mono text-[10px] font-bold" style={{ color: "#E53E3E" }}>ADMIN</span>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-12 text-[#333] font-mono text-sm">No users registered yet.</div>
        )}
      </div>
    </div>
  );
}

function UserRow({ account, onApprove, onDeny, onDelete }: {
  account: StoredAccount;
  onApprove: () => void;
  onDeny: () => void;
  onDelete: () => void;
}) {
  const joined = account.createdAt
    ? new Date(account.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-[#0A0A0A] transition-colors"
      style={{ background: "#0D0D0D", borderTop: "1px solid #1A1A1A" }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-sm shrink-0"
        style={{
          background: account.approved ? "rgba(0,255,127,0.12)" : "rgba(245,158,11,0.12)",
          color:      account.approved ? "#00FF7F" : "#F59E0B",
        }}>
        {account.name[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm font-bold text-white truncate">{account.name}</p>
        <p className="font-mono text-xs text-[#555] truncate">{account.email}</p>
        <p className="font-mono text-[10px] text-[#333] mt-0.5">Joined {joined}</p>
      </div>

      <div className="shrink-0">
        {account.approved ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,255,127,0.1)", border: "1px solid rgba(0,255,127,0.25)" }}>
            <CheckCircle size={11} style={{ color: "#00FF7F" }} />
            <span className="font-mono text-[10px] font-bold" style={{ color: "#00FF7F" }}>APPROVED</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Clock size={11} style={{ color: "#F59E0B" }} />
            <span className="font-mono text-[10px] font-bold" style={{ color: "#F59E0B" }}>PENDING</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!account.approved ? (
          <button onClick={onApprove}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all hover:opacity-80"
            style={{ background: "rgba(0,255,127,0.15)", border: "1px solid rgba(0,255,127,0.3)", color: "#00FF7F" }}>
            <CheckCircle size={12} /> Allow
          </button>
        ) : (
          <button onClick={onDeny}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all hover:opacity-80"
            style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.25)", color: "#FF3B3B" }}>
            <XCircle size={12} /> Revoke
          </button>
        )}
        <button onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:opacity-80"
          style={{ background: "rgba(255,59,59,0.08)", border: "1px solid rgba(255,59,59,0.15)", color: "#FF3B3B" }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
