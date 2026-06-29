import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  TrendingUp, BookOpen, BarChart2, Plus, Trash2,
  Target, DollarSign, Activity, Award, Calendar,
  ChevronDown, CheckSquare, RefreshCw, AlertTriangle,
  X, Check, Newspaper, Lock, Upload, Video, Coffee, Sun, Moon, LogIn, LayoutGrid
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import WeeklyModule from './WeeklyModule.jsx';
import { imgSave, imgLoadTrade, imgDeleteTrade } from './db.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_BULL_BIAS = [
  { id: 'bb1', text: 'Daily Bullish Order-flow +DOL',          checked: false },
  { id: 'bb2', text: 'Daily Order-flow +ICR',                  checked: false, group: 'bbg1' },
  { id: 'bb3', text: 'Daily Order-flow +CRT',                  checked: false, group: 'bbg1' },
  { id: 'bb4', text: 'Monday Up rule',                         checked: false },
  { id: 'bb5', text: '4H Bullish A to B + POI+ ERL',          checked: false, group: 'bbg2' },
  { id: 'bb6', text: 'A to B +LQ:Engineering+ POI+ ERL',      checked: false, group: 'bbg2' },
  { id: 'bb7', text: '4H Bullish Order-flow +CRT',             checked: false },
];

const DEFAULT_BEAR_BIAS = [
  { id: 'rb1', text: 'Daily Bearish Order-flow +DOL',          checked: false },
  { id: 'rb2', text: 'Daily Bearish Order-flow +ICR',          checked: false, group: 'rbg1' },
  { id: 'rb3', text: 'Daily Bearish Order-flow +CRT',          checked: false, group: 'rbg1' },
  { id: 'rb4', text: 'Monday Down rule',                       checked: false },
  { id: 'rb5', text: '4H Bearish A to B + POI+ ERL',          checked: false, group: 'rbg2' },
  { id: 'rb6', text: 'A to B +LQ:Engineering+ POI+ ERL',      checked: false, group: 'rbg2' },
  { id: 'rb7', text: '4H Bearish Order-flow +CRT',             checked: false },
];

const DEFAULT_BULL_ENTRY = [
  { id: 'be1', text: '15M Bullish Order-flow + POI',           checked: false },
  { id: 'be2', text: 'Bullish Order block + MSS',              checked: false, group: 'beg1' },
  { id: 'be3', text: 'Bullish Fair value gap present',         checked: false, group: 'beg1' },
  { id: 'be4', text: 'Downside liquidity sweep confirmed',     checked: false },
  { id: 'be5', text: 'M5 Buy confirmation entry',              checked: false },
  { id: 'be6', text: 'SL placed below structure',              checked: false },
];

const DEFAULT_BEAR_ENTRY = [
  { id: 're1', text: '15M Bearish Order-flow + POI',           checked: false },
  { id: 're2', text: 'Bearish Order block + MSS',              checked: false, group: 'reg1' },
  { id: 're3', text: 'Bearish Fair value gap present',         checked: false, group: 'reg1' },
  { id: 're4', text: 'Upside liquidity sweep confirmed',       checked: false },
  { id: 're5', text: 'M5 Sell confirmation entry',             checked: false },
  { id: 're6', text: 'SL placed above structure',              checked: false },
];

const DEFAULT_PAIRS = ['EUR/USD', 'GBP/USD', 'GBP/JPY'];
const TRADE_WEBHOOK = import.meta.env.VITE_DISCORD_TRADE;
const SESSIONS = ['London', 'New York'];
const SESSION_TIMES = {
  'London':   { hours: ['2.00','3.00','4.00','5.00'],   period: 'PM', color: '#ff6b81' },
  'New York': { hours: ['7.00','8.00','9.00','10.00'],  period: 'AM', color: '#ffa502' },
};
const BIASES = ['Bullish', 'Bearish'];
const PSYCH_TAGS = ['Calm', 'Confident', 'Focused', 'FOMO', 'Fear', 'Greed', 'Anxious', 'Impatient'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const calcLotSize = (risk, sl) => {
  if (!risk || !sl || +sl === 0) return '0.00';
  return (+risk / (+sl * 10)).toFixed(2);
};

const calcGrade = (pct) => {
  if (pct >= 85) return { label: 'A+', color: '#00c896', ring: 'rgba(0,200,150,0.4)', bg: 'rgba(0,200,150,0.08)' };
  if (pct >= 70) return { label: 'B+', color: '#a78bfa', ring: 'rgba(167,139,250,0.4)', bg: 'rgba(167,139,250,0.08)' };
  if (pct >= 50) return { label: 'C-', color: '#f5a623', ring: 'rgba(245,166,35,0.4)', bg: 'rgba(245,166,35,0.08)' };
  return              { label: 'D-', color: '#ff4757', ring: 'rgba(255,71,87,0.4)',  bg: 'rgba(255,71,87,0.08)'  };
};

const calcPnL = (status, risk, rr) => {
  if (status === 'Win')  return +(+risk * +rr).toFixed(2);
  if (status === 'Loss') return -(+risk);
  return 0;
};

const todayStr = () => new Date().toISOString().split('T')[0];

// ─── Shared UI ───────────────────────────────────────────────────────────────

const Card = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-[#2a2d3e] bg-[#161829] p-4 ${className}`}>
    {children}
  </div>
);

const Label = ({ children }) => (
  <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5a5d7a] mb-2">{children}</div>
);

const StatusBadge = ({ status }) => {
  const map = {
    Win:          'bg-[rgba(0,200,150,0.15)]  text-[#00c896]',
    Loss:         'bg-[rgba(255,71,87,0.15)]   text-[#ff4757]',
    'Break Even': 'bg-[rgba(245,166,35,0.15)] text-[#f5a623]',
    'No Trade':   'bg-[rgba(138,138,170,0.15)] text-[#8888aa]',
  };
  const label = { 'Break Even': 'BE', 'No Trade': 'NO TRADE' };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${map[status] || ''}`}>
      {label[status] || status}
    </span>
  );
};

// ─── Rule helpers ─────────────────────────────────────────────────────────────

const toggleRule = (setter, id) =>
  setter(prev => prev.map(r => r.id === id ? { ...r, checked: !r.checked } : r));

const addRule = (setter, text, clearFn) => {
  if (!text.trim()) return;
  setter(prev => [...prev, { id: `custom-${Date.now()}`, text: text.trim(), checked: false }]);
  clearFn('');
};

const removeRule = (setter, id) => setter(prev => prev.filter(r => r.id !== id));

// Build display segments: standalone rules + grouped brackets
const buildSegments = (rules) => {
  const segments = [];
  let i = 0;
  while (i < rules.length) {
    const r = rules[i];
    if (r.group) {
      const group = [];
      let j = i;
      while (j < rules.length && rules[j].group === r.group) { group.push(rules[j]); j++; }
      segments.push({ type: 'group', group: r.group, rules: group });
      i = j;
    } else {
      segments.push({ type: 'single', rule: r });
      i++;
    }
  }
  return segments;
};

const RuleSection = ({ rules, setter, newVal, setNew, label, subtitle, expanded, onToggle, onCheckedChange }) => {
  const rawChecked = rules.filter(r => r.checked).length;

  useEffect(() => {
    onCheckedChange?.(rawChecked, rules.length);
  }, [rawChecked, rules.length]);

  const renderRule = (rule, isGrouped) => (
    <div key={rule.id} className="flex items-center gap-2 group/rule">
      <button
        onClick={() => toggleRule(setter, rule.id)}
        className="flex items-center gap-3 flex-1 px-3 py-2.5 rounded-lg text-left transition-all"
        style={rule.checked ? {
          background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.12)',
        } : { background: 'transparent', border: '1px solid transparent' }}
      >
        {/* Radio circle */}
        <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          rule.checked ? 'border-[#00c896]' : 'border-[#2e3244]'
        }`}>
          {rule.checked && <div className="w-2 h-2 rounded-full bg-[#00c896]" />}
        </div>
        <span className={`flex-1 text-xs font-medium transition-all ${rule.checked ? 'text-[#00c896]' : 'text-[#7a7d9a]'}`}>
          {rule.text}
        </span>
        {isGrouped && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide flex-shrink-0"
            style={{ background: 'rgba(0,200,150,0.08)', color: '#00c896', border: '1px solid rgba(0,200,150,0.2)' }}>
            Either/Or
          </span>
        )}
      </button>
      <button
        onClick={() => removeRule(setter, rule.id)}
        className="opacity-0 group-hover/rule:opacity-100 flex-shrink-0 p-1 rounded text-[#ff4757] hover:bg-[rgba(255,71,87,0.1)] transition-all"
      >
        <X size={11} />
      </button>
    </div>
  );

  const segments = buildSegments(rules);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0d0f18', border: '1px solid #1a1d2e' }}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 transition-all hover:bg-[rgba(255,255,255,0.02)]"
      >
        <div className="flex items-center gap-2.5">
          <ChevronDown size={13} className="text-[#00c896] transition-transform duration-200 flex-shrink-0"
            style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
          <span className="text-sm font-black font-mono tracking-wide text-white">{label}</span>
        </div>
        <span className="text-xs font-mono font-bold text-[#00c896]">{rawChecked}/{rules.length}</span>
      </button>

      {/* Progress bar always visible under header */}
      <div className="px-4 pb-2">
        <div className="h-0.5 w-full rounded-full overflow-hidden" style={{ background: '#1a1d2e' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${rules.length > 0 ? Math.round((rawChecked / rules.length) * 100) : 0}%`, background: '#00c896' }}
          />
        </div>
      </div>

      {expanded && (
        <>
          {/* Subtitle + divider */}
          <div className="px-4">
            <div className="text-[9px] font-mono font-bold tracking-[0.2em] text-[#2e3a3a] uppercase mb-3">{subtitle}</div>
            <div className="h-px mb-3" style={{ background: '#1a1d2e' }} />
          </div>

          {/* Rules */}
          <div className="px-4 pb-3 flex flex-col gap-1">
            {segments.map((seg, si) =>
              seg.type === 'single' ? renderRule(seg.rule, false) : (
                <div key={seg.group} className="flex gap-0">
                  {/* Left bracket */}
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 14, marginRight: 4 }}>
                    <div style={{ width: 8, height: 12, borderTop: '2px solid #1e3a35', borderLeft: '2px solid #1e3a35', borderRadius: '3px 0 0 0', marginTop: 10 }} />
                    <div style={{ width: 2, flex: 1, background: '#1e3a35' }} />
                    <div style={{ width: 8, height: 12, borderBottom: '2px solid #1e3a35', borderLeft: '2px solid #1e3a35', borderRadius: '0 0 0 3px', marginBottom: 10 }} />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    {seg.rules.map(r => renderRule(r, true))}
                  </div>
                </div>
              )
            )}
          </div>

          {/* Add Rule */}
          <div className="px-4 pb-3 pt-2" style={{ borderTop: '1px solid #1a1d2e' }}>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="+ Add Rule"
                value={newVal}
                onChange={e => setNew(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRule(setter, newVal, setNew)}
                className="flex-1 bg-transparent text-[#5a6a6a] text-xs placeholder-[#2e3a3a] focus:outline-none"
              />
              {newVal && (
                <button onClick={() => addRule(setter, newVal, setNew)}
                  className="text-[#00c896] text-xs font-bold hover:opacity-80 transition-all">
                  Add
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ImageSlot = ({ label, value, onChange }) => {
  const fileRef = useRef(null);
  const zoneRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => onChange(e.target.result);
    reader.readAsDataURL(file);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith('image/')) { handleFile(item.getAsFile()); e.preventDefault(); break; }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[9px] font-bold uppercase tracking-widest text-[#5a5d7a] text-center">{label}</div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => handleFile(e.target.files?.[0])} />
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-[#2a2d3e] group">
          <img src={value} alt={label} className="w-full h-24 object-cover" />
          <button onClick={() => onChange(null)}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(0,0,0,0.75)] rounded-full p-0.5">
            <X size={10} className="text-white" />
          </button>
        </div>
      ) : (
        <div
          ref={zoneRef}
          tabIndex={0}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="relative w-full h-24 rounded-lg border-2 border-dashed border-[#2a2d3e] flex flex-col items-center justify-center gap-1 hover:border-[#e63946] hover:bg-[rgba(230,57,70,0.04)] transition-all focus:outline-none focus:border-[#e63946] outline-none"
        >
          {/* Click zone: focuses for paste */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => zoneRef.current?.focus()} />
          {/* Upload icon */}
          <button
            onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
            className="relative z-10 p-1.5 rounded-lg bg-[#1e2038] text-[#e63946] hover:bg-[#2a2d3e] transition-all"
            title="Upload file"
          >
            <Upload size={14} />
          </button>
          <span className="text-[8px] text-[#3a3d4e] text-center leading-tight pointer-events-none">
            Click → Ctrl+V to paste<br/>or drag & drop
          </span>
        </div>
      )}
    </div>
  );
};

const VideoSlot = ({ value, onChange }) => {
  const fileRef   = useRef(null);
  const objUrlRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('video/')) return;
    if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current);
    const url = URL.createObjectURL(file);
    objUrlRef.current = url;
    onChange(url);
  };

  const handleRemove = () => {
    if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current);
    objUrlRef.current = null;
    onChange(null);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Video size={12} className="text-[#e63946]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#5a5d7a]">Trade Replay Video</span>
        <span className="text-[9px] text-[#3a3d4e]">· max 2 min · mp4 / webm / mov</span>
      </div>
      <input ref={fileRef} type="file" accept="video/*" className="hidden"
        onChange={e => handleFile(e.target.files?.[0])} />
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-[#2a2d3e] group">
          <video src={value} controls className="w-full rounded-xl" style={{ maxHeight: 220 }} />
          <button onClick={handleRemove}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(0,0,0,0.8)] rounded-full p-1.5 hover:bg-[#ff4757]">
            <X size={11} className="text-white" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-5 rounded-xl border-2 border-dashed border-[#2a2d3e] flex flex-col items-center justify-center gap-2 hover:border-[#e63946] hover:bg-[rgba(230,57,70,0.04)] transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-[#1e2038] flex items-center justify-center">
            <Video size={18} className="text-[#e63946]" />
          </div>
          <div className="text-center">
            <div className="text-xs text-[#5a5d7a] font-semibold">Click to upload replay video</div>
            <div className="text-[9px] text-[#3a3d4e] mt-0.5">mp4  ·  webm  ·  mov</div>
          </div>
        </button>
      )}
    </div>
  );
};

// ─── Module 1: Journal ────────────────────────────────────────────────────────

const JournalModule = ({ setTrades, date, setDate }) => {
  const [availableYears, setAvailableYears] = useState(() => load('profx_available_years', [2022, 2023, 2024, 2025, 2026]));
  useEffect(() => { try { localStorage.setItem('profx_available_years', JSON.stringify(availableYears)); } catch {} }, [availableYears]);
  const [lockedYears, setLockedYears] = useState(() => load('profx_locked_years', []));
  useEffect(() => { try { localStorage.setItem('profx_locked_years', JSON.stringify(lockedYears)); } catch {} }, [lockedYears]);
  const [bias,        setBias]        = useState(null);
  const [session,     setSession]     = useState(null);
  const [tradeTime,   setTradeTime]   = useState(null);
  const [pair,        setPair]        = useState('EUR/USD');
  const [pairInput,   setPairInput]   = useState('');
  const [savedPairs,  setSavedPairs]  = useState(() => load('profx_saved_pairs', DEFAULT_PAIRS));
  useEffect(() => { try { localStorage.setItem('profx_saved_pairs', JSON.stringify(savedPairs)); } catch {} }, [savedPairs]);
  const [bullBiasRules,  setBullBiasRules]  = useState(() => load('profx_bull_bias',  DEFAULT_BULL_BIAS.map(r => ({ ...r }))));
  const [bearBiasRules,  setBearBiasRules]  = useState(() => load('profx_bear_bias',  DEFAULT_BEAR_BIAS.map(r => ({ ...r }))));
  const [bullEntryRules, setBullEntryRules] = useState(() => load('profx_bull_entry', DEFAULT_BULL_ENTRY.map(r => ({ ...r }))));
  const [bearEntryRules, setBearEntryRules] = useState(() => load('profx_bear_entry', DEFAULT_BEAR_ENTRY.map(r => ({ ...r }))));
  useEffect(() => { try { localStorage.setItem('profx_bull_bias',  JSON.stringify(bullBiasRules));  } catch {} }, [bullBiasRules]);
  useEffect(() => { try { localStorage.setItem('profx_bear_bias',  JSON.stringify(bearBiasRules));  } catch {} }, [bearBiasRules]);
  useEffect(() => { try { localStorage.setItem('profx_bull_entry', JSON.stringify(bullEntryRules)); } catch {} }, [bullEntryRules]);
  useEffect(() => { try { localStorage.setItem('profx_bear_entry', JSON.stringify(bearEntryRules)); } catch {} }, [bearEntryRules]);

  // Active rules depend on selected bias (default to bullish before selection)
  const isBear = bias === 'Bearish';
  const biasRules      = isBear ? bearBiasRules  : bullBiasRules;
  const setBiasRules   = isBear ? setBearBiasRules  : setBullBiasRules;
  const entryRules     = isBear ? bearEntryRules : bullEntryRules;
  const setEntryRules  = isBear ? setBearEntryRules : setBullEntryRules;

  const [newBiasRule, setNewBiasRule] = useState('');
  const [newEntRule,  setNewEntRule]  = useState('');
  const [htfExpanded, setHtfExpanded] = useState(true);
  const [ltfExpanded, setLtfExpanded] = useState(true);
  const [psych,       setPsych]       = useState([]);
  const [riskAmt,     setRiskAmt]     = useState('');
  const [sl,          setSl]          = useState('');
  const [rr,          setRr]          = useState('');
  const [outcome,     setOutcome]     = useState(null);
  const [imgBefore,   setImgBefore]   = useState(null);
  const [imgAfter,    setImgAfter]    = useState(null);
  const [imgDaily,    setImgDaily]    = useState(null);
  const [imgWeekly,   setImgWeekly]   = useState(null);
  const [webhookUrl,  setWebhookUrl]  = useState(() => localStorage.getItem('profx-discord-webhook') ?? TRADE_WEBHOOK ?? '');
  const [webhookInput, setWebhookInput] = useState('');
  const [showDiscordSettings, setShowDiscordSettings] = useState(false);
  const [discordSendStatus, setDiscordSendStatus] = useState('idle');
  const [toast, setToast] = useState(null); // { msg, color }

  const showToast = (msg, color = '#00c896') => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  // Score state synced via callbacks from RuleSection children (rawChecked inside child is always correct)
  const [htfScore, setHtfScore] = useState(() => {
    const htf = bias === 'Bearish' ? bearBiasRules : bullBiasRules;
    return { c: htf.filter(r => r.checked).length, t: htf.length };
  });
  const [ltfScore, setLtfScore] = useState(() => {
    const ltf = bias === 'Bearish' ? bearEntryRules : bullEntryRules;
    return { c: ltf.filter(r => r.checked).length, t: ltf.length };
  });
  const checkedCount = htfScore.c + ltfScore.c;
  const totalRules   = htfScore.t + ltfScore.t;
  const pct          = totalRules > 0 ? Math.round((checkedCount / totalRules) * 100) : 0;
  const grade        = calcGrade(pct);
  const lotSize      = calcLotSize(riskAmt, sl);
  const previewPnL   = outcome && rr && riskAmt ? calcPnL(outcome, riskAmt, rr) : null;


  const togglePsych = (tag) =>
    setPsych(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const resetForm = () => {
    setBias(null); setSession(null); setTradeTime(null); setPair('EUR/USD'); setPairInput('');
    setBullBiasRules(prev => prev.map(r => ({ ...r, checked: false })));
    setBearBiasRules(prev => prev.map(r => ({ ...r, checked: false })));
    setBullEntryRules(prev => prev.map(r => ({ ...r, checked: false })));
    setBearEntryRules(prev => prev.map(r => ({ ...r, checked: false })));
    setPsych([]); setRiskAmt(''); setSl(''); setRr(''); setOutcome(null);
    setImgBefore(null); setImgAfter(null); setImgDaily(null); setImgWeekly(null);
    // Advance date by 1 day so backtesting flows forward automatically
    setDate(prev => {
      const d = new Date(prev + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      const next = d.toISOString().split('T')[0];
      const nextYear = d.getFullYear();
      // If the next day falls into a locked year, stay on current date
      return lockedYears.includes(nextYear) ? prev : next;
    });
  };

  const postTradeToDiscord = (trade) => {
    const statusEmoji = { Win: '✅', Loss: '❌', 'Break Even': '➖', 'No Trade': '🚫' }[trade.status] || '📋';
    const dirColor    = trade.direction === 'Buy' ? 0x00c896 : trade.direction === 'Sell' ? 0xff4757 : 0x8888aa;
    const pnlStr      = trade.pnl !== 0 ? `${trade.pnl > 0 ? '+' : ''}$${trade.pnl.toFixed(2)} USD` : '—';

    const embed = {
      title: `${statusEmoji}  ${trade.pair}  ·  ${trade.direction}  ·  ${trade.status.toUpperCase()}`,
      color: dirColor,
      fields: [
        { name: '📅 Date',     value: trade.date,                       inline: true },
        { name: '⏰ Session',  value: trade.session,                    inline: true },
        { name: '📊 R:R',      value: `1 : ${trade.rr}`,               inline: true },
        { name: '💰 P&L',      value: `**${pnlStr}**`,                  inline: true },
        { name: '📋 Bias',     value: trade.bias,                       inline: true },
        { name: '🏆 Grade',    value: `**${trade.grade}**  (${trade.pct}%)`, inline: true },
        { name: '✅ Rules',    value: `${trade.totalChecked} / ${trade.totalRules} checked`, inline: true },
        trade.psychology?.length ? { name: '🧠 Psych', value: trade.psychology.join(', '), inline: true } : null,
        ...(trade.imgBefore ? [{ name: '📸 Charts', value: 'Before ↑  ·  After ↓', inline: false }] : []),
      ].filter(Boolean),
      ...(trade.imgBefore ? { thumbnail: { url: 'attachment://before.png' } } : {}),
      ...(trade.imgAfter  ? { image:     { url: 'attachment://after.png'  } } : {}),
      footer: { text: 'ProFx Backtesting Journal  ·  Trade Logged' },
      timestamp: new Date().toISOString(),
    };

    const dataURLtoBlob = (dataURL) => {
      const [header, b64] = dataURL.split(',');
      const mime = header.match(/:(.*?);/)[1];
      const bin  = atob(b64);
      const arr  = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    };

    const formData = new FormData();
    formData.append('payload_json', JSON.stringify({ username: 'ProFx Trade', embeds: [embed] }));
    if (trade.imgBefore) formData.append('files[0]', dataURLtoBlob(trade.imgBefore), 'before.png');
    if (trade.imgAfter)  formData.append('files[1]', dataURLtoBlob(trade.imgAfter),  'after.png');

    const url = webhookUrl || TRADE_WEBHOOK;
    if (!url) return;
    setDiscordSendStatus('sending');
    fetch(url, { method: 'POST', body: formData })
      .then(() => setDiscordSendStatus('sent'))
      .catch(() => setDiscordSendStatus('error'))
      .finally(() => setTimeout(() => setDiscordSendStatus('idle'), 3000));
  };

  const handleLog = () => {
    if (!bias || !session || !rr) {
      alert('Please complete: Bias, Session, and R:R before logging.');
      return;
    }
    const pnl = calcPnL(outcome, +riskAmt || 0, +rr);
    const trade = {
      id: Date.now(),
      date, pair, bias,
      direction: bias === 'Bullish' ? 'Buy' : 'Sell',
      session, tradeTime: tradeTime ? `${tradeTime} ${SESSION_TIMES[session]?.period ?? ''}`.trim() : null,
      psychology: [...psych],
      riskAmt: +riskAmt || 0, sl: +sl || 0, lotSize: +lotSize,
      rr: +rr, status: outcome, pnl,
      biasChecked: biasRules.filter(r => r.checked).length,
      biasTotal:   biasRules.length,
      entChecked:  entryRules.filter(r => r.checked).length,
      entTotal:    entryRules.length,
      totalChecked: checkedCount, totalRules, pct, grade: grade.label,
      imgBefore, imgAfter, imgDaily, imgWeekly,
    };
    setTrades(prev => [...prev, trade]);
    imgSave(`${trade.id}_before`,  imgBefore);
    imgSave(`${trade.id}_after`,   imgAfter);
    imgSave(`${trade.id}_daily`,   imgDaily);
    imgSave(`${trade.id}_weekly`,  imgWeekly);
    postTradeToDiscord(trade);
    showToast(`✓ Trade logged — ${pair} ${outcome} | 1:${rr} | Grade ${grade.label}`);
    resetForm();
  };

  const handleNoTrade = () => {
    const trade = {
      id: Date.now(),
      date, pair, bias: bias || '—',
      direction: bias === 'Bullish' ? 'Buy' : bias === 'Bearish' ? 'Sell' : '—',
      session: session || '—', psychology: [...psych],
      riskAmt: 0, sl: 0, lotSize: 0, rr: 0,
      status: 'No Trade', pnl: 0,
      biasChecked: biasRules.filter(r => r.checked).length,
      biasTotal:   biasRules.length,
      entChecked:  entryRules.filter(r => r.checked).length,
      entTotal:    entryRules.length,
      totalChecked: checkedCount, totalRules, pct, grade: grade.label,
      imgBefore, imgAfter, imgDaily, imgWeekly,
    };
    setTrades(prev => [...prev, trade]);
    imgSave(`${trade.id}_before`,  imgBefore);
    imgSave(`${trade.id}_after`,   imgAfter);
    imgSave(`${trade.id}_daily`,   imgDaily);
    imgSave(`${trade.id}_weekly`,  imgWeekly);
    postTradeToDiscord(trade);
    showToast(`🚫 No Trade logged — ${pair} ${date}`, '#f5a623');
    resetForm();
  };

  const handleSkipDay = () => resetForm();


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* ── Toast notification ── */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-5 py-3 rounded-xl text-white text-sm font-bold shadow-2xl transition-all pointer-events-none"
          style={{ background: toast.color, boxShadow: `0 0 30px ${toast.color}55`, minWidth: 280, textAlign: 'center' }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Left Column ── */}
      <div className="flex flex-col gap-4">

        {/* Market Context */}
        <Card>
          <Label>Market Context</Label>

          {/* Date */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-[#5a5d7a]">Backtest Period</div>
              <div className="text-[9px] text-[#3a3d4e]">Hold lock icon to toggle</div>
            </div>
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {availableYears.map(yr => {
                const active  = date.startsWith(String(yr));
                const locked  = lockedYears.includes(yr);
                const toggleLock = (e) => {
                  e.stopPropagation();
                  setLockedYears(prev =>
                    prev.includes(yr) ? prev.filter(y => y !== yr) : [...prev, yr]
                  );
                };
                return (
                  <div key={yr} className="flex-1 relative group">
                    <button
                      disabled={locked}
                      onClick={() => !locked && setDate(prev => `${yr}${prev.slice(4)}`)}
                      className={`w-full py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
                        locked
                          ? 'bg-[#0f111a] border border-[#2a2d3e] text-[#2a2d3e] cursor-not-allowed'
                          : active
                            ? 'bg-gradient-to-b from-[#e63946] to-[#3a7ac9] text-white shadow shadow-[rgba(230,57,70,0.4)]'
                            : 'bg-[#0f111a] border border-[#2a2d3e] text-[#5a5d7a] hover:text-white hover:border-[#4a4d5e]'
                      }`}
                    >
                      {locked ? (
                        <span className="flex items-center justify-center gap-1">
                          <Lock size={10} className="text-[#3a3d4e]" />{yr}
                        </span>
                      ) : yr}
                    </button>
                    {/* Lock toggle — visible on hover */}
                    <button
                      onClick={toggleLock}
                      title={locked ? 'Unlock year' : 'Lock year'}
                      className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center transition-all z-10
                        ${locked
                          ? 'bg-[#ff4757] opacity-100'
                          : 'bg-[#2a2d3e] opacity-0 group-hover:opacity-100'}
                        hover:scale-110`}
                    >
                      {locked
                        ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                        : <Lock size={8} className="text-[#8888aa]" />}
                    </button>
                  </div>
                );
              })}
              {/* Add next year */}
              <button
                onClick={() => {
                  const next = Math.max(...availableYears) + 1;
                  setAvailableYears(prev => [...prev, next]);
                }}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-[#0f111a] border border-dashed border-[#2a2d3e] text-[#e63946] hover:border-[#e63946] hover:bg-[rgba(230,57,70,0.06)] transition-all flex-shrink-0"
                title="Add next year"
              >+ yr</button>
            </div>
            <input
              type="date" value={date}
              onChange={e => {
                const yr = parseInt(e.target.value.slice(0, 4));
                if (!lockedYears.includes(yr)) setDate(e.target.value);
              }}
              className="w-full bg-[#0f111a] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e63946]"
            />
            {lockedYears.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <Lock size={9} className="text-[#ff4757]" />
                <span className="text-[9px] text-[#5a5d7a]">
                  Locked: {lockedYears.sort().join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Bias */}
          <div className="mb-4">
            <div className="text-[10px] text-[#5a5d7a] mb-2">Market Bias</div>
            <div className="grid grid-cols-2 gap-2">
              {BIASES.map(b => (
                <button
                  key={b} onClick={() => setBias(b)}
                  className={`py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
                    bias === b
                      ? b === 'Bullish'
                        ? 'bg-[#00c896] text-black shadow-lg shadow-[rgba(0,200,150,0.3)]'
                        : 'bg-[#ff4757] text-white shadow-lg shadow-[rgba(255,71,87,0.3)]'
                      : 'bg-[#0f111a] border border-[#2a2d3e] text-[#8888aa] hover:border-[#4a4d5e]'
                  }`}
                >
                  {b === 'Bullish' ? '▲ ' : '▼ '}{b}
                </button>
              ))}
            </div>
          </div>

          {/* Session */}
          <div className="mb-4">
            <div className="text-[10px] text-[#5a5d7a] mb-2">Session</div>
            <div className="grid grid-cols-2 gap-2">
              {SESSIONS.map(s => (
                <button
                  key={s} onClick={() => { setSession(s); setTradeTime(null); }}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    session === s
                      ? 'bg-[#e63946] text-white shadow-lg shadow-[rgba(230,57,70,0.3)]'
                      : 'bg-[#0f111a] border border-[#2a2d3e] text-[#8888aa] hover:border-[#4a4d5e]'
                  }`}
                >
                  {s === 'London' ? '🇬🇧 ' : '🇺🇸 '}{s}
                </button>
              ))}
            </div>
            {session && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f111a] border border-[#2a2d3e]">
                {SESSION_TIMES[session].hours.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setTradeTime(tradeTime === h ? null : h)}
                    className="text-sm font-mono font-black px-2 py-0.5 rounded-md transition-all"
                    style={{
                      color: SESSION_TIMES[session].color,
                      background: tradeTime === h ? SESSION_TIMES[session].color + '33' : 'transparent',
                      border: tradeTime === h ? `1px solid ${SESSION_TIMES[session].color}` : '1px solid transparent',
                    }}
                  >{h}</button>
                ))}
                <span className="text-xs font-black ml-1" style={{ color: SESSION_TIMES[session].color }}>{SESSION_TIMES[session].period}</span>
              </div>
            )}
          </div>

          {/* Pair */}
          <div>
            <div className="text-[10px] text-[#5a5d7a] mb-2">Asset Pair</div>
            {/* Saved pair chips */}
            <div className="flex flex-wrap gap-2 mb-2">
              {savedPairs.map(p => (
                <div key={p} className="group relative flex items-center">
                  <button
                    onClick={() => setPair(p)}
                    className={`py-1.5 pl-3 pr-6 rounded-lg text-xs font-mono font-bold transition-all ${
                      pair === p
                        ? 'bg-[#e63946] text-white'
                        : 'bg-[#0f111a] border border-[#2a2d3e] text-[#8888aa] hover:border-[#4a4d5e]'
                    }`}
                  >
                    {p}
                  </button>
                  <button
                    onClick={() => { setSavedPairs(prev => prev.filter(x => x !== p)); if (pair === p) setPair(''); }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[#5a5d7a] hover:text-[#ff4757] text-[10px] leading-none"
                    title="Remove"
                  >×</button>
                </div>
              ))}
            </div>
            {/* Type / add new pair */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type pair… XAU/USD, NAS100"
                value={pairInput}
                onChange={e => { const v = e.target.value.toUpperCase(); setPairInput(v); setPair(v || pair); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && pairInput.trim()) {
                    const v = pairInput.trim().toUpperCase();
                    if (!savedPairs.includes(v)) setSavedPairs(prev => [...prev, v]);
                    setPair(v); setPairInput('');
                  }
                }}
                className="flex-1 bg-[#0f111a] border border-[#2a2d3e] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#e63946] placeholder-[#3a3d4e]"
              />
              <button
                onClick={() => {
                  const v = pairInput.trim().toUpperCase();
                  if (!v) return;
                  if (!savedPairs.includes(v)) setSavedPairs(prev => [...prev, v]);
                  setPair(v); setPairInput('');
                }}
                className="px-3 py-2 rounded-lg bg-[#0f111a] border border-[#2a2d3e] text-[#e63946] text-xs font-bold hover:border-[#e63946] transition-all"
                title="Save to list"
              >+ Save</button>
            </div>
          </div>
        </Card>

        {/* Score bar */}
        <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: '#0d0f18', border: '1px solid #1a1d2e' }}>
          <span className="text-xs text-[#3e4255] font-mono">{checkedCount}/{totalRules} rules</span>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-base font-black font-mono leading-none" style={{ color: grade.color }}>{pct}%</div>
              <div className="text-[9px] font-mono tracking-widest uppercase mt-0.5" style={{ color: '#3e4255' }}>Completion</div>
            </div>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-black font-mono"
              style={{ background: grade.bg, border: `2px solid ${grade.color}`, color: grade.color }}>
              {grade.label}
            </div>
          </div>
        </div>

        {/* Pre-Trade Summary */}
        <Card>
          <Label>Pre-Trade Summary</Label>
          <div className="flex items-center gap-5 mb-4">
            {/* Grade ring */}
            <div
              className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center text-3xl font-black border-[3px] transition-all"
              style={{ borderColor: grade.color, color: grade.color, backgroundColor: grade.bg }}
            >
              {grade.label}
            </div>
            <div className="flex-1">
              <div className="text-xs text-[#5a5d7a] mb-2">Setup Quality</div>
              <div className="h-2 bg-[#0f111a] rounded-full overflow-hidden mb-1">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: grade.color }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-[#5a5d7a]">{checkedCount} / {totalRules} rules</span>
                <span className="text-sm font-bold font-mono" style={{ color: grade.color }}>{pct}%</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { g: 'A+', thr: '≥ 85%', c: '#00c896', bc: 'rgba(0,200,150,0.2)'   },
              { g: 'B+', thr: '≥ 70%', c: '#a78bfa', bc: 'rgba(167,139,250,0.2)' },
              { g: 'C-', thr: '≥ 50%', c: '#f5a623', bc: 'rgba(245,166,35,0.2)'  },
              { g: 'D-', thr: '< 50%', c: '#ff4757', bc: 'rgba(255,71,87,0.2)'   },
            ].map(t => (
              <div
                key={t.g}
                className="py-2 px-1 rounded-lg border text-xs"
                style={{ borderColor: t.bc, backgroundColor: grade.label === t.g ? t.bc : 'transparent' }}
              >
                <div className="font-black text-base" style={{ color: t.c }}>{t.g}</div>
                <div className="text-[#5a5d7a]">{t.thr}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Log Trade Outcome */}
        <Card>
          <Label>Log Trade Outcome</Label>

          {/* Chart Screenshots */}
          <div className="mb-5">
            <div className="text-[10px] text-[#5a5d7a] mb-2">Chart Screenshots</div>
            <div className="grid grid-cols-3 gap-3">
              <ImageSlot label="Before" value={imgBefore} onChange={setImgBefore} />
              <ImageSlot label="After"  value={imgAfter}  onChange={setImgAfter}  />
              <ImageSlot label="Daily"  value={imgDaily}  onChange={setImgDaily}  />
            </div>
          </div>

          {/* R:R */}
          <div className="mb-5">
            <div className="text-[10px] text-[#5a5d7a] mb-1.5">Risk : Reward Achieved</div>
            <div className="flex items-center gap-2">
              <span className="text-[#5a5d7a] text-sm font-mono">1 :</span>
              <input
                type="number" step="0.1" placeholder="2.5" value={rr}
                onChange={e => setRr(e.target.value)}
                className="flex-1 bg-[#0f111a] border border-[#2a2d3e] rounded-lg px-3 py-3 text-base text-white font-mono focus:outline-none focus:border-[#e63946]"
              />
            </div>
          </div>

          {/* PnL preview */}
          {previewPnL !== null && (
            <div className="mb-5 flex items-center justify-between p-4 rounded-lg bg-[#0f111a] border border-[#2a2d3e]">
              <span className="text-[10px] text-[#5a5d7a] uppercase tracking-wider">Estimated P&L</span>
              <span className={`text-xl font-black font-mono ${previewPnL >= 0 ? 'text-[#00c896]' : 'text-[#ff4757]'}`}>
                {previewPnL >= 0 ? '+' : ''}${previewPnL.toFixed(2)}
              </span>
            </div>
          )}

        </Card>

      </div>

      {/* ── Right Column ── */}
      <div className="flex flex-col gap-4">

        <RuleSection
          rules={biasRules} setter={setBiasRules}
          newVal={newBiasRule} setNew={setNewBiasRule}
          label="HTF Bias"
          subtitle="Daily & 4-Hour Timeframe"
          expanded={htfExpanded} onToggle={() => setHtfExpanded(v => !v)}
          onCheckedChange={(c, t) => setHtfScore({ c, t })}
        />
        <RuleSection
          rules={entryRules} setter={setEntryRules}
          newVal={newEntRule} setNew={setNewEntRule}
          label="LTF Entry"
          subtitle="15-Minute & 1-Hour Timeframe"
          expanded={ltfExpanded} onToggle={() => setLtfExpanded(v => !v)}
          onCheckedChange={(c, t) => setLtfScore({ c, t })}
        />

        {/* Action Card */}
        <Card>
          {/* Connect Discord */}
          <div className="mb-4">
            <button
              onClick={() => { setWebhookInput(webhookUrl); setShowDiscordSettings(v => !v); }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
              style={{
                background: webhookUrl ? 'rgba(88,101,242,0.18)' : 'rgba(88,101,242,0.06)',
                border: `1px solid ${webhookUrl ? '#5865F266' : 'rgba(88,101,242,0.2)'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.012.12.074.228.16.288a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                <span className="font-mono text-xs font-bold" style={{ color: '#5865F2' }}>
                  {webhookUrl ? 'Discord Connected' : 'Connect Discord'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {discordSendStatus === 'sending' && <span className="text-[10px] text-[#5865F2] animate-pulse">Sending…</span>}
                {discordSendStatus === 'sent'    && <span className="text-[10px] text-[#00c896]">✓ Sent</span>}
                {discordSendStatus === 'error'   && <span className="text-[10px] text-[#ff4757]">✗ Error</span>}
                <div className="w-2 h-2 rounded-full" style={{ background: webhookUrl ? '#5865F2' : '#2a2d3e', boxShadow: webhookUrl ? '0 0 6px 2px rgba(88,101,242,0.6)' : 'none' }} />
                <span className="text-[#5865F2] text-xs">⚙</span>
              </div>
            </button>

            {showDiscordSettings && (
              <div className="mt-2 p-3 rounded-xl space-y-2" style={{ background: '#0f111a', border: '1px solid rgba(88,101,242,0.25)' }}>
                <div className="text-[10px] text-[#5a5d7a] uppercase tracking-widest mb-1">Webhook URL</div>
                <input
                  type="text" value={webhookInput} onChange={e => setWebhookInput(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full bg-[#161829] border border-[#2a2d3e] text-white font-mono text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#5865F2] placeholder-[#3a3d4e]"
                />
                <div className="flex gap-2">
                  <button onClick={() => { localStorage.removeItem('profx-discord-webhook'); setWebhookUrl(''); setWebhookInput(''); setShowDiscordSettings(false); }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold text-[#5a5d7a] hover:text-white transition-colors border border-[#2a2d3e]">
                    Clear
                  </button>
                  <button onClick={() => {
                    const url = webhookInput.trim();
                    localStorage.setItem('profx-discord-webhook', url);
                    setWebhookUrl(url);
                    setShowDiscordSettings(false);
                  }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
                    style={{ background: '#5865F2' }}>
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3 action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleLog}
              className="w-full py-4 rounded-xl font-black text-base tracking-widest transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #e63946, #00c896)', color: 'white' }}
            >
              ✓ TAKE TRADE
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleNoTrade}
                className="py-3 rounded-xl font-black text-sm tracking-widest transition-all hover:opacity-90 active:scale-[0.98] bg-[#f5a623] text-black"
              >
                ✗ NO TRADE
              </button>
              <button
                onClick={handleSkipDay}
                className="py-3 rounded-xl font-black text-sm tracking-widest transition-all hover:opacity-90 active:scale-[0.98] bg-[#2a2d3e] text-[#8888aa] hover:text-white border border-[#3a3d4e]"
              >
                → SKIP DAY
              </button>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};

// ─── Module 2: History ────────────────────────────────────────────────────────

const HistoryModule = ({ trades, setTrades }) => {
  const [deleteId,    setDeleteId]    = useState(null);
  const [deleteAll,   setDeleteAll]   = useState(false);
  const [expandedId,  setExpandedId]  = useState(null);
  const [lightbox,    setLightbox]    = useState(null);
  const [idbImages,   setIdbImages]   = useState({}); // { [tradeId]: {before,after,result} }

  const sorted = useMemo(() => [...trades].reverse(), [trades]);

  // Load images from IndexedDB when a row is expanded and images aren't in memory
  const handleExpand = (t) => {
    const next = expandedId === t.id ? null : t.id;
    setExpandedId(next);
    if (next && !idbImages[t.id] && !t.imgBefore && !t.imgAfter && !t.imgDaily && !t.imgWeekly) {
      imgLoadTrade(t.id).then(imgs => {
        if (imgs.before || imgs.after || imgs.daily || imgs.weekly)
          setIdbImages(prev => ({ ...prev, [t.id]: imgs }));
      }).catch(() => {});
    }
  };

  const getImg = (t, slot) =>
    t[`img${slot.charAt(0).toUpperCase()}${slot.slice(1)}`] ||
    idbImages[t.id]?.[slot] ||
    null;

  const confirmDelete = () => {
    imgDeleteTrade(deleteId);
    setTrades(prev => prev.filter(t => t.id !== deleteId));
    setDeleteId(null);
  };

  const handleUpdateStatus = (t, newStatus) => {
    const pnl = calcPnL(newStatus, t.riskAmt, t.rr);
    setTrades(prev => prev.map(tr => tr.id === t.id ? { ...tr, status: newStatus, pnl } : tr));
  };

  const confirmDeleteAll = () => {
    trades.forEach(t => imgDeleteTrade(t.id));
    setTrades([]);
    setDeleteAll(false);
  };

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <BookOpen size={48} className="text-[#2a2d3e] mb-4" />
        <div className="text-[#5a5d7a] text-sm">No trades logged yet.</div>
        <div className="text-[#3a3d4e] text-xs mt-1">Head to the Journal tab to record your first trade.</div>
      </div>
    );
  }

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#5a5d7a]">{lightbox.label}</span>
              <button onClick={() => setLightbox(null)} className="text-[#5a5d7a] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <img src={lightbox.src} alt={lightbox.label} className="w-full rounded-xl border border-[#2a2d3e] object-contain max-h-[80vh]" />
          </div>
        </div>
      )}

      {/* Delete single confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#161829] border border-[#2a2d3e] rounded-2xl p-6 max-w-xs w-full">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={20} className="text-[#ff4757]" />
              <h3 className="text-white font-bold">Delete Trade?</h3>
            </div>
            <p className="text-[#8888aa] text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-lg border border-[#2a2d3e] text-[#8888aa] hover:text-white text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-lg bg-[#ff4757] text-white text-sm font-bold hover:bg-[#ff6070] transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All confirm */}
      {deleteAll && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#161829] border border-[#ff4757] rounded-2xl p-6 max-w-xs w-full">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={20} className="text-[#ff4757]" />
              <h3 className="text-white font-bold">Delete ALL Trades?</h3>
            </div>
            <p className="text-[#8888aa] text-sm mb-1">This will permanently delete <span className="text-white font-bold">{trades.length} trades</span>.</p>
            <p className="text-[#ff4757] text-xs mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteAll(false)}
                className="flex-1 py-2.5 rounded-lg border border-[#2a2d3e] text-[#8888aa] hover:text-white text-sm font-semibold transition-all"
              >Cancel</button>
              <button
                onClick={confirmDeleteAll}
                className="flex-1 py-2.5 rounded-lg bg-[#ff4757] text-white text-sm font-bold hover:bg-[#ff6070] transition-all"
              >Delete All</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-[#5a5d7a]">{trades.length} trade{trades.length !== 1 ? 's' : ''} logged</span>
        <button
          onClick={() => setDeleteAll(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(255,71,87,0.3)] text-[#ff4757] text-[10px] font-bold uppercase tracking-wider hover:bg-[rgba(255,71,87,0.1)] transition-all"
        >
          <Trash2 size={11} /> Delete All
        </button>
      </div>

      <div className="rounded-xl border border-[#2a2d3e] overflow-hidden overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-[#13151f] border-b border-[#2a2d3e]">
              {['Date', 'Pair', 'Dir', 'Session', 'Psych', 'Status', 'RR', 'P&L', 'Rules', 'Grade', ''].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#5a5d7a]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, idx) => {
              const isExpanded = expandedId === t.id;
              const hasImages  = t.imgBefore || t.imgAfter || t.imgDaily || t.imgWeekly || idbImages[t.id]?.before || idbImages[t.id]?.after || idbImages[t.id]?.daily || idbImages[t.id]?.weekly;
              const rowBg      = idx % 2 === 0 ? 'bg-[#161829]' : 'bg-[#13151f]';
              return (
                <React.Fragment key={t.id}>
                  <tr
                    onClick={() => handleExpand(t)}
                    className={`border-b ${isExpanded ? 'border-[#2a2d3e]' : 'border-[#1e2038]'} hover:bg-[#1e2038] transition-colors cursor-pointer ${rowBg}`}
                  >
                    <td className="px-3 py-3 font-mono text-xs text-[#6a6d8a]">{t.date}</td>
                    <td className="px-3 py-3 font-mono font-bold text-white text-xs">{t.pair}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.direction === 'Buy'
                          ? 'bg-[rgba(0,200,150,0.12)] text-[#00c896]'
                          : 'bg-[rgba(255,71,87,0.12)] text-[#ff4757]'
                      }`}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-[#6a6d8a]">
                      <div>{t.session}</div>
                      {t.tradeTime && <div className="text-[10px] font-mono font-bold" style={{ color: t.session === 'London' ? '#ff6b81' : '#ffa502' }}>{t.tradeTime}</div>}
                    </td>
                    <td className="px-3 py-3 text-xs text-[#6a6d8a] max-w-[120px] truncate">
                      {t.psychology.length > 0 ? t.psychology.join(', ') : '—'}
                    </td>
                    <td className="px-3 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-3 py-3 font-mono text-xs text-white">1:{t.rr}</td>
                    <td className={`px-3 py-3 font-mono text-xs font-bold ${!t.status ? 'text-[#3a3d4e]' : t.pnl >= 0 ? 'text-[#00c896]' : 'text-[#ff4757]'}`}>
                      {!t.status ? '—' : `${t.pnl >= 0 ? '+' : ''}$${(t.pnl ?? 0).toFixed(2)}`}
                    </td>
                    <td className="px-3 py-3 text-xs text-[#6a6d8a] font-mono">{t.totalChecked}/{t.totalRules}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          t.grade === 'A+' ? 'bg-[rgba(0,200,150,0.12)] text-[#00c896]'
                          : t.grade === 'B+' ? 'bg-[rgba(167,139,250,0.12)] text-[#a78bfa]'
                          : t.grade === 'C-' ? 'bg-[rgba(245,166,35,0.12)] text-[#f5a623]'
                          : t.grade === 'D-' ? 'bg-[rgba(255,71,87,0.12)] text-[#ff4757]'
                          : 'bg-[rgba(90,93,122,0.12)] text-[#5a5d7a]'
                        }`}>{t.grade}</span>
                        {hasImages && <span className="text-[11px]" title="Has screenshots">📸</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteId(t.id); }}
                        className="p-1.5 rounded hover:bg-[rgba(255,71,87,0.12)] text-[#3a3d4e] hover:text-[#ff4757] transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className={rowBg}>
                      <td colSpan="11" className="px-4 pb-4 pt-2">
                        {/* Outcome selector */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] text-[#5a5d7a] uppercase tracking-widest mr-1">Result:</span>
                          {[
                            { s: 'Win',    label: 'WIN',    bg: '#00c896', tc: 'black' },
                            { s: 'Loss',   label: 'LOSS',   bg: '#ff4757', tc: 'white' },
                            { s: 'Break Even', label: 'BE', bg: '#f5a623', tc: 'black' },
                            { s: 'Missed', label: 'MISSED', bg: '#2a2d3e', tc: '#8888aa' },
                          ].map(({ s, label, bg, tc }) => (
                            <button
                              key={s}
                              onClick={e => { e.stopPropagation(); handleUpdateStatus(t, t.status === s ? null : s); }}
                              className="px-3 py-1 rounded-lg text-[10px] font-black tracking-wider transition-all"
                              style={{
                                background: t.status === s ? bg : 'transparent',
                                color: t.status === s ? tc : '#5a5d7a',
                                border: `1px solid ${t.status === s ? bg : '#2a2d3e'}`,
                              }}
                            >{label}</button>
                          ))}
                          {t.status && (
                            <span className="text-[10px] font-mono font-bold ml-2" style={{ color: t.pnl > 0 ? '#00c896' : t.pnl < 0 ? '#ff4757' : '#5a5d7a' }}>
                              {t.pnl > 0 ? '+' : ''}${(t.pnl ?? 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                        {hasImages ? (
                          <div className="flex gap-3 flex-wrap">
                            {[
                              { label: 'BEFORE',  img: getImg(t, 'before'),  color: '#e63946' },
                              { label: 'AFTER',   img: getImg(t, 'after'),   color: '#00c896' },
                              { label: 'DAILY',   img: getImg(t, 'daily'),   color: '#f5a623' },
                              { label: 'WEEKLY',  img: getImg(t, 'weekly'),  color: '#4a90d9' },
                            ].filter(s => s.img).map(({ label, img, color }) => (
                              <div key={label} className="flex flex-col gap-1">
                                <div className="text-[9px] font-black uppercase tracking-widest text-center" style={{ color }}>{label}</div>
                                <div
                                  className="relative group cursor-zoom-in"
                                  onClick={e => { e.stopPropagation(); setLightbox({ src: img, label }); }}
                                >
                                  <img src={img} alt={label}
                                    className="rounded-lg border border-[#2a2d3e] object-cover transition-all group-hover:border-[#e63946] group-hover:brightness-90"
                                    style={{ maxHeight: 180, maxWidth: 280 }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <div className="bg-black/60 rounded-lg px-2 py-1 text-[10px] text-white font-bold">🔍 View</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-[#3a3d4e] italic py-1">No chart screenshots attached to this trade.</div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ─── Module 3: Analytics ──────────────────────────────────────────────────────

const AnalyticsModule = ({ trades, backtestDate }) => {
  const wins   = trades.filter(t => t.status === 'Win');
  const losses = trades.filter(t => t.status === 'Loss');
  const buys   = trades.filter(t => t.direction === 'Buy').length;
  const sells  = trades.filter(t => t.direction === 'Sell').length;

  const winRate  = trades.length > 0 ? ((wins.length / trades.length) * 100).toFixed(1) : '0.0';
  const totalPnL = trades.reduce((s, t) => s + t.pnl, 0);
  const maxRR    = trades.length > 0 ? Math.max(...trades.map(t => t.rr)) : 0;
  const avgRR    = trades.length > 0 ? (trades.reduce((s, t) => s + t.rr, 0) / trades.length).toFixed(1) : '0.0';

  const equityData = trades.reduce((acc, t, i) => {
    const prev = i > 0 ? acc[i - 1].cumPnl : 0;
    acc.push({ n: i + 1, cumPnl: +(prev + t.pnl).toFixed(2), date: t.date });
    return acc;
  }, []);

  const pieData = [
    { name: 'Buy',  value: buys,  color: '#00c896' },
    { name: 'Sell', value: sells, color: '#ff4757' },
  ].filter(d => d.value > 0);

  // Session breakdown
  const sessionStats = ['London', 'New York'].reduce((acc, s) => {
    const st = trades.filter(t => t.session === s);
    const active = st.filter(t => t.status !== 'No Trade');
    acc[s] = {
      total:   st.length,
      wins:    st.filter(t => t.status === 'Win').length,
      losses:  st.filter(t => t.status === 'Loss').length,
      be:      st.filter(t => t.status === 'Break Even').length,
      nt:      st.filter(t => t.status === 'No Trade').length,
      pnl:     st.reduce((s, t) => s + t.pnl, 0),
      winRate: active.length > 0 ? Math.round((st.filter(t => t.status === 'Win').length / active.length) * 100) : 0,
    };
    return acc;
  }, {});

  // Day of week breakdown
  const DOW_MAP = { 1:'Mon', 2:'Tue', 3:'Wed', 4:'Thu', 5:'Fri' };
  const dayStats = ['Mon','Tue','Wed','Thu','Fri'].reduce((acc, d) => {
    acc[d] = { total:0, wins:0, losses:0, be:0, pnl:0 };
    return acc;
  }, {});
  trades.forEach(t => {
    const dow = new Date(t.date + 'T12:00:00').getDay();
    const key = DOW_MAP[dow];
    if (!key) return;
    dayStats[key].total++;
    if (t.status === 'Win')         dayStats[key].wins++;
    else if (t.status === 'Loss')   dayStats[key].losses++;
    else if (t.status === 'Break Even') dayStats[key].be++;
    dayStats[key].pnl += t.pnl;
  });

  // Monthly (Time) Performance
  const monthStatsMap = {};
  trades.forEach(t => {
    const d = new Date(t.date + 'T12:00:00');
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (!monthStatsMap[key]) monthStatsMap[key] = { key, label, total: 0, wins: 0, losses: 0, be: 0, nt: 0, pnl: 0 };
    monthStatsMap[key].total++;
    if (t.status === 'Win')         monthStatsMap[key].wins++;
    else if (t.status === 'Loss')   monthStatsMap[key].losses++;
    else if (t.status === 'Break Even') monthStatsMap[key].be++;
    else if (t.status === 'No Trade')   monthStatsMap[key].nt++;
    monthStatsMap[key].pnl += t.pnl;
  });
  const monthData = Object.values(monthStatsMap).sort((a, b) => a.key.localeCompare(b.key));

  const MonthTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const m = payload[0].payload;
    const active2 = m.wins + m.losses + m.be;
    const wr = active2 > 0 ? Math.round((m.wins / active2) * 100) : 0;
    return (
      <div className="bg-[#1e2038] border border-[#2a2d3e] rounded-xl px-3 py-2 text-xs">
        <div className="font-bold text-white mb-1">{m.label}</div>
        <div className="flex flex-col gap-0.5">
          <span className={`font-mono font-black ${m.pnl >= 0 ? 'text-[#00c896]' : 'text-[#ff4757]'}`}>{m.pnl >= 0 ? '+' : ''}${m.pnl.toFixed(2)}</span>
          <span className="text-[#e63946]">{wr}% WR · {m.total} trades</span>
          <span className="text-[#5a5d7a]">{m.wins}W · {m.losses}L{m.be > 0 ? ` · ${m.be} BE` : ''}</span>
        </div>
      </div>
    );
  };

  // Calendar — default to backtest date, then latest trade, then today
  const defaultCalDate = (() => {
    if (backtestDate) return new Date(backtestDate + 'T12:00:00');
    if (trades.length > 0) {
      const latest = [...trades].sort((a, b) => b.date.localeCompare(a.date))[0].date;
      return new Date(latest + 'T12:00:00');
    }
    return new Date();
  })();
  const [calYear,  setCalYear]  = useState(defaultCalDate.getFullYear());
  const [calMonth, setCalMonth] = useState(defaultCalDate.getMonth());

  const yr           = calYear;
  const mo           = calMonth;
  const daysInMo     = new Date(yr, mo + 1, 0).getDate();
  const firstDayIdx  = new Date(yr, mo, 1).getDay();
  const monthLabel   = new Date(yr, mo, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => { if (mo === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (mo === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); };

  const dayResults = {};
  trades.forEach(t => {
    if (!dayResults[t.date]) dayResults[t.date] = [];
    dayResults[t.date].push(t.status);
  });

  const EqTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    return (
      <div className="bg-[#1e2038] border border-[#2a2d3e] rounded-lg px-3 py-2 text-xs">
        <div className="text-[#5a5d7a] mb-0.5">Trade #{payload[0].payload.n}</div>
        <div className={`font-bold font-mono ${v >= 0 ? 'text-[#00c896]' : 'text-[#ff4757]'}`}>
          {v >= 0 ? '+' : ''}${v}
        </div>
      </div>
    );
  };

  const kpis = [
    { icon: <Activity size={16} />, label: 'Win Rate',     value: `${winRate}%`,                  sub: `${wins.length}W / ${losses.length}L`,  color: '#00c896' },
    { icon: <DollarSign size={16}/>, label: 'Total PnL',   value: `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`, sub: `${trades.length} trades`, color: totalPnL >= 0 ? '#00c896' : '#ff4757' },
    { icon: <Award size={16} />,     label: 'Best Trade',  value: `1 : ${maxRR}`,                  sub: `Avg RR 1:${avgRR}`,                   color: '#e63946' },
    { icon: <Target size={16} />,    label: 'Total Trades',value: trades.length,                   sub: `${buys} Buy · ${sells} Sell`,          color: '#f5a623' },
  ];

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <BarChart2 size={48} className="text-[#2a2d3e] mb-4" />
        <div className="text-[#5a5d7a] text-sm">No data yet.</div>
        <div className="text-[#3a3d4e] text-xs mt-1">Log trades to see analytics.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1" style={{ color: k.color }}>
              {k.icon}
              <span className="text-[10px] uppercase tracking-widest text-[#5a5d7a]">{k.label}</span>
            </div>
            <div className="text-2xl font-black font-mono" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[10px] text-[#5a5d7a]">{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Equity Curve */}
        <Card className="lg:col-span-2">
          <Label>Equity Curve</Label>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={equityData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#e63946" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#e63946" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2038" />
              <XAxis
                dataKey="n" tick={{ fill: '#5a5d7a', fontSize: 10 }}
                tickFormatter={v => `#${v}`} axisLine={{ stroke: '#2a2d3e' }} tickLine={false}
              />
              <YAxis
                tick={{ fill: '#5a5d7a', fontSize: 10 }}
                tickFormatter={v => `$${v}`} axisLine={false} tickLine={false}
              />
              <Tooltip content={<EqTooltip />} />
              <Line
                type="monotone" dataKey="cumPnl" stroke="#e63946" strokeWidth={2.5}
                dot={{ fill: '#e63946', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#e63946' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Direction Pie */}
        <Card>
          <Label>Direction Split</Label>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={pieData} cx="50%" cy="45%"
                innerRadius={55} outerRadius={85}
                paddingAngle={4} dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, name) => [`${v} trades (${((v / trades.length) * 100).toFixed(1)}%)`, name]}
                contentStyle={{ background: '#1e2038', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 12 }}
              />
              <Legend
                iconType="circle" iconSize={8}
                formatter={v => <span style={{ color: '#8888aa', fontSize: 11 }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Session & Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Session Performance */}
        <Card>
          <Label>Session Performance</Label>
          <div className="flex flex-col gap-3">
            {['London', 'New York'].map(session => {
              const s = sessionStats[session];
              const pnlColor = s.pnl >= 0 ? '#00c896' : '#ff4757';
              return (
                <div key={session} className="p-3 rounded-xl bg-[#0f111a] border border-[#2a2d3e]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{session === 'London' ? '🇬🇧' : '🇺🇸'}</span>
                      <span className="text-xs font-bold text-white">{session}</span>
                      <span className="text-[9px] text-[#5a5d7a] font-mono">{s.total} trade{s.total !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black font-mono" style={{ color: pnlColor }}>{s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(2)}</span>
                      <span className="text-[10px] font-bold text-[#e63946]">{s.winRate}% WR</span>
                    </div>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden mb-2 bg-[#1e2038]">
                    {s.wins   > 0 && <div style={{ flex: s.wins,   background: '#00c896' }} />}
                    {s.losses > 0 && <div style={{ flex: s.losses, background: '#ff4757' }} />}
                    {s.be     > 0 && <div style={{ flex: s.be,     background: '#f5a623' }} />}
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[9px] text-[#00c896] font-bold">✅ {s.wins} Win</span>
                    <span className="text-[9px] text-[#ff4757] font-bold">❌ {s.losses} Loss</span>
                    {s.be > 0 && <span className="text-[9px] text-[#f5a623] font-bold">➖ {s.be} BE</span>}
                    {s.nt > 0 && <span className="text-[9px] text-[#8888aa] font-bold">🚫 {s.nt} NT</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Day of Week */}
        <Card>
          <Label>Day of Week</Label>
          <div className="flex flex-col gap-2.5">
            {['Mon','Tue','Wed','Thu','Fri'].map(day => {
              const d = dayStats[day];
              const active = d.wins + d.losses + d.be;
              const wr = active > 0 ? Math.round((d.wins / active) * 100) : 0;
              const pnlColor = d.pnl > 0 ? '#00c896' : d.pnl < 0 ? '#ff4757' : '#5a5d7a';
              const DAY_FULL = { Mon:'Monday', Tue:'Tuesday', Wed:'Wednesday', Thu:'Thursday', Fri:'Friday' };
              return (
                <div key={day} className="flex items-center gap-3">
                  <div className="text-[10px] font-bold text-[#5a5d7a] w-8 flex-shrink-0">{day}</div>
                  <div className="flex-1 h-6 bg-[#0f111a] rounded-lg overflow-hidden flex">
                    {d.total === 0
                      ? <div className="flex-1 flex items-center px-2"><span className="text-[9px] text-[#2a2d3e]">No trades</span></div>
                      : <>
                          {d.wins   > 0 && <div title={`${d.wins} Win`}   style={{ flex: d.wins,   background: 'rgba(0,200,150,0.55)' }} className="flex items-center justify-center text-[9px] font-black text-[#00c896]">{d.wins}</div>}
                          {d.losses > 0 && <div title={`${d.losses} Loss`} style={{ flex: d.losses, background: 'rgba(255,71,87,0.55)'  }} className="flex items-center justify-center text-[9px] font-black text-[#ff4757]">{d.losses}</div>}
                          {d.be     > 0 && <div title={`${d.be} BE`}      style={{ flex: d.be,     background: 'rgba(245,166,35,0.55)' }} className="flex items-center justify-center text-[9px] font-black text-[#f5a623]">{d.be}</div>}
                        </>
                    }
                  </div>
                  <div className="text-[9px] font-mono font-bold w-14 text-right" style={{ color: pnlColor }}>
                    {d.total > 0 ? `${d.pnl >= 0 ? '+' : ''}$${d.pnl.toFixed(0)}` : '—'}
                  </div>
                  <div className="text-[9px] font-bold w-9 text-right text-[#e63946]">
                    {d.total > 0 ? `${wr}%` : '—'}
                  </div>
                </div>
              );
            })}
            <div className="flex gap-3 mt-1 pt-2 border-t border-[#1e2038] flex-wrap">
              {[['#00c896','Win'],['#ff4757','Loss'],['#f5a623','BE']].map(([c,l]) => (
                <div key={l} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm" style={{ background: c + '99' }} />
                  <span className="text-[9px] text-[#5a5d7a]">{l}</span>
                </div>
              ))}
              <span className="ml-auto text-[9px] text-[#3a3d4e]">P&L · WR%</span>
            </div>
          </div>
        </Card>

      </div>

      {/* Monthly Time Performance */}
      <Card>
        <Label>Time Performance (Monthly)</Label>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={monthData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2038" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#5a5d7a', fontSize: 10 }} axisLine={{ stroke: '#2a2d3e' }} tickLine={false} />
            <YAxis tick={{ fill: '#5a5d7a', fontSize: 10 }} tickFormatter={v => `$${v}`} axisLine={false} tickLine={false} width={46} />
            <Tooltip content={<MonthTooltip />} />
            <ReferenceLine y={0} stroke="#2a2d3e" strokeWidth={1.5} />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {monthData.map((entry, i) => (
                <Cell key={i} fill={entry.pnl >= 0 ? '#00c896' : '#ff4757'} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Monthly detail rows */}
        <div className="mt-3 border-t border-[#1e2038] pt-3 flex flex-col gap-1.5">
          <div className="grid grid-cols-5 text-[9px] uppercase tracking-widest text-[#3a3d4e] px-1 mb-0.5">
            <span>Month</span><span className="text-center">Trades</span><span className="text-center">W · L · BE</span><span className="text-right">P&L</span><span className="text-right">WR%</span>
          </div>
          {monthData.map(m => {
            const active = m.wins + m.losses + m.be;
            const wr = active > 0 ? Math.round((m.wins / active) * 100) : 0;
            const pnlColor = m.pnl >= 0 ? '#00c896' : '#ff4757';
            return (
              <div key={m.key} className="grid grid-cols-5 items-center px-1 py-1 rounded-lg hover:bg-[#1a1c2e] transition-colors">
                <span className="text-[11px] font-bold text-white">{m.label}</span>
                <span className="text-[10px] text-[#8888aa] text-center">{m.total}</span>
                <span className="text-[10px] font-mono text-center">
                  <span className="text-[#00c896]">{m.wins}</span>
                  <span className="text-[#3a3d4e]"> · </span>
                  <span className="text-[#ff4757]">{m.losses}</span>
                  <span className="text-[#3a3d4e]"> · </span>
                  <span className="text-[#f5a623]">{m.be}</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-right" style={{ color: pnlColor }}>
                  {m.pnl >= 0 ? '+' : ''}${m.pnl.toFixed(0)}
                </span>
                <span className="text-[10px] font-bold text-[#e63946] text-right">{active > 0 ? `${wr}%` : '—'}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Performance Calendar */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <Label>Performance Calendar</Label>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-[#2a2d3e] text-[#8888aa] hover:text-white transition-all">‹</button>
            <span className="text-xs font-bold text-white w-32 text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-[#2a2d3e] text-[#8888aa] hover:text-white transition-all">›</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-[9px] font-bold text-[#3a3d4e] py-1 uppercase">{d}</div>
          ))}
          {Array(firstDayIdx).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
          {Array(daysInMo).fill(null).map((_, i) => {
            const day     = i + 1;
            const ds      = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const results = dayResults[ds] || [];
            const hasW    = results.includes('Win');
            const hasL    = results.includes('Loss');
            const realNow = new Date();
            const isToday = yr === realNow.getFullYear() && mo === realNow.getMonth() && day === realNow.getDate();

            let bg = 'bg-[#0f111a] text-[#3a3d4e]';
            if (results.length > 0) {
              if (hasW && !hasL)       bg = 'bg-[rgba(0,200,150,0.18)] text-[#00c896]';
              else if (hasL && !hasW)  bg = 'bg-[rgba(255,71,87,0.18)]  text-[#ff4757]';
              else                     bg = 'bg-[rgba(245,166,35,0.18)]  text-[#f5a623]';
            }

            return (
              <div
                key={day}
                className={`flex items-center justify-center rounded-md text-[11px] font-semibold aspect-square transition-all ${bg} ${isToday ? 'ring-1 ring-[#e63946] ring-offset-1 ring-offset-[#161829]' : ''}`}
                title={results.length > 0 ? `${results.length} trade${results.length > 1 ? 's' : ''}` : undefined}
              >
                {day}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 flex-wrap">
          {[
            { c: 'rgba(0,200,150,0.3)',  label: 'Win day'   },
            { c: 'rgba(255,71,87,0.3)',  label: 'Loss day'  },
            { c: 'rgba(245,166,35,0.3)', label: 'Mixed day' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: l.c }} />
              <span className="text-[10px] text-[#5a5d7a]">{l.label}</span>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
};

// ─── App Shell ────────────────────────────────────────────────────────────────

const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};

// Run once at module load — strip any base64 images that filled localStorage
(() => {
  try {
    const raw = localStorage.getItem('profx_trades');
    if (raw) {
      const trades = JSON.parse(raw);
      const slim = trades.map(({ imgBefore, imgAfter, imgDaily, imgWeekly, ...t }) => t);
      localStorage.setItem('profx_trades', JSON.stringify(slim));
    }
  } catch {}
  try {
    const raw = localStorage.getItem('profx_weekly');
    if (raw) {
      const weekly = JSON.parse(raw);
      const slim = Object.fromEntries(
        Object.entries(weekly).map(([k, v]) => { const { imgBefore, imgAfter, ...rest } = v; return [k, rest]; })
      );
      localStorage.setItem('profx_weekly', JSON.stringify(slim));
    }
  } catch {}
})();

export default function App() {
  const [tab,          setTab]          = useState('journal');
  const [trades,       setTrades]       = useState(() => load('profx_trades', []));
  const [weeklyPlans,  setWeeklyPlans]  = useState(() => load('profx_weekly', {}));
  const [date,         setDate]         = useState(() => {
    let saved = load('profx_date', null);
    if (!saved) {
      const raw = localStorage.getItem('profx_date');
      if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) saved = raw;
    }
    if (saved) return saved;
    const todayYear = parseInt(todayStr().slice(0, 4));
    const lockedArr = load('profx_locked_years', []);
    return lockedArr.includes(todayYear) ? `${todayYear - lockedArr.length}-01-01` : todayStr();
  });

  useEffect(() => {
    // Always strip images — trades table never needs base64 in localStorage
    const slim = trades.map(({ imgBefore, imgAfter, imgResult, ...t }) => t);
    try { localStorage.setItem('profx_trades', JSON.stringify(slim)); } catch {}
  }, [trades]);

  useEffect(() => {
    // Strip weekly chart images before saving
    const slim = Object.fromEntries(
      Object.entries(weeklyPlans).map(([k, v]) => {
        const { imgBefore, imgAfter, ...rest } = v;
        return [k, rest];
      })
    );
    try { localStorage.setItem('profx_weekly', JSON.stringify(slim)); } catch {}
  }, [weeklyPlans]);
  useEffect(() => { try { localStorage.setItem('profx_date', JSON.stringify(date)); } catch {} }, [date]);

  const [lightMode, setLightMode] = useState(() => localStorage.getItem('profx_theme') === 'light');
  useEffect(() => {
    document.documentElement.classList.toggle('light', lightMode);
    try { localStorage.setItem('profx_theme', lightMode ? 'light' : 'dark'); } catch {}
  }, [lightMode]);

  const tabs = [
    { id: 'journal',   label: 'Journal',        icon: <BookOpen    size={15} /> },
    { id: 'weekly',    label: 'Weekly Outlook',  icon: <LayoutGrid  size={15} /> },
    { id: 'history',   label: 'History',         icon: <Calendar    size={15} /> },
    { id: 'analytics', label: 'Analytics',       icon: <BarChart2   size={15} /> },
  ];

  const [sysDiscordStatus, setSysDiscordStatus] = useState('idle');
  const [sysWebhookUrl,   setSysWebhookUrl]   = useState(() => localStorage.getItem('profx-sys-webhook') ?? TRADE_WEBHOOK ?? '');
  const [sysWebhookInput, setSysWebhookInput] = useState('');
  const [showSysSettings, setShowSysSettings] = useState(false);

  const winCount  = trades.filter(t => t.status === 'Win').length;
  const lossCount = trades.filter(t => t.status === 'Loss').length;
  const beCount   = trades.filter(t => t.status === 'Break Even').length;
  const ntCount   = trades.filter(t => t.status === 'No Trade').length;
  const totalPnL  = trades.reduce((s, t) => s + t.pnl, 0);
  const winRate   = trades.length > 0 ? Math.round((winCount / trades.filter(t => t.status !== 'No Trade').length) * 100) : 0;
  const avgRR     = trades.length > 0 ? (trades.reduce((s, t) => s + (t.rr || 0), 0) / trades.length).toFixed(1) : '0.0';
  const GOAL      = 1000;
  const progress  = Math.min((trades.length / GOAL) * 100, 100);

  const sendSystemToDiscord = async () => {
    setSysDiscordStatus('sending');
    const pnlStr  = `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`;
    const pnlColor = totalPnL > 0 ? 0x00c896 : totalPnL < 0 ? 0xff4757 : 0x8888aa;

    // Weekly breakdown
    const { getMondayOf, getWeekLabel } = await import('./data/newsEvents.js');
    const weekMap = {};
    trades.forEach(t => {
      const mon = getMondayOf(t.date);
      if (!weekMap[mon]) weekMap[mon] = [];
      weekMap[mon].push(t);
    });
    const weekLines = Object.entries(weekMap)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([mon, wt], i) => {
        const w = wt.filter(t => t.status !== 'No Trade');
        const wWins = wt.filter(t => t.status === 'Win').length;
        const wLoss = wt.filter(t => t.status === 'Loss').length;
        const wPnl  = wt.reduce((s,t) => s + t.pnl, 0);
        const wp    = `${wPnl >= 0 ? '+' : ''}$${wPnl.toFixed(2)}`;
        const done  = weeklyPlans[mon]?.done ? ' ✅' : '';
        return `W${i+1} · ${getWeekLabel(mon)}${done}\n  ✅${wWins} ❌${wLoss}  ${wp}`;
      }).join('\n\n');

    const payload = {
      username: 'ProFx System',
      embeds: [{
        title: `🏆  ProFx 100-Trade System Report`,
        color: pnlColor,
        fields: [
          {
            name: `📊 Progress  (${trades.length} / ${GOAL} trades)`,
            value: `${'█'.repeat(Math.round(progress / 5))}${'░'.repeat(20 - Math.round(progress / 5))}  **${progress.toFixed(0)}%**`,
            inline: false,
          },
          { name: '✅ Wins',        value: `**${winCount}**`,          inline: true },
          { name: '❌ Losses',      value: `**${lossCount}**`,         inline: true },
          { name: '➖ Break Even',  value: `**${beCount}**`,           inline: true },
          { name: '📈 Win Rate',    value: `**${winRate}%**`,          inline: true },
          { name: '📉 Avg R:R',     value: `**1:${avgRR}**`,          inline: true },
          { name: '💰 Total P&L',   value: `**${pnlStr} USD**`,       inline: true },
          {
            name: `📅 Weekly Breakdown  (${Object.keys(weekMap).length} weeks)`,
            value: weekLines || 'No trades logged.',
            inline: false,
          },
        ],
        footer: { text: `ProFx Backtesting Journal  ·  ${trades.length} trades logged` },
        timestamp: new Date().toISOString(),
      }],
    };

    const url = sysWebhookUrl || import.meta.env.VITE_DISCORD_SYSTEM;
    if (!url) { setSysDiscordStatus('error'); setTimeout(() => setSysDiscordStatus('idle'), 3000); return; }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSysDiscordStatus(res.ok || res.status === 204 ? 'sent' : 'error');
    } catch {
      setSysDiscordStatus('error');
    }
    setTimeout(() => setSysDiscordStatus('idle'), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0f111a]">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">

          {/* A+ Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-[#e63946]/30"
              style={{ background: 'rgba(230,57,70,0.1)' }}>
              <Coffee size={17} className="text-[#e63946]" />
            </div>
            <div>
              <div className="font-black text-xl leading-none text-[#e63946]">A+</div>
              <div className="text-[9px] leading-none mt-0.5" style={{ color: '#555' }}>Confirm your trade setup before entry</div>
            </div>
          </div>

          {/* Nav */}
          <nav className="ml-auto flex items-center gap-1">
            <button onClick={() => setLightMode(v => !v)} className="p-2 rounded-lg text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-all mr-1" title="Toggle light/dark mode">
              {lightMode ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            {tabs.map(t => (
              <button
                key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'text-white bg-[rgba(230,57,70,0.1)] border border-[rgba(230,57,70,0.2)]'
                    : 'text-[#666] border border-transparent hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </nav>

          {/* Compact stats + Discord + Login */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[9px] border border-[#1a1a1a] bg-[#111]">
            <span className="font-mono font-bold text-white">{trades.length}<span className="text-[#333]">/{GOAL}</span></span>
            <span className="w-px h-3 bg-[#222]" />
            <span className={`font-mono font-bold ${totalPnL >= 0 ? 'text-[#00c896]' : 'text-[#ff4757]'}`}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)}
            </span>
            <span className="w-px h-3 bg-[#222]" />
            <span style={{ color: '#555' }}>{winRate}% WR</span>
            <span className="w-px h-3 bg-[#222]" />
            <div className="relative flex items-center gap-0.5">
              <button
                onClick={sendSystemToDiscord}
                disabled={sysDiscordStatus === 'sending'}
                title="Send system report to Discord"
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold transition-all text-[#5865F2] ${
                  sysDiscordStatus === 'sent'    ? '!text-[#00c896]' :
                  sysDiscordStatus === 'error'   ? '!text-[#ff4757]' :
                  sysDiscordStatus === 'sending' ? 'opacity-60' :
                  'hover:bg-[rgba(88,101,242,0.15)]'
                }`}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028z"/>
                </svg>
                {sysDiscordStatus === 'sent' ? '✓' : sysDiscordStatus === 'error' ? '✗' : sysDiscordStatus === 'sending' ? '…' : 'Report'}
              </button>
              <button onClick={() => { setSysWebhookInput(sysWebhookUrl); setShowSysSettings(v => !v); }}
                className="p-0.5 rounded text-[#5865F2] hover:bg-[rgba(88,101,242,0.15)] transition-all text-[10px]" title="Discord settings">⚙</button>

              {showSysSettings && (
                <div className="absolute right-0 top-full mt-2 w-72 p-3 rounded-xl z-50 space-y-2"
                  style={{ background: '#0d0d0d', border: '1px solid rgba(88,101,242,0.3)', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: '#555' }}>System Report Webhook</div>
                  <input type="text" value={sysWebhookInput} onChange={e => setSysWebhookInput(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full bg-[#111] border border-[#1a1a1a] text-white font-mono text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#5865F2] placeholder-[#333]" />
                  <div className="flex gap-2">
                    <button onClick={() => { localStorage.removeItem('profx-sys-webhook'); setSysWebhookUrl(''); setSysWebhookInput(''); setShowSysSettings(false); }}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold text-[#555] hover:text-white border border-[#1a1a1a] transition-colors">Clear</button>
                    <button onClick={() => { const u = sysWebhookInput.trim(); localStorage.setItem('profx-sys-webhook', u); setSysWebhookUrl(u); setShowSysSettings(false); }}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white transition-colors" style={{ background: '#5865F2' }}>Save</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Login button */}
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
            style={{ background: '#e63946' }}>
            <LogIn size={14} />
            Login
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'journal'   && <JournalModule setTrades={setTrades} date={date} setDate={setDate} />}
        {tab === 'weekly'    && <WeeklyModule weeklyPlans={weeklyPlans} setWeeklyPlans={setWeeklyPlans} backtestDate={date} trades={trades} />}

        {tab === 'history'   && <HistoryModule trades={trades} setTrades={setTrades} />}
        {tab === 'analytics' && <AnalyticsModule trades={trades} backtestDate={date} />}
      </main>

    </div>
  );
}
