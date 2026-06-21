import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  TrendingUp, BookOpen, BarChart2, Plus, Trash2,
  Target, DollarSign, Activity, Award, Calendar,
  ChevronDown, CheckSquare, RefreshCw, AlertTriangle,
  X, Check, Newspaper, Lock, Upload, Video
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import WeeklyModule from './WeeklyModule.jsx';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_BIAS_RULES = [
  { id: 'b1', text: 'Daily orderflow DOLx', checked: false },
  { id: 'b2', text: 'HTF premium / discount zone', checked: false },
  { id: 'b3', text: 'Weekly bias confirmed', checked: false },
  { id: 'b4', text: '4H market structure aligned', checked: false },
  { id: 'b5', text: 'Dealing range identified', checked: false },
  { id: 'b6', text: 'Asia high / low mapped', checked: false },
];

const DEFAULT_ENTRY_RULES = [
  { id: 'e1', text: '15M orderflow + POI', checked: false },
  { id: 'e2', text: 'Order block identified', checked: false },
  { id: 'e3', text: 'Fair value gap present', checked: false },
  { id: 'e4', text: 'Liquidity sweep confirmed', checked: false },
  { id: 'e5', text: 'M5 confirmation entry', checked: false },
  { id: 'e6', text: 'SL placed beyond structure', checked: false },
];

const DEFAULT_PAIRS = ['EUR/USD', 'GBP/USD', 'GBP/JPY'];
const TRADE_WEBHOOK = import.meta.env.VITE_DISCORD_TRADE;
const SESSIONS = ['London', 'New York'];
const BIASES = ['Bullish', 'Bearish'];
const PSYCH_TAGS = ['Calm', 'Confident', 'Focused', 'FOMO', 'Fear', 'Greed', 'Anxious', 'Impatient'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const calcLotSize = (risk, sl) => {
  if (!risk || !sl || +sl === 0) return '0.00';
  return (+risk / (+sl * 10)).toFixed(2);
};

const calcGrade = (pct) => {
  if (pct >= 80) return { label: 'A+', color: '#00c896', ring: 'rgba(0,200,150,0.4)', bg: 'rgba(0,200,150,0.08)' };
  if (pct >= 60) return { label: 'B',  color: '#f5a623', ring: 'rgba(245,166,35,0.4)', bg: 'rgba(245,166,35,0.08)' };
  return              { label: 'C',  color: '#ff4757', ring: 'rgba(255,71,87,0.4)',  bg: 'rgba(255,71,87,0.08)'  };
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

// ─── Rule helpers (module-level so RuleList is a stable component reference) ──

const toggleRule = (setter, id) =>
  setter(prev => prev.map(r => r.id === id ? { ...r, checked: !r.checked } : r));

const addRule = (setter, text, clearFn) => {
  if (!text.trim()) return;
  setter(prev => [...prev, { id: `custom-${Date.now()}`, text: text.trim(), checked: false }]);
  clearFn('');
};

const removeRule = (setter, id) => setter(prev => prev.filter(r => r.id !== id));

const RuleList = ({ rules, setter, newVal, setNew, label }) => (
  <Card>
    <div className="flex items-center justify-between mb-3">
      <Label>{label}</Label>
      <span className="text-[10px] text-[#5a5d7a] font-mono">
        {rules.filter(r => r.checked).length}/{rules.length}
      </span>
    </div>
    <div className="flex flex-col gap-1.5 mb-3">
      {rules.map(rule => (
        <div key={rule.id} className="flex items-center gap-2 group">
          <button
            onClick={() => toggleRule(setter, rule.id)}
            className={`flex items-center gap-2.5 flex-1 p-2.5 rounded-lg text-sm text-left transition-all ${
              rule.checked
                ? 'bg-[rgba(0,200,150,0.08)] border border-[rgba(0,200,150,0.25)] text-[#00c896]'
                : 'bg-[#0f111a] border border-[#2a2d3e] text-[#8888aa] hover:border-[#4a4d5e]'
            }`}
          >
            <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
              rule.checked ? 'bg-[#00c896] border-[#00c896]' : 'border-[#3a3d4e]'
            }`}>
              {rule.checked && <Check size={10} className="text-black" strokeWidth={3} />}
            </span>
            {rule.text}
          </button>
          <button
            onClick={() => removeRule(setter, rule.id)}
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded text-[#ff4757] hover:bg-[rgba(255,71,87,0.1)] transition-all"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="Add rule..."
        value={newVal}
        onChange={e => setNew(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && addRule(setter, newVal, setNew)}
        className="flex-1 bg-[#0f111a] border border-[#2a2d3e] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#4a4d5e] focus:outline-none focus:border-[#4a90d9]"
      />
      <button
        onClick={() => addRule(setter, newVal, setNew)}
        className="px-3 rounded-lg bg-[#2a2d3e] hover:bg-[#3a3d4e] text-[#8888aa] hover:text-white transition-all"
      >
        <Plus size={14} />
      </button>
    </div>
  </Card>
);

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
          className="relative w-full h-24 rounded-lg border-2 border-dashed border-[#2a2d3e] flex flex-col items-center justify-center gap-1 hover:border-[#4a90d9] hover:bg-[rgba(74,144,217,0.04)] transition-all focus:outline-none focus:border-[#4a90d9] outline-none"
        >
          {/* Click zone: focuses for paste */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => zoneRef.current?.focus()} />
          {/* Upload icon */}
          <button
            onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
            className="relative z-10 p-1.5 rounded-lg bg-[#1e2038] text-[#4a90d9] hover:bg-[#2a2d3e] transition-all"
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
        <Video size={12} className="text-[#4a90d9]" />
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
          className="w-full py-5 rounded-xl border-2 border-dashed border-[#2a2d3e] flex flex-col items-center justify-center gap-2 hover:border-[#4a90d9] hover:bg-[rgba(74,144,217,0.04)] transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-[#1e2038] flex items-center justify-center">
            <Video size={18} className="text-[#4a90d9]" />
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
  const [lockedYears, setLockedYears] = useState(() => load('profx_locked_years', []));
  useEffect(() => { localStorage.setItem('profx_locked_years', JSON.stringify(lockedYears)); }, [lockedYears]);
  const [bias,        setBias]        = useState(null);
  const [session,     setSession]     = useState(null);
  const [pair,        setPair]        = useState('EUR/USD');
  const [pairInput,   setPairInput]   = useState('');
  const [savedPairs,  setSavedPairs]  = useState(() => load('profx_saved_pairs', DEFAULT_PAIRS));
  useEffect(() => { localStorage.setItem('profx_saved_pairs', JSON.stringify(savedPairs)); }, [savedPairs]);
  const [biasRules,   setBiasRules]   = useState(() => load('profx_bias_rules',  DEFAULT_BIAS_RULES.map(r => ({ ...r }))));
  const [entryRules,  setEntryRules]  = useState(() => load('profx_entry_rules', DEFAULT_ENTRY_RULES.map(r => ({ ...r }))));
  useEffect(() => { localStorage.setItem('profx_bias_rules',   JSON.stringify(biasRules));    }, [biasRules]);
  useEffect(() => { localStorage.setItem('profx_entry_rules',  JSON.stringify(entryRules));   }, [entryRules]);
  const [newBiasRule, setNewBiasRule] = useState('');
  const [newEntRule,  setNewEntRule]  = useState('');
  const [psych,       setPsych]       = useState([]);
  const [riskAmt,     setRiskAmt]     = useState('');
  const [sl,          setSl]          = useState('');
  const [rr,          setRr]          = useState('');
  const [outcome,     setOutcome]     = useState(null);
  const [imgBefore,   setImgBefore]   = useState(null);
  const [imgAfter,    setImgAfter]    = useState(null);
  const [imgResult,   setImgResult]   = useState(null);
  const [videoUrl,    setVideoUrl]    = useState(null);

  const totalRules   = biasRules.length + entryRules.length;
  const checkedCount = biasRules.filter(r => r.checked).length + entryRules.filter(r => r.checked).length;
  const pct          = totalRules > 0 ? Math.round((checkedCount / totalRules) * 100) : 0;
  const grade        = calcGrade(pct);
  const lotSize      = calcLotSize(riskAmt, sl);
  const previewPnL   = outcome && rr && riskAmt ? calcPnL(outcome, riskAmt, rr) : null;


  const togglePsych = (tag) =>
    setPsych(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const resetForm = () => {
    setBias(null); setSession(null); setPair('EUR/USD'); setPairInput('');
    setBiasRules(prev => prev.map(r => ({ ...r, checked: false })));
    setEntryRules(prev => prev.map(r => ({ ...r, checked: false })));
    setPsych([]); setRiskAmt(''); setSl(''); setRr(''); setOutcome(null);
    setImgBefore(null); setImgAfter(null); setImgResult(null); setVideoUrl(null);
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

    fetch(TRADE_WEBHOOK, { method: 'POST', body: formData }).catch(() => {});
  };

  const handleLog = () => {
    if (!bias || !session || !outcome || !rr) {
      alert('Please complete: Bias, Session, R:R, and Outcome before logging.');
      return;
    }
    const pnl = calcPnL(outcome, +riskAmt || 0, +rr);
    const trade = {
      id: Date.now(),
      date, pair, bias,
      direction: bias === 'Bullish' ? 'Buy' : 'Sell',
      session, psychology: [...psych],
      riskAmt: +riskAmt || 0, sl: +sl || 0, lotSize: +lotSize,
      rr: +rr, status: outcome, pnl,
      biasChecked: biasRules.filter(r => r.checked).length,
      biasTotal:   biasRules.length,
      entChecked:  entryRules.filter(r => r.checked).length,
      entTotal:    entryRules.length,
      totalChecked: checkedCount, totalRules, pct, grade: grade.label,
      imgBefore, imgAfter, imgResult,
    };
    setTrades(prev => [...prev, trade]);
    postTradeToDiscord(trade);
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
      imgBefore, imgAfter, imgResult,
    };
    setTrades(prev => [...prev, trade]);
    postTradeToDiscord(trade);
    resetForm();
  };

  const handleSkipDay = () => resetForm();


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

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
            <div className="flex gap-1.5 mb-2">
              {[2022, 2023, 2024, 2025, 2026].map(yr => {
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
                            ? 'bg-gradient-to-b from-[#4a90d9] to-[#3a7ac9] text-white shadow shadow-[rgba(74,144,217,0.4)]'
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
            </div>
            <input
              type="date" value={date}
              onChange={e => {
                const yr = parseInt(e.target.value.slice(0, 4));
                if (!lockedYears.includes(yr)) setDate(e.target.value);
              }}
              className="w-full bg-[#0f111a] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4a90d9]"
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
                  key={s} onClick={() => setSession(s)}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    session === s
                      ? 'bg-[#4a90d9] text-white shadow-lg shadow-[rgba(74,144,217,0.3)]'
                      : 'bg-[#0f111a] border border-[#2a2d3e] text-[#8888aa] hover:border-[#4a4d5e]'
                  }`}
                >
                  {s === 'London' ? '🇬🇧 ' : '🇺🇸 '}{s}
                </button>
              ))}
            </div>
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
                        ? 'bg-[#4a90d9] text-white'
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
                className="flex-1 bg-[#0f111a] border border-[#2a2d3e] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#4a90d9] placeholder-[#3a3d4e]"
              />
              <button
                onClick={() => {
                  const v = pairInput.trim().toUpperCase();
                  if (!v) return;
                  if (!savedPairs.includes(v)) setSavedPairs(prev => [...prev, v]);
                  setPair(v); setPairInput('');
                }}
                className="px-3 py-2 rounded-lg bg-[#0f111a] border border-[#2a2d3e] text-[#4a90d9] text-xs font-bold hover:border-[#4a90d9] transition-all"
                title="Save to list"
              >+ Save</button>
            </div>
          </div>
        </Card>

        <RuleList
          rules={biasRules} setter={setBiasRules}
          newVal={newBiasRule} setNew={setNewBiasRule}
          label="Rules — Bias"
        />
        <RuleList
          rules={entryRules} setter={setEntryRules}
          newVal={newEntRule} setNew={setNewEntRule}
          label="Rules — Entry"
        />
      </div>

      {/* ── Right Column ── */}
      <div className="flex flex-col gap-4">

        {/* Psychology */}
        <Card>
          <Label>Psychology State</Label>
          <div className="flex flex-wrap gap-2">
            {PSYCH_TAGS.map(tag => (
              <button
                key={tag} onClick={() => togglePsych(tag)}
                className={`py-1.5 px-3.5 rounded-full text-xs font-semibold transition-all ${
                  psych.includes(tag)
                    ? 'bg-[#4a90d9] text-white shadow shadow-[rgba(74,144,217,0.4)]'
                    : 'bg-[#0f111a] border border-[#2a2d3e] text-[#8888aa] hover:border-[#4a4d5e]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          {psych.length > 0 && (
            <div className="mt-2 text-[10px] text-[#5a5d7a]">
              Tagged: {psych.join(' · ')}
            </div>
          )}
        </Card>

        {/* Position Calculator */}
        <Card>
          <Label>Position Calculator</Label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="text-[10px] text-[#5a5d7a] mb-1">Risk Amount ($)</div>
              <input
                type="number" placeholder="100" value={riskAmt}
                onChange={e => setRiskAmt(e.target.value)}
                className="w-full bg-[#0f111a] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4a90d9]"
              />
            </div>
            <div>
              <div className="text-[10px] text-[#5a5d7a] mb-1">Stop Loss (Pips)</div>
              <input
                type="number" placeholder="20" value={sl}
                onChange={e => setSl(e.target.value)}
                className="w-full bg-[#0f111a] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4a90d9]"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0f111a] border border-[#2a2d3e]">
            <div>
              <div className="text-[10px] text-[#5a5d7a] uppercase tracking-wider">Estimated Lot Size</div>
              <div className="text-[10px] text-[#3a3d4e] mt-0.5">Risk ÷ (SL × $10/pip)</div>
            </div>
            <span className="text-3xl font-bold font-mono" style={{ color: '#00c896' }}>{lotSize}</span>
          </div>
        </Card>

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
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { g: 'A+', thr: '≥ 80%', c: '#00c896', bc: 'rgba(0,200,150,0.2)' },
              { g: 'B',  thr: '≥ 60%', c: '#f5a623', bc: 'rgba(245,166,35,0.2)' },
              { g: 'C',  thr: '< 60%', c: '#ff4757', bc: 'rgba(255,71,87,0.2)' },
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
          <div className="mb-4">
            <div className="text-[10px] text-[#5a5d7a] mb-2">Chart Screenshots</div>
            <div className="grid grid-cols-3 gap-2">
              <ImageSlot label="Before" value={imgBefore} onChange={setImgBefore} />
              <ImageSlot label="After"  value={imgAfter}  onChange={setImgAfter}  />
              <ImageSlot label="Result" value={imgResult} onChange={setImgResult} />
            </div>
          </div>

          {/* Replay Video */}
          <div className="mb-4">
            <VideoSlot value={videoUrl} onChange={setVideoUrl} />
          </div>

          {/* R:R */}
          <div className="mb-4">
            <div className="text-[10px] text-[#5a5d7a] mb-1.5">Risk : Reward Achieved</div>
            <div className="flex items-center gap-2">
              <span className="text-[#5a5d7a] text-sm font-mono">1 :</span>
              <input
                type="number" step="0.1" placeholder="2.5" value={rr}
                onChange={e => setRr(e.target.value)}
                className="flex-1 bg-[#0f111a] border border-[#2a2d3e] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#4a90d9]"
              />
            </div>
          </div>

          {/* Outcome buttons */}
          <div className="mb-4">
            <div className="text-[10px] text-[#5a5d7a] mb-2">Outcome</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'Win',         label: '✓ WIN',  active: 'bg-[#00c896] text-black shadow-lg shadow-[rgba(0,200,150,0.35)]' },
                { key: 'Loss',        label: '✗ LOSS', active: 'bg-[#ff4757] text-white shadow-lg shadow-[rgba(255,71,87,0.35)]' },
                { key: 'Break Even',  label: '— BE',   active: 'bg-[#f5a623] text-black shadow-lg shadow-[rgba(245,166,35,0.35)]' },
              ].map(({ key, label, active }) => (
                <button
                  key={key} onClick={() => setOutcome(key)}
                  className={`py-2.5 rounded-lg text-sm font-black tracking-wide transition-all ${
                    outcome === key
                      ? active
                      : 'bg-[#0f111a] border border-[#2a2d3e] text-[#8888aa] hover:border-[#4a4d5e]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* PnL preview */}
          {previewPnL !== null && (
            <div className="mb-4 flex items-center justify-between p-3 rounded-lg bg-[#0f111a] border border-[#2a2d3e]">
              <span className="text-[10px] text-[#5a5d7a] uppercase tracking-wider">Estimated P&L</span>
              <span className={`text-lg font-black font-mono ${previewPnL >= 0 ? 'text-[#00c896]' : 'text-[#ff4757]'}`}>
                {previewPnL >= 0 ? '+' : ''}${previewPnL.toFixed(2)}
              </span>
            </div>
          )}

          {/* 3 action buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleLog}
              className="w-full py-3 rounded-xl font-black text-sm tracking-widest transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #4a90d9, #00c896)', color: 'white' }}
            >
              ✓ TAKE TRADE
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleNoTrade}
                className="py-2.5 rounded-xl font-black text-xs tracking-widest transition-all hover:opacity-90 active:scale-[0.98] bg-[#f5a623] text-black"
              >
                ✗ NO TRADE
              </button>
              <button
                onClick={handleSkipDay}
                className="py-2.5 rounded-xl font-black text-xs tracking-widest transition-all hover:opacity-90 active:scale-[0.98] bg-[#2a2d3e] text-[#8888aa] hover:text-white border border-[#3a3d4e]"
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
  const [deleteId,  setDeleteId]  = useState(null);
  const [deleteAll, setDeleteAll] = useState(false);

  const sorted = useMemo(() => [...trades].reverse(), [trades]);

  const confirmDelete = () => {
    setTrades(prev => prev.filter(t => t.id !== deleteId));
    setDeleteId(null);
  };

  const confirmDeleteAll = () => {
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
            {sorted.map((t, idx) => (
              <tr
                key={t.id}
                className={`border-b border-[#1e2038] hover:bg-[#1e2038] transition-colors ${
                  idx % 2 === 0 ? 'bg-[#161829]' : 'bg-[#13151f]'
                }`}
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
                <td className="px-3 py-3 text-xs text-[#6a6d8a]">{t.session}</td>
                <td className="px-3 py-3 text-xs text-[#6a6d8a] max-w-[120px] truncate">
                  {t.psychology.length > 0 ? t.psychology.join(', ') : '—'}
                </td>
                <td className="px-3 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-3 py-3 font-mono text-xs text-white">1:{t.rr}</td>
                <td className={`px-3 py-3 font-mono text-xs font-bold ${t.pnl >= 0 ? 'text-[#00c896]' : 'text-[#ff4757]'}`}>
                  {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                </td>
                <td className="px-3 py-3 text-xs text-[#6a6d8a] font-mono">{t.totalChecked}/{t.totalRules}</td>
                <td className="px-3 py-3">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    t.grade === 'A+' ? 'bg-[rgba(0,200,150,0.12)] text-[#00c896]'
                    : t.grade === 'B' ? 'bg-[rgba(245,166,35,0.12)] text-[#f5a623]'
                    : 'bg-[rgba(255,71,87,0.12)] text-[#ff4757]'
                  }`}>{t.grade}</span>
                </td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => setDeleteId(t.id)}
                    className="p-1.5 rounded hover:bg-[rgba(255,71,87,0.12)] text-[#3a3d4e] hover:text-[#ff4757] transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
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
    { icon: <Award size={16} />,     label: 'Best Trade',  value: `1 : ${maxRR}`,                  sub: `Avg RR 1:${avgRR}`,                   color: '#4a90d9' },
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
                  <stop offset="5%"  stopColor="#4a90d9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4a90d9" stopOpacity={0} />
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
                type="monotone" dataKey="cumPnl" stroke="#4a90d9" strokeWidth={2.5}
                dot={{ fill: '#4a90d9', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#4a90d9' }}
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
                className={`flex items-center justify-center rounded-md text-[11px] font-semibold aspect-square transition-all ${bg} ${isToday ? 'ring-1 ring-[#4a90d9] ring-offset-1 ring-offset-[#161829]' : ''}`}
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

  useEffect(() => { localStorage.setItem('profx_trades',  JSON.stringify(trades));       }, [trades]);
  useEffect(() => { localStorage.setItem('profx_weekly',  JSON.stringify(weeklyPlans));  }, [weeklyPlans]);
  useEffect(() => { localStorage.setItem('profx_date',    JSON.stringify(date));          }, [date]);

  const tabs = [
    { id: 'journal',   label: 'Journal',   icon: <BookOpen  size={15} /> },
    { id: 'weekly',    label: 'Weekly',    icon: <Newspaper size={15} /> },
    { id: 'history',   label: 'History',   icon: <Activity  size={15} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={15} /> },
  ];

  const [sysDiscordStatus, setSysDiscordStatus] = useState('idle');

  const winCount  = trades.filter(t => t.status === 'Win').length;
  const lossCount = trades.filter(t => t.status === 'Loss').length;
  const beCount   = trades.filter(t => t.status === 'Break Even').length;
  const ntCount   = trades.filter(t => t.status === 'No Trade').length;
  const totalPnL  = trades.reduce((s, t) => s + t.pnl, 0);
  const winRate   = trades.length > 0 ? Math.round((winCount / trades.filter(t => t.status !== 'No Trade').length) * 100) : 0;
  const avgRR     = trades.length > 0 ? (trades.reduce((s, t) => s + (t.rr || 0), 0) / trades.length).toFixed(1) : '0.0';
  const GOAL      = 100;
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

    try {
      const res = await fetch(import.meta.env.VITE_DISCORD_SYSTEM, {
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
      <header className="sticky top-0 z-40 border-b border-[#1e2038] bg-[#13151f]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">

          {/* Logo */}
          <div className="flex items-center gap-3 mr-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4a90d9, #00c896)' }}>
              <TrendingUp size={16} className="text-white" />
            </div>
            <div>
              <div className="text-white font-black text-sm tracking-wider leading-none">ProFx</div>
              <div className="text-[#5a5d7a] text-[9px] tracking-widest uppercase">Backtesting Journal</div>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1">
            {tabs.map(t => (
              <button
                key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  tab === t.id
                    ? 'bg-[#4a90d9] text-white shadow shadow-[rgba(74,144,217,0.4)]'
                    : 'text-[#8888aa] hover:text-white hover:bg-[#1e2038]'
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </nav>

          {/* System Total widget */}
          <div className="ml-auto flex flex-col gap-1 bg-[#161829] border border-[#2a2d3e] rounded-xl px-3 py-2 min-w-[180px]">
            {/* Top row: label + trade count */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#5a5d7a]">System Total</span>
              <span className="text-[9px] font-bold text-[#8888aa]">
                <span className="text-white font-black">{trades.length}</span>
                <span className="text-[#3a3d4e]"> / {GOAL}</span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-[#2a2d3e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#4a90d9,#00c896)' }}
              />
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[9px] text-[#00c896] font-bold">{winRate}% WR</span>
              <span className="w-px h-2.5 bg-[#2a2d3e]" />
              <span className={`text-[9px] font-bold font-mono ${totalPnL >= 0 ? 'text-[#00c896]' : 'text-[#ff4757]'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </span>
              <span className="w-px h-2.5 bg-[#2a2d3e]" />
              {/* Discord send button */}
              <button
                onClick={sendSystemToDiscord}
                disabled={sysDiscordStatus === 'sending'}
                title="Send full system report to Discord"
                className={`ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold transition-all ${
                  sysDiscordStatus === 'sent'    ? 'bg-[rgba(0,200,150,0.15)] text-[#00c896]' :
                  sysDiscordStatus === 'error'   ? 'bg-[rgba(255,71,87,0.15)] text-[#ff4757]' :
                  sysDiscordStatus === 'sending' ? 'text-[#5865F2] opacity-60' :
                  'text-[#5865F2] hover:bg-[rgba(88,101,242,0.15)]'
                }`}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
                </svg>
                {sysDiscordStatus === 'sent' ? '✓ Sent' : sysDiscordStatus === 'error' ? '✗ Fail' : sysDiscordStatus === 'sending' ? '...' : 'Report'}
              </button>
            </div>
          </div>
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
