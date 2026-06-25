"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface AuthUser {
  email: string;
  name: string;
  role: "admin" | "user";
}

export interface StoredAccount {
  email:     string;
  name:      string;
  password:  string;
  role:      "admin" | "user";
  approved:  boolean;
  createdAt: string;
}

export const NOTIFY_DISCORD_KEY      = "sabar-notify-discord";
export const NOTIFY_TG_TOKEN_KEY     = "sabar-notify-tg-token";
export const NOTIFY_TG_CHAT_KEY      = "sabar-notify-tg-chat";
export const NOTIFY_EMAIL_SERVICE_KEY = "sabar-notify-email-service";
export const NOTIFY_EMAIL_TEMPLATE_KEY= "sabar-notify-email-template";
export const NOTIFY_EMAIL_PUBKEY_KEY  = "sabar-notify-email-pubkey";
export const NOTIFY_EMAIL_TO_KEY      = "sabar-notify-email-to";

interface AuthContextValue {
  user:        AuthUser | null;
  hydrated:    boolean;
  login:       (email: string, password: string) => string | null;
  signup:      (name: string, email: string, password: string) => string | null;
  logout:      () => void;
  getAllUsers:  () => StoredAccount[];
  approveUser: (email: string) => void;
  denyUser:    (email: string) => void;
  deleteUser:  (email: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCOUNTS_KEY = "sabar-accounts";
const SESSION_KEY  = "sabar-session";

// Send Discord webhook notification (client-side, no backend needed)
async function notifyDiscord(name: string, email: string) {
  const webhookUrl = localStorage.getItem(NOTIFY_DISCORD_KEY);
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Sabar System",
        embeds: [{
          title: "🟡 New User Pending Approval",
          color: 0xF59E0B,
          fields: [
            { name: "Name",  value: name,  inline: true },
            { name: "Email", value: email, inline: true },
          ],
          description: "A new user has registered and is waiting for your approval.\n\n**→ Open Admin Panel to approve or deny.**",
          footer: { text: "Sabar System · User Management" },
          timestamp: new Date().toISOString(),
        }],
      }),
    });
  } catch {}
}

// Send Telegram notification via Bot API (100% free, no backend needed)
async function notifyTelegram(name: string, email: string) {
  const token  = localStorage.getItem(NOTIFY_TG_TOKEN_KEY);
  const chatId = localStorage.getItem(NOTIFY_TG_CHAT_KEY);
  if (!token || !chatId) return;
  const text = `🟡 *Sabar System — New User Pending*\n\nName: ${name}\nEmail: ${email}\n\nOpen the admin panel to approve or deny this user\\.`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "MarkdownV2" }),
    });
  } catch {}
}

// Send Email notification via EmailJS
async function notifyEmail(name: string, email: string) {
  const serviceId  = localStorage.getItem(NOTIFY_EMAIL_SERVICE_KEY);
  const templateId = localStorage.getItem(NOTIFY_EMAIL_TEMPLATE_KEY);
  const pubKey     = localStorage.getItem(NOTIFY_EMAIL_PUBKEY_KEY);
  const toEmail    = localStorage.getItem(NOTIFY_EMAIL_TO_KEY);
  if (!serviceId || !templateId || !pubKey || !toEmail) return;
  try {
    const { send } = await import("@emailjs/browser");
    await send(serviceId, templateId, {
      to_email:   toEmail,
      user_name:  name,
      user_email: email,
      message:    `New user sign-up on Sabar System.\n\nName: ${name}\nEmail: ${email}\n\nLog in to your admin panel to approve or deny this user.`,
      subject:    "🟡 New User Pending — Sabar System",
    }, pubKey);
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Migrate old accounts without role/approved fields
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (raw) {
      try {
        const old: any[] = JSON.parse(raw);
        // Filter out invalid records (e.g. trading accounts that have no email/password)
        const migrated = old
          .filter((a: any) => a.email && a.password)
          .map((a, i) => ({
            email:     a.email,
            name:      a.name,
            password:  a.password,
            role:      a.role ?? (i === 0 ? "admin" : "user"),
            approved:  a.approved ?? true,
            createdAt: a.createdAt ?? new Date().toISOString(),
          })) as StoredAccount[];
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(migrated));
      } catch {}
    }

    // Load session and enrich with role from accounts
    const sessionRaw = localStorage.getItem(SESSION_KEY);
    if (sessionRaw) {
      try {
        const parsed = JSON.parse(sessionRaw);
        const accounts: StoredAccount[] = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]");
        const found = accounts.find(a => a.email.toLowerCase() === parsed.email?.toLowerCase());
        const enriched: AuthUser = {
          email: parsed.email,
          name:  parsed.name,
          role:  found?.role ?? "admin",
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(enriched));
        setUser(enriched);
      } catch {}
    }
    setHydrated(true);
  }, []);

  function getAccounts(): StoredAccount[] {
    try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]"); } catch { return []; }
  }

  function saveAccounts(accounts: StoredAccount[]) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  function login(email: string, password: string): string | null {
    const accounts = getAccounts();
    const found = accounts.find(a => a.email?.toLowerCase() === email.toLowerCase());
    if (!found) return "No account found with that email.";
    if (found.password !== password) return "Incorrect password.";
    if (!found.approved) return "PENDING_APPROVAL";
    const u: AuthUser = { email: found.email, name: found.name, role: found.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
    return null;
  }

  function signup(name: string, email: string, password: string): string | null {
    const accounts = getAccounts();
    if (accounts.find(a => a.email?.toLowerCase() === email.toLowerCase())) {
      return "An account with this email already exists.";
    }
    const isFirst = accounts.length === 0;
    const newAccount: StoredAccount = {
      email, name, password,
      role:      isFirst ? "admin" : "user",
      approved:  isFirst,
      createdAt: new Date().toISOString(),
    };
    saveAccounts([...accounts, newAccount]);
    if (isFirst) {
      const u: AuthUser = { email, name, role: "admin" };
      localStorage.setItem(SESSION_KEY, JSON.stringify(u));
      setUser(u);
    } else {
      // Fire notifications for pending user (non-blocking)
      notifyDiscord(name, email);
      notifyTelegram(name, email);
      notifyEmail(name, email);
    }
    return isFirst ? null : "PENDING_APPROVAL";
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  function getAllUsers(): StoredAccount[] {
    return getAccounts();
  }

  function approveUser(email: string) {
    const accounts = getAccounts().map(a =>
      a.email.toLowerCase() === email.toLowerCase() ? { ...a, approved: true } : a
    );
    saveAccounts(accounts);
  }

  function denyUser(email: string) {
    const accounts = getAccounts().map(a =>
      a.email.toLowerCase() === email.toLowerCase() ? { ...a, approved: false } : a
    );
    saveAccounts(accounts);
  }

  function deleteUser(email: string) {
    const accounts = getAccounts().filter(a => a.email.toLowerCase() !== email.toLowerCase());
    saveAccounts(accounts);
  }

  return (
    <AuthContext.Provider value={{ user, hydrated, login, signup, logout, getAllUsers, approveUser, denyUser, deleteUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
